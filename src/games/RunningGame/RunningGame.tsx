import React, { useEffect, useRef, useState } from 'react'
import styles from './RunningGame.module.scss'
import { GameEngine } from './GameEngine'
import GameNavigation from '../../components/GameNavigation'

const RunningGame: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const gameEngineRef = useRef<GameEngine | null>(null)
    const [score, setScore] = useState<number>(0)
    const [timeLeft, setTimeLeft] = useState<number>(60)
    const [gameOver, setGameOver] = useState<boolean>(false)
    const [gameStarted, setGameStarted] = useState<boolean>(false)

    // 初始化游戏引擎
    useEffect(() => {
        if (!canvasRef.current) return

        // 清理之前的实例
        if (gameEngineRef.current) {
            gameEngineRef.current.destroy()
        }

        const gameEngine = new GameEngine(canvasRef.current)
        gameEngineRef.current = gameEngine

        // 设置回调
        gameEngine.onScoreChange = newScore => setScore(Math.floor(newScore))
        gameEngine.onTimeChange = newTime => setTimeLeft(Math.ceil(newTime))
        gameEngine.onGameOver = () => {
            setGameOver(true)
            setGameStarted(false)
        }

        return () => {
            if (gameEngineRef.current) {
                gameEngineRef.current.destroy()
            }
        }
    }, [])

    // 控制事件监听
    useEffect(() => {
        if (!gameStarted || !canvasRef.current || !gameEngineRef.current) return

        const handleKeyDown = (event: KeyboardEvent) => {
            if (!gameEngineRef.current || !gameStarted) return

            switch (event.key) {
                case 'ArrowLeft':
                    event.preventDefault()
                    gameEngineRef.current.moveLeft()
                    break
                case 'ArrowRight':
                    event.preventDefault()
                    gameEngineRef.current.moveRight()
                    break
                case 'ArrowUp':
                case ' ':
                    event.preventDefault()
                    gameEngineRef.current.jump()
                    break
            }
        }

        const handleTouchStart = (event: TouchEvent) => {
            if (!gameEngineRef.current || !gameStarted || !canvasRef.current) return
            event.preventDefault()

            const touch = event.touches[0]
            const canvas = canvasRef.current
            const rect = canvas.getBoundingClientRect()
            const x = touch.clientX - rect.left
            const centerX = canvas.width / 2
            const centerZone = canvas.width / 3

            if (x > centerX - centerZone / 2 && x < centerX + centerZone / 2) {
                gameEngineRef.current.jump()
            } else if (x < centerX - centerZone / 2) {
                gameEngineRef.current.moveLeft()
            } else {
                gameEngineRef.current.moveRight()
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        canvasRef.current.addEventListener('touchstart', handleTouchStart, { passive: false })

        return () => {
            window.removeEventListener('keydown', handleKeyDown)
            if (canvasRef.current) {
                canvasRef.current.removeEventListener('touchstart', handleTouchStart)
            }
        }
    }, [gameStarted])

    const handleStartGame = () => {
        if (!gameEngineRef.current) return
        setGameStarted(true)
        setGameOver(false)
        setScore(0)
        setTimeLeft(60)
        setTimeout(() => {
            // 确保状态更新后再开始游戏
            if (gameEngineRef.current) {
                gameEngineRef.current.startGame()
            }
        }, 0)
    }

    return (
        <div className={styles.container}>
            <GameNavigation title="跑步游戏" />
            <canvas ref={canvasRef} className={styles.gameCanvas} />

            {!gameStarted && !gameOver && (
                <div className={styles.startScreen}>
                    <h2>跑步障碍游戏</h2>
                    <p>在三条跑道上奔跑，躲避前方的障碍物</p>
                    <p>使用左右箭头键移动，上箭头或空格键跳跃</p>
                    <p>触屏设备可以点击屏幕左右区域移动，中间区域跳跃</p>
                    <p>随着时间推移，障碍物会逐渐加快</p>
                    <p>成功跨越每个障碍物可得10分</p>
                    <button onClick={handleStartGame}>开始游戏</button>
                </div>
            )}

            {gameStarted && (
                <div className={styles.gameInfo}>
                    <div className={styles.score}>得分: {score}</div>
                    <div className={styles.timer}>时间: {timeLeft}s</div>
                </div>
            )}

            {gameOver && (
                <div className={styles.gameOverScreen}>
                    <h2>游戏结束</h2>
                    <div className={styles.finalScore}>{score} 分</div>
                    <p>
                        你在 {60 - timeLeft} 秒内跨越了 {Math.floor(score / 10)} 个障碍
                    </p>
                    <button onClick={handleStartGame}>再玩一次</button>
                </div>
            )}
        </div>
    )
}

export default RunningGame
