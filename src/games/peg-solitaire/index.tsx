import React from 'react'
import styles from './PegSolitaire.module.scss'
import Game from './Game'
import GameNavigation from '../../components/GameNavigation'

const PegSolitaire: React.FC = () => {
    return (
        <>
            <GameNavigation title="孔明棋" />
            <div className={styles.container}>
                <Game />
            </div>
        </>
    )
}

export default PegSolitaire
