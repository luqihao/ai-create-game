import React from 'react'
import { Link } from 'react-router-dom'
import styles from './PegSolitaire.module.scss'
import Game from './Game'

const PegSolitaire: React.FC = () => {
    return (
        <div className={styles.container}>
            <Link to="/" className={styles.backButton}>
                ← 返回首页
            </Link>
            <Game />
        </div>
    )
}

export default PegSolitaire
