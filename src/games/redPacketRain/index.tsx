import React from 'react'
import RedPacketRain from './RedPacketRain'
import GameNavigation from '../../components/GameNavigation'

const RedPacketRainGame: React.FC = () => {
    return (
        <>
            <GameNavigation title="红包雨" />
            <RedPacketRain />
        </>
    )
}

export default RedPacketRainGame
