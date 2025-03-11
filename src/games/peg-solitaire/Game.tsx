import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import Board from './Board'
import Peg from './Peg'
import JumpingPeg from './JumpingPeg'
import ExplodingPeg from './ExplodingPeg'
import { Peg as PegType, Position, GameStatus, PossibleMove } from './types'
import { createInitialBoard, getPossibleMoves, makeMove, checkGameStatus, getPegAtPosition } from './utils'

// 添加一个新组件用于隐藏提示时处理点击
const InvisibleClickArea: React.FC<{
    position: Position
    onClick: () => void
}> = ({ position, onClick }) => {
    // 计算实际的3D位置，与Peg组件相同
    const x = position.x - 3
    const z = position.y - 3
    const y = 0.4

    return (
        <mesh position={[x, y, z]} onClick={onClick}>
            <sphereGeometry args={[0.4, 16, 16]} />
            <meshBasicMaterial transparent opacity={0} />
        </mesh>
    )
}

const Game: React.FC = () => {
    // 游戏状态
    const [pegs, setPegs] = useState<PegType[]>(createInitialBoard())
    const [selectedPeg, setSelectedPeg] = useState<Position | null>(null)
    const [gameStatus, setGameStatus] = useState<GameStatus>(GameStatus.PLAYING)
    const [showMoveHints, setShowMoveHints] = useState<boolean>(true)

    // 添加动画状态
    const [currentAnimation, setCurrentAnimation] = useState<{
        move: PossibleMove
        pegToHide: PegType
    } | null>(null)
    const [isAnimating, setIsAnimating] = useState<boolean>(false)
    const [jumpCompleted, setJumpCompleted] = useState<boolean>(false)

    // 添加爆炸动画状态
    const [showExplosion, setShowExplosion] = useState<boolean>(false)
    const [explosionPosition, setExplosionPosition] = useState<Position | null>(null)

    // 计算可能的移动
    const possibleMoves = useMemo(() => {
        return getPossibleMoves(pegs)
    }, [pegs])

    // 确定当前选中的棋子可以移动到的位置
    const possibleMovesForSelected = useMemo(() => {
        if (!selectedPeg) return []

        return possibleMoves.filter(move => move.from.x === selectedPeg.x && move.from.y === selectedPeg.y)
    }, [selectedPeg, possibleMoves])

    // 确定位置是否是可能的移动目标
    const isPossibleMoveTarget = useCallback(
        (position: Position) => {
            return possibleMovesForSelected.some(move => move.to.x === position.x && move.to.y === position.y)
        },
        [possibleMovesForSelected]
    )

    // 处理棋子点击
    const handlePegClick = (position: Position) => {
        // 如果正在动画中或游戏结束，忽略点击
        if (isAnimating || gameStatus !== GameStatus.PLAYING) {
            console.log('动画中或游戏结束，忽略点击')
            return
        }

        console.log('处理棋子点击:', position, '当前选中:', selectedPeg)

        const pegAtPosition = getPegAtPosition(pegs, position)

        // 如果点击了有棋子的位置
        if (pegAtPosition) {
            console.log('点击的位置有棋子')

            // 如果点击的是已选中的棋子，则取消选择
            if (selectedPeg && selectedPeg.x === position.x && selectedPeg.y === position.y) {
                console.log('取消选中当前棋子')
                setSelectedPeg(null)
            }
            // 点击了另一个棋子，选中新棋子
            else {
                console.log('选中新棋子')
                // 强制创建一个新的对象引用，确保React检测到状态变化
                setSelectedPeg({ ...position })
            }
        }
        // 如果点击了可移动的目标位置
        else if (selectedPeg && isPossibleMoveTarget(position)) {
            // 找到对应的移动
            const move = possibleMovesForSelected.find(m => m.to.x === position.x && m.to.y === position.y)

            if (move) {
                // 查找被跳过的棋子
                const pegToJumpOver = pegs.find(
                    p => p.position.x === move.over.x && p.position.y === move.over.y && p.active
                )

                if (pegToJumpOver) {
                    // 开始动画
                    setIsAnimating(true)
                    setCurrentAnimation({
                        move,
                        pegToHide: pegToJumpOver
                    })
                }
            }
        }
    }

    // 处理背景点击，用于取消选择
    const handleBackgroundClick = () => {
        if (!isAnimating && selectedPeg) {
            setSelectedPeg(null)
        }
    }

    // 处理跳跃动画完成
    const handleJumpAnimationComplete = () => {
        if (currentAnimation) {
            // 标记跳跃完成，这样棋子会立即显示在目标位置
            setJumpCompleted(true)

            // 设置爆炸效果的位置为被跳过的棋子位置
            setExplosionPosition(currentAnimation.pegToHide.position)
            setShowExplosion(true)
        }
    }

    // 处理爆炸动画完成
    const handleExplosionComplete = () => {
        if (currentAnimation) {
            // 执行移动
            const newPegs = makeMove(pegs, currentAnimation.move)
            setPegs(newPegs)
            setSelectedPeg(null)

            // 检查游戏状态
            const newStatus = checkGameStatus(newPegs)
            setGameStatus(newStatus)

            // 重置动画状态
            setCurrentAnimation(null)
            setIsAnimating(false)
            setShowExplosion(false)
            setExplosionPosition(null)
            setJumpCompleted(false)
        }
    }

    // 重置游戏
    const resetGame = () => {
        setPegs(createInitialBoard())
        setSelectedPeg(null)
        setGameStatus(GameStatus.PLAYING)
        setCurrentAnimation(null)
        setIsAnimating(false)
        setShowExplosion(false)
        setExplosionPosition(null)
        setJumpCompleted(false)
    }

    // 切换移动提示的显示
    const toggleMoveHints = () => {
        if (!isAnimating) {
            setShowMoveHints(!showMoveHints)
        }
    }

    // 当游戏状态变化时显示消息
    useEffect(() => {
        if (gameStatus === GameStatus.WON) {
            setTimeout(() => {
                alert('恭喜！您赢了！')
            }, 300)
        } else if (gameStatus === GameStatus.LOST) {
            setTimeout(() => {
                alert('游戏结束，没有更多可能的移动了。')
            }, 300)
        }
    }, [gameStatus])

    return (
        <div style={{ width: '100vw', height: '100vh' }}>
            <div
                style={{
                    position: 'absolute',
                    top: '10px',
                    left: '10px',
                    zIndex: 10,
                    background: 'rgba(255, 255, 255, 0.85)',
                    padding: '15px',
                    borderRadius: '8px',
                    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)'
                }}
            >
                <h2>孔明棋</h2>
                <p>棋子数量: {pegs.filter(peg => peg.active).length}</p>
                <p>可能的移动: {possibleMoves.length}</p>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                    <button onClick={resetGame} disabled={isAnimating}>
                        重新开始
                    </button>
                    <button
                        onClick={toggleMoveHints}
                        disabled={isAnimating}
                        style={{
                            backgroundColor: showMoveHints ? '#3498db' : '#e74c3c',
                            opacity: isAnimating ? 0.6 : 1
                        }}
                    >
                        {showMoveHints ? '隐藏移动提示' : '显示移动提示'}
                    </button>
                </div>
                <div style={{ marginTop: '10px' }}>
                    <h3>游戏规则:</h3>
                    <p>1. 点击一颗棋子选中它</p>
                    <p>
                        2. 点击可移动的位置{showMoveHints ? '（绿色高亮）' : ''}
                        跳过中间的棋子
                    </p>
                    <p>3. 被跳过的棋子会被移除</p>
                    <p>4. 目标是只留下一颗棋子</p>
                </div>
                {isAnimating && <div style={{ marginTop: '10px', color: '#e74c3c' }}>正在进行跳跃动画...</div>}
            </div>

            <Canvas camera={{ position: [0, 5, 8], fov: 60 }}>
                {/* 增强光照设置，使颜色更加鲜明 */}
                <ambientLight intensity={0.7} />
                <directionalLight position={[10, 10, 5]} intensity={1.2} />
                <directionalLight position={[-10, -10, -5]} intensity={0.3} color="#6666FF" />
                <OrbitControls enableZoom={true} enablePan={false} />

                {/* 添加一个大的透明平面用于捕获背景点击 */}
                <mesh position={[0, -0.5, 0]} rotation={[-Math.PI / 2, 0, 0]} onClick={handleBackgroundClick}>
                    <planeGeometry args={[20, 20]} />
                    <meshBasicMaterial transparent opacity={0} />
                </mesh>

                {/* 渲染棋盘 */}
                <Board />

                {/* 渲染棋子 */}
                {pegs
                    .filter(
                        peg =>
                            peg.active &&
                            // 在动画过程中隐藏起始位置的棋子和正在爆炸的棋子
                            !(
                                currentAnimation &&
                                ((peg.position.x === currentAnimation.move.from.x &&
                                    peg.position.y === currentAnimation.move.from.y) ||
                                    (showExplosion &&
                                        peg.position.x === currentAnimation.pegToHide.position.x &&
                                        peg.position.y === currentAnimation.pegToHide.position.y))
                            )
                    )
                    .map(peg => {
                        // 分离点击处理逻辑，确保每个棋子都有独立的点击处理函数
                        const handleClick = () => {
                            console.log('点击棋子ID:', peg.id, '位置:', peg.position)
                            handlePegClick(peg.position)
                        }

                        return (
                            <Peg
                                key={peg.id}
                                position={peg.position}
                                isSelected={
                                    !isAnimating &&
                                    selectedPeg !== null &&
                                    selectedPeg.x === peg.position.x &&
                                    selectedPeg.y === peg.position.y
                                }
                                isPossibleMove={false}
                                onClick={handleClick}
                            />
                        )
                    })}

                {/* 当跳跃完成时，在目标位置显示棋子 */}
                {currentAnimation && jumpCompleted && (
                    <Peg
                        key="landed-peg"
                        position={currentAnimation.move.to}
                        isSelected={false}
                        isPossibleMove={false}
                        onClick={() => {}}
                    />
                )}

                {/* 显示跳跃动画，只在跳跃阶段显示 */}
                {currentAnimation && !jumpCompleted && (
                    <JumpingPeg
                        move={currentAnimation.move}
                        duration={0.8} // 动画持续时间（秒）
                        onAnimationComplete={handleJumpAnimationComplete}
                    />
                )}

                {/* 显示爆炸动画 */}
                {showExplosion && explosionPosition && (
                    <ExplodingPeg
                        position={explosionPosition}
                        duration={1.0} // 爆炸持续时间
                        particleCount={25} // 粒子数量
                        onAnimationComplete={handleExplosionComplete}
                    />
                )}

                {/* 可移动位置处理 */}
                {!isAnimating &&
                    possibleMovesForSelected.map((move, index) =>
                        showMoveHints ? (
                            // 显示提示时，渲染可见的绿色高亮目标
                            <Peg
                                key={`target-${index}`}
                                position={move.to}
                                isSelected={false}
                                isPossibleMove={true}
                                onClick={() => handlePegClick(move.to)}
                            />
                        ) : (
                            // 隐藏提示时，渲染透明的点击区域
                            <InvisibleClickArea
                                key={`invisible-target-${index}`}
                                position={move.to}
                                onClick={() => handlePegClick(move.to)}
                            />
                        )
                    )}
            </Canvas>
        </div>
    )
}

export default Game
