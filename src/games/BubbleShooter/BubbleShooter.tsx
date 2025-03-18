import React, { useEffect, useRef, useState } from 'react'
import { GameEngine } from './GameEngine'
import GameNavigation from '../../components/GameNavigation'
import styles from './BubbleShooter.module.scss'

const BubbleShooter: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const gameEngineRef = useRef<GameEngine | null>(null)
    const [score, setScore] = useState(0)
    const [timeLeft, setTimeLeft] = useState(60)
    const [gameStarted, setGameStarted] = useState(false)
    const [gameOver, setGameOver] = useState(false)

    useEffect(() => {
        if (!canvasRef.current) return

        const gameEngine = new GameEngine(canvasRef.current)
        gameEngineRef.current = gameEngine

        gameEngine.onScoreChange = newScore => setScore(newScore)
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

    useEffect(() => {
        if (!gameStarted || !canvasRef.current || !gameEngineRef.current) return

        const handleMouseMove = (event: MouseEvent) => {
            const canvas = canvasRef.current
            if (!canvas || !gameEngineRef.current) return

            const rect = canvas.getBoundingClientRect()
            const x = event.clientX - rect.left
            const y = event.clientY - rect.top
            gameEngineRef.current.setShootingAngle(x, y)
        }

        const handleClick = (event: MouseEvent) => {
            if (!gameEngineRef.current) return
            gameEngineRef.current.shoot()
        }

        canvasRef.current.addEventListener('mousemove', handleMouseMove)
        canvasRef.current.addEventListener('click', handleClick)

        return () => {
            if (canvasRef.current) {
                canvasRef.current.removeEventListener('mousemove', handleMouseMove)
                canvasRef.current.removeEventListener('click', handleClick)
            }
        }
    }, [gameStarted])

    const handleStartGame = () => {
        if (!gameEngineRef.current) return
        setGameOver(false)
        setGameStarted(true)
        gameEngineRef.current.startGame()
    }

    return (
        <div className={styles.bubbleShooterContainer}>
            <GameNavigation title="泡泡龙" />
            <div className={styles.gameArea}>
                <canvas ref={canvasRef} className={styles.gameCanvas} />
                <div className={styles.gameInfo}>
                    <div className={styles.score}>得分: {score}</div>
                    <div className={styles.timer}>剩余时间: {timeLeft}秒</div>
                </div>
                {!gameStarted && (
                    <div className={styles.overlay}>
                        <div className={styles.menu}>
                            {gameOver ? (
                                <>
                                    <h2>游戏结束!</h2>
                                    <p>最终得分: {score}</p>
                                </>
                            ) : (
                                <h2>泡泡龙</h2>
                            )}
                            <button className={styles.startButton} onClick={handleStartGame}>
                                {gameOver ? '再玩一次' : '开始游戏'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
            <div className={styles.instructions}>
                移动鼠标瞄准，点击发射泡泡。匹配三个或更多相同颜色的泡泡使其消除。
                消除所有泡泡获胜，或在60秒内获得最高分！
            </div>
        </div>
    )
}

export default BubbleShooter
