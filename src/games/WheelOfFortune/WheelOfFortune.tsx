import React, { useEffect, useRef, useState } from 'react'
import styles from './WheelOfFortune.module.scss'
import { WheelOfFortuneEngine } from './GameEngine'
import { Prize } from './types'

const defaultPrizes: Prize[] = [
    { id: 1, name: '一等奖', probability: 5, color: '#FF6B6B' },
    { id: 2, name: '二等奖', probability: 10, color: '#4ECDC4' },
    { id: 3, name: '三等奖', probability: 15, color: '#45B7D1' },
    { id: 4, name: '四等奖', probability: 20, color: '#96CEB4' },
    { id: 5, name: '五等奖', probability: 20, color: '#FFEEAD' },
    { id: 6, name: '六等奖', probability: 10, color: '#D4A5A5' },
    { id: 7, name: '七等奖', probability: 10, color: '#9FA8DA' },
    { id: 8, name: '谢谢参与', probability: 10, color: '#A5D6A7' }
]

const WheelOfFortune: React.FC = () => {
    const [selectedPrize, setSelectedPrize] = useState<number | undefined>()
    const [gameEngine, setGameEngine] = useState<WheelOfFortuneEngine>()
    const [rotation, setRotation] = useState(0)
    const [showModal, setShowModal] = useState(false)
    const [winningPrize, setWinningPrize] = useState<Prize | null>(null)
    const animationFrameRef = useRef<number>()
    const lastUpdateTimeRef = useRef<number>(0)

    useEffect(() => {
        const config = {
            prizes: defaultPrizes,
            size: 400,
            duration: 5000
        }
        const engine = new WheelOfFortuneEngine(config)
        engine.setOnComplete(prizeId => {
            const prize = defaultPrizes.find(p => p.id === prizeId)
            if (prize) {
                setWinningPrize(prize)
                setShowModal(true)
            }
        })
        setGameEngine(engine)

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current)
            }
        }
    }, [])

    const updateWheel = () => {
        if (!gameEngine) return

        const currentTime = Date.now()
        const deltaTime = lastUpdateTimeRef.current ? currentTime - lastUpdateTimeRef.current : 16
        lastUpdateTimeRef.current = currentTime

        if (gameEngine.isActive()) {
            const newRotation = gameEngine.update(deltaTime)
            setRotation(newRotation)
            animationFrameRef.current = requestAnimationFrame(updateWheel)
        }
    }

    const handleSpin = () => {
        if (!gameEngine || gameEngine.isActive()) return
        setShowModal(false)
        setWinningPrize(null)
        gameEngine.startSpin(selectedPrize)
        lastUpdateTimeRef.current = Date.now()
        animationFrameRef.current = requestAnimationFrame(updateWheel)
    }

    const createWheelPath = (index: number, total: number, radius: number) => {
        const anglePerPrize = (Math.PI * 2) / total
        const startAngle = anglePerPrize * index
        const endAngle = startAngle + anglePerPrize

        const x1 = radius + radius * Math.cos(startAngle)
        const y1 = radius + radius * Math.sin(startAngle)
        const x2 = radius + radius * Math.cos(endAngle)
        const y2 = radius + radius * Math.sin(endAngle)

        return `M ${radius} ${radius} L ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2} Z`
    }

    const renderWheel = () => {
        const size = 400
        const radius = size / 2
        const textRadius = radius * 0.7

        return (
            <svg
                width={size}
                height={size}
                viewBox={`0 0 ${size} ${size}`}
                style={{
                    transform: `rotate(${rotation}deg)`
                }}
            >
                {defaultPrizes.map((prize, index) => {
                    const anglePerPrize = 360 / defaultPrizes.length
                    const angle = anglePerPrize * index + anglePerPrize / 2
                    const radian = (angle * Math.PI) / 180
                    const x = radius + textRadius * Math.cos(radian)
                    const y = radius + textRadius * Math.sin(radian)

                    return (
                        <g key={prize.id}>
                            <path
                                d={createWheelPath(index, defaultPrizes.length, radius)}
                                fill={prize.color}
                                stroke="#fff"
                                strokeWidth="1"
                            />
                            <text
                                x={x}
                                y={y}
                                fill="white"
                                fontSize="14"
                                fontWeight="bold"
                                textAnchor="middle"
                                transform={`rotate(${90 + angle}, ${x}, ${y})`}
                                style={{
                                    textShadow: '1px 1px 2px rgba(0,0,0,0.5)'
                                }}
                            >
                                {prize.name}
                            </text>
                        </g>
                    )
                })}
            </svg>
        )
    }

    return (
        <div className={styles.container}>
            <div className={styles.wheel}>
                {renderWheel()}
                <div className={styles.pointer} />
            </div>
            <div className={styles.controls}>
                <select
                    className={styles.select}
                    value={selectedPrize || ''}
                    onChange={e => setSelectedPrize(Number(e.target.value) || undefined)}
                >
                    <option value="">随机抽奖</option>
                    {defaultPrizes.map(prize => (
                        <option key={prize.id} value={prize.id}>
                            {prize.name}
                        </option>
                    ))}
                </select>
                <button className={styles.button} onClick={handleSpin} disabled={!gameEngine || gameEngine.isActive()}>
                    开始抽奖
                </button>
            </div>

            {showModal && winningPrize && (
                <div className={styles.modal}>
                    <div className={styles.modalContent}>
                        <h2>🎉 恭喜中奖！</h2>
                        <p>您获得了 {winningPrize.name}</p>
                        <button onClick={() => setShowModal(false)}>确定</button>
                    </div>
                </div>
            )}
        </div>
    )
}

export default WheelOfFortune
