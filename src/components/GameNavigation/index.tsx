import React from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './index.module.scss'

interface GameNavigationProps {
    title: string
}

const GameNavigation: React.FC<GameNavigationProps> = ({ title }) => {
    const navigate = useNavigate()

    return (
        <div className={styles.navigation}>
            <div onClick={() => navigate('/')} className={styles.backButton}>
                返回首页
            </div>
            <h1 className={styles.title}>{title}</h1>
        </div>
    )
}

export default GameNavigation
