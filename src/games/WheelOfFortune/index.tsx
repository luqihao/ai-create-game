import React from 'react'
import WheelGame from './WheelOfFortune'
import GameNavigation from '../../components/GameNavigation'

const WheelOfFortuneGame: React.FC = () => {
    return (
        <>
            <GameNavigation title="幸运大转盘" />
            <WheelGame />
        </>
    )
}

export default WheelOfFortuneGame
