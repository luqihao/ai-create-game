import React, { useEffect, useRef, useState } from 'react'
import GameNavigation from '../../components/GameNavigation'
import './MatchThree.css'
import { GameEngine } from './GameEngine'

interface MatchThreeProps {
    rows?: number
    cols?: number
    timeLimit?: number
}

const MatchThree: React.FC<MatchThreeProps> = ({ rows = 8, cols = 8, timeLimit = 60 }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [score, setScore] = useState<number>(0)
    const [timeLeft, setTimeLeft] = useState<number>(timeLimit)
    const [gameOver, setGameOver] = useState<boolean>(false)
    const [gameStarted, setGameStarted] = useState<boolean>(false)
    const gameEngineRef = useRef<GameEngine | null>(null)

    useEffect(() => {
        if (!canvasRef.current) return

        const canvas = canvasRef.current
        const gameEngine = new GameEngine(canvas, rows, cols)
        gameEngineRef.current = gameEngine

        gameEngine.onScoreChange = newScore => setScore(newScore)
        gameEngine.onGameStart = () => setGameStarted(true)

        gameEngine.initialize()

        return () => {
            gameEngine.destroy()
        }
    }, [rows, cols])

    useEffect(() => {
        if (!gameStarted) return

        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer)
                    setGameOver(true)
                    return 0
                }
                return prev - 1
            })
        }, 1000)

        return () => clearInterval(timer)
    }, [gameStarted])

    const handleRestart = () => {
        if (!gameEngineRef.current) return
        setScore(0)
        setTimeLeft(timeLimit)
        setGameOver(false)
        setGameStarted(false)
        gameEngineRef.current.restart()
    }

    return (
        <>
            <GameNavigation title="消消乐" />
            <div className="match-three-container">
                <div className="game-header">
                    <div className="score">消除数量: {score}</div>
                    <div className="time">时间: {timeLeft}s</div>
                </div>

                <canvas ref={canvasRef} className="game-canvas" width={cols * 60} height={rows * 60} />

                {gameOver && (
                    <div className="game-over-overlay">
                        <div className="game-over-modal">
                            <h2>游戏结束!</h2>
                            <p>总共消除: {score}个</p>
                            <button onClick={handleRestart}>重新开始</button>
                        </div>
                    </div>
                )}
            </div>
        </>
    )
}

export default MatchThree
