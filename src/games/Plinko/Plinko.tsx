import React, { useEffect, useRef, useState } from 'react'
import styles from './Plinko.module.scss'
import { PlinkoEngine, SpringEngine } from './GameEngine'
import GameNavigation from '../../components/GameNavigation'

const Plinko: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const springCanvasRef = useRef<HTMLCanvasElement>(null)
    const plinkoEngineRef = useRef<PlinkoEngine | null>(null)
    const springEngineRef = useRef<SpringEngine | null>(null)
    const animationFrameRef = useRef<number>()
    const [currentPrize, setCurrentPrize] = useState<string>('')
    const [showResult, setShowResult] = useState(false)
    const [gameStarted, setGameStarted] = useState(false)
    const isMouseDownRef = useRef(false)

    useEffect(() => {
        if (canvasRef.current && springCanvasRef.current) {
            // 初始化游戏引擎
            plinkoEngineRef.current = new PlinkoEngine(canvasRef.current)
            springEngineRef.current = new SpringEngine(springCanvasRef.current)

            // 初始化引擎
            plinkoEngineRef.current.init()
            springEngineRef.current.init()

            // 设置游戏结束回调
            plinkoEngineRef.current.onGameEnd = prize => {
                setTimeout(() => {
                    setCurrentPrize(prize)
                    setShowResult(true)
                    setGameStarted(false) // 游戏结束时重置状态
                }, 500)
            }
        }

        return () => {
            plinkoEngineRef.current?.cleanup()
            springEngineRef.current?.cleanup()
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current)
            }
        }
    }, [])

    // 处理鼠标按下事件
    const handleMouseDown = () => {
        if (!springEngineRef.current || gameStarted) return // 如果游戏已经开始则不响应
        isMouseDownRef.current = true
        springEngineRef.current.startCompressing()

        // 开始动画循环
        const animate = () => {
            if (springEngineRef.current && isMouseDownRef.current) {
                animationFrameRef.current = requestAnimationFrame(animate)
            }
        }
        animate()
    }

    // 处理鼠标松开事件
    const handleMouseUp = () => {
        if (!isMouseDownRef.current) return
        isMouseDownRef.current = false

        if (!springEngineRef.current || !plinkoEngineRef.current || gameStarted) return

        springEngineRef.current.release()
        const power = springEngineRef.current.getPowerLevel() / 100

        // 启动游戏
        setGameStarted(true)
        plinkoEngineRef.current.startGame(power)

        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current)
        }
    }

    const handleMouseLeave = () => {
        if (isMouseDownRef.current) {
            handleMouseUp()
        }
    }

    // 处理重新开始游戏
    const handlePlayAgain = () => {
        setShowResult(false)
        setCurrentPrize('')
        setGameStarted(false)

        // 在关闭弹窗的同时清理游戏引擎
        if (plinkoEngineRef.current) {
            plinkoEngineRef.current.cleanup()
            plinkoEngineRef.current.init()
        }
    }

    return (
        <div className={styles.plinkoContainer}>
            <GameNavigation title="弹珠台游戏" />
            <div className={styles.gameArea}>
                <div className={styles.canvasContainer}>
                    <canvas ref={canvasRef} className={styles.gameCanvas} />
                    <canvas
                        ref={springCanvasRef}
                        className={styles.springCanvas}
                        onMouseDown={handleMouseDown}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseLeave}
                    />
                </div>
                <div className={styles.instructions}>点击并按住右侧弹簧进行压缩，松开后即可发射小球！</div>
            </div>

            {showResult && (
                <div className={styles.resultsModal}>
                    <div className={styles.modalContent}>
                        <h2>游戏结果</h2>
                        <p>恭喜获得: {currentPrize}</p>
                        <button onClick={handlePlayAgain}>再玩一次</button>
                    </div>
                </div>
            )}
        </div>
    )
}

export default Plinko
