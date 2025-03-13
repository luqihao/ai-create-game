import React, { useEffect, useRef, useState } from 'react'
import styles from './RedPacketRain.module.scss'
import { GameEngine } from './GameEngine'

const RedPacketRain: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const gameEngineRef = useRef<GameEngine | null>(null)
    const [score, setScore] = useState<number>(0)
    const [timeLeft, setTimeLeft] = useState<number>(60)
    const [gameOver, setGameOver] = useState<boolean>(false)
    const [gameStarted, setGameStarted] = useState<boolean>(false)

    // 初始化游戏引擎
    useEffect(() => {
        if (!canvasRef.current) return

        const gameEngine = new GameEngine(canvasRef.current)
        gameEngineRef.current = gameEngine

        // 设置回调函数
        gameEngine.onScoreChange = newScore => setScore(newScore)
        gameEngine.onTimeChange = newTime => setTimeLeft(newTime)
        gameEngine.onGameOver = () => setGameOver(true)

        // 不再立即开始游戏，而是等待用户点击开始按钮

        // 清理函数
        return () => {
            gameEngine.destroy()
        }
    }, [])

    // 使用useEffect为canvas添加触摸事件监听器，明确指定passive: false
    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        // 触摸开始事件处理函数
        const handleTouchStart = (event: TouchEvent) => {
            if (!gameEngineRef.current || !gameStarted) return

            event.preventDefault() // 现在可以正常工作，因为我们设置了 passive: false

            const rect = canvas.getBoundingClientRect()

            // 处理所有触摸点
            for (let i = 0; i < event.touches.length; i++) {
                const touch = event.touches[i]
                const x = touch.clientX - rect.left
                const y = touch.clientY - rect.top

                gameEngineRef.current.handleClick(x, y)
            }
        }

        // 触摸移动事件处理函数
        const handleTouchMove = (event: TouchEvent) => {
            if (!gameEngineRef.current || !gameStarted) return

            event.preventDefault()

            const rect = canvas.getBoundingClientRect()

            // 处理所有触摸点
            for (let i = 0; i < event.touches.length; i++) {
                const touch = event.touches[i]
                const x = touch.clientX - rect.left
                const y = touch.clientY - rect.top

                gameEngineRef.current.handleClick(x, y)
            }
        }

        // 添加事件监听器，指定 passive: false
        canvas.addEventListener('touchstart', handleTouchStart, { passive: false })
        canvas.addEventListener('touchmove', handleTouchMove, { passive: false })

        // 清理函数
        return () => {
            canvas.removeEventListener('touchstart', handleTouchStart)
            canvas.removeEventListener('touchmove', handleTouchMove)
        }
    }, [gameStarted]) // 依赖于 gameStarted 状态

    // 处理点击事件
    const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
        if (!gameEngineRef.current || !canvasRef.current || !gameStarted) return

        const canvas = canvasRef.current
        const rect = canvas.getBoundingClientRect()

        // 计算点击在canvas中的坐标
        const x = event.clientX - rect.left
        const y = event.clientY - rect.top

        gameEngineRef.current.handleClick(x, y)
    }

    // 开始游戏
    const handleStartGame = () => {
        if (!gameEngineRef.current) return

        setGameStarted(true)
        setGameOver(false)
        gameEngineRef.current.startGame()
    }

    // 重新开始游戏
    const handleRestart = () => {
        if (!gameEngineRef.current) return

        setGameOver(false)
        gameEngineRef.current.startGame()
    }

    return (
        <div className={styles.container}>
            <canvas
                ref={canvasRef}
                className={styles.canvas}
                onClick={handleCanvasClick}
                // 移除内联的触摸事件处理程序，因为我们现在使用useEffect手动添加它们
            />

            {gameStarted && (
                <div className={styles.gameInfo}>
                    <div className={styles.score}>得分: {score}</div>
                    <div className={styles.timer}>时间: {timeLeft}s</div>
                </div>
            )}

            {!gameStarted && !gameOver && (
                <div className={styles.startContainer}>
                    <div className={styles.startBox}>
                        <h2>红包雨</h2>
                        <p>在60秒内尽可能多地点击掉落的红包</p>
                        <p>点击大红包+5分，点击中红包+3分，点击小红包+1分</p>
                        <p>小心炸弹红包，点击将扣除3分!</p>
                        <button onClick={handleStartGame}>开始游戏</button>
                    </div>
                </div>
            )}

            {gameOver && (
                <div className={styles.gameOverContainer}>
                    <div className={styles.gameOverBox}>
                        <h2>游戏结束!</h2>
                        <div className={styles.finalScore}>最终得分: {score}</div>
                        <button onClick={handleRestart}>再来一局</button>
                    </div>
                </div>
            )}
        </div>
    )
}

export default RedPacketRain
