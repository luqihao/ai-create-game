import React from 'react'
import { isValidPosition } from './utils'

const Board: React.FC = () => {
    // 渲染7x7的棋盘
    const renderBoard = () => {
        const cells = []
        const BOARD_SIZE = 7

        for (let y = 0; y < BOARD_SIZE; y++) {
            for (let x = 0; x < BOARD_SIZE; x++) {
                // 确定位置
                const posX = x - 3 // 中心化
                const posZ = y - 3 // 中心化

                // 只渲染有效位置
                if (isValidPosition({ x, y })) {
                    // 使用交替颜色模式，让棋盘格子更容易区分
                    const isEven = (x + y) % 2 === 0
                    const cellColor = isEven ? '#3B2507' : '#5D4037'

                    cells.push(
                        <mesh key={`cell-${x}-${y}`} position={[posX, 0, posZ]} rotation={[-Math.PI / 2, 0, 0]}>
                            <planeGeometry args={[0.95, 0.95]} />
                            <meshStandardMaterial color={cellColor} />
                        </mesh>
                    )
                }
            }
        }

        return cells
    }

    return (
        <>
            {/* 棋盘底座 */}
            <mesh position={[0, -0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[8, 8]} />
                <meshStandardMaterial color="#1E1510" />
            </mesh>

            {/* 棋盘格子 */}
            {renderBoard()}
        </>
    )
}

export default Board
