import React, { useEffect, useState } from 'react'
import GameCard from './GameCard'
import styles from './index.module.scss'
import { generatePlaceholderImage } from '../../assets/placeholder'

// 游戏列表数据
const games = [
    {
        id: 'peg-solitaire',
        title: '孔明棋',
        description: '经典的单人智力游戏，移动棋子跳过其他棋子，目标是最后只剩下一个棋子。',
        imageUrl: '/images/peg-solitaire.jpg'
    },
    {
        id: 'match-three',
        title: '消消乐',
        description: '经典的三消游戏，在60秒内消除尽可能多的元素获得高分！',
        imageUrl: '/images/match-three.jpg'
    },
    {
        id: 'red-packet-rain',
        title: '红包雨',
        description: '在60秒内尽可能多地点击掉落的红包，小心炸弹！在手机上体验更佳。',
        imageUrl: '/images/red-packet-rain.jpg'
    },
    {
        id: 'wheel-of-fortune',
        title: '幸运大转盘',
        description: '转动幸运大转盘，看看今天的运气如何！可以提前选择中奖结果。',
        imageUrl: '/images/wheel-of-fortune.jpg'
    },
    {
        id: 'plinko',
        title: 'Plinko 弹珠游戏',
        description: '经典的弹珠滚落游戏，小球从顶部落下，弹跳穿过钉板最终落入奖品槽。',
        imageUrl: '/images/plinko.jpg'
    },
    {
        id: 'running-game',
        title: '跑步障碍游戏',
        description: '控制角色左右移动和跳跃，躲避前方出现的障碍物，看看你能坚持多久！',
        imageUrl: '/images/running-game.jpg'
    }
]

const HomePage: React.FC = () => {
    const [gameImages, setGameImages] = useState<{ [key: string]: string }>({})

    useEffect(() => {
        // 生成或加载游戏图片
        const images: { [key: string]: string } = {}
        games.forEach(game => {
            // 尝试加载图片，如果失败则使用占位符
            const img = new Image()
            img.onload = () => {
                images[game.id] = game.imageUrl
                setGameImages({ ...images })
            }
            img.onerror = () => {
                images[game.id] = generatePlaceholderImage(game.title)
                setGameImages({ ...images })
            }
            img.src = game.imageUrl
        })
    }, [])

    return (
        <div className={styles.container}>
            <header>
                <h1>迷你游戏集合</h1>
                <p>选择下面的游戏开始玩吧！</p>
            </header>
            <div className={styles.gamesContainer}>
                {games.map(game => (
                    <GameCard
                        key={game.id}
                        id={game.id}
                        title={game.title}
                        description={game.description}
                        imageUrl={gameImages[game.id] || ''}
                    />
                ))}
            </div>
        </div>
    )
}

export default HomePage
