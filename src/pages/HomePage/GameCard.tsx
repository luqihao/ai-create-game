import React from 'react'
import { Link } from 'react-router-dom'
import styles from './index.module.scss'

interface GameCardProps {
    id: string
    title: string
    description: string
    imageUrl: string
}

const GameCard: React.FC<GameCardProps> = ({ id, title, description, imageUrl }) => {
    return (
        <Link to={`/game/${id}`} className={styles.card}>
            <div className={styles.image} style={{ backgroundImage: `url(${imageUrl})` }}>
                <div className={styles.overlay}>
                    <h3>{title}</h3>
                    <p>{description}</p>
                </div>
            </div>
        </Link>
    )
}

export default GameCard
