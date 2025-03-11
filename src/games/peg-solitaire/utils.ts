import { Position, Peg, PossibleMove, GameStatus } from './types'

// 初始棋盘布局（7x7）
const BOARD_SIZE = 7
const INITIAL_CENTER = { x: 3, y: 3 }

// 创建初始棋盘状态
export const createInitialBoard = (): Peg[] => {
    const pegs: Peg[] = []
    let id = 0

    for (let y = 0; y < BOARD_SIZE; y++) {
        for (let x = 0; x < BOARD_SIZE; x++) {
            // 只在有效的位置上放置棋子（经典十字形布局）
            if (isValidPosition({ x, y })) {
                // 中心位置为空
                const isCenter = x === INITIAL_CENTER.x && y === INITIAL_CENTER.y
                pegs.push({
                    id: id++,
                    position: { x, y },
                    active: !isCenter
                })
            }
        }
    }

    return pegs
}

// 检查位置是否有效（十字形布局）
export const isValidPosition = (position: Position): boolean => {
    const { x, y } = position

    // 中心十字区域
    if ((x >= 2 && x <= 4) || (y >= 2 && y <= 4)) {
        return true
    }

    return false
}

// 获取指定位置的棋子
export const getPegAtPosition = (pegs: Peg[], position: Position): Peg | undefined => {
    return pegs.find(peg => peg.position.x === position.x && peg.position.y === position.y && peg.active)
}

// 获取所有可能的移动
export const getPossibleMoves = (pegs: Peg[]): PossibleMove[] => {
    const possibleMoves: PossibleMove[] = []

    // 对于每个活跃棋子
    pegs.filter(peg => peg.active).forEach(peg => {
        const { x, y } = peg.position

        // 检查四个方向的可能移动
        const directions = [
            { dx: 0, dy: -2 }, // 上
            { dx: 2, dy: 0 }, // 右
            { dx: 0, dy: 2 }, // 下
            { dx: -2, dy: 0 } // 左
        ]

        for (const dir of directions) {
            const toPosition = { x: x + dir.dx, y: y + dir.dy }

            // 增强边界检查：确保目标位置在棋盘范围内并且是有效位置
            if (
                toPosition.x >= 0 &&
                toPosition.x < BOARD_SIZE &&
                toPosition.y >= 0 &&
                toPosition.y < BOARD_SIZE &&
                isValidPosition(toPosition) &&
                !getPegAtPosition(pegs, toPosition)
            ) {
                const overPosition = {
                    x: x + dir.dx / 2,
                    y: y + dir.dy / 2
                }

                // 检查中间位置是否有棋子（可以跳过）
                const overPeg = getPegAtPosition(pegs, overPosition)
                if (overPeg) {
                    possibleMoves.push({
                        from: peg.position,
                        over: overPosition,
                        to: toPosition
                    })
                }
            }
        }
    })

    return possibleMoves
}

// 执行一步移动
export const makeMove = (pegs: Peg[], move: PossibleMove): Peg[] => {
    return pegs.map(peg => {
        // 移动起始点的棋子
        if (peg.position.x === move.from.x && peg.position.y === move.from.y) {
            return { ...peg, active: false }
        }
        // 跳过的棋子
        else if (peg.position.x === move.over.x && peg.position.y === move.over.y) {
            return { ...peg, active: false }
        }
        // 移动终点的棋子（原来是无效的，现在变为有效）
        else if (peg.position.x === move.to.x && peg.position.y === move.to.y) {
            return { ...peg, active: true }
        }
        return peg
    })
}

// 检查游戏状态
export const checkGameStatus = (pegs: Peg[]): GameStatus => {
    const activePegs = pegs.filter(peg => peg.active)

    // 如果只剩下一颗棋子，游戏胜利
    if (activePegs.length === 1) {
        return GameStatus.WON
    }

    // 如果还有可能的移动，游戏继续
    if (getPossibleMoves(pegs).length > 0) {
        return GameStatus.PLAYING
    }

    // 如果没有可能的移动，且棋子数量大于1，游戏失败
    return GameStatus.LOST
}
