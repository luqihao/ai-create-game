import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import PegSolitaire from './games/peg-solitaire'
import styles from './App.module.scss'
import { MatchThree } from './games/MatchThree'
import RedPacketRainGame from './games/redPacketRain'
import WheelOfFortune from './games/WheelOfFortune'
import Plinko from './games/Plinko'

function App() {
    return (
        <Router>
            <div className={styles.App}>
                <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/game/peg-solitaire" element={<PegSolitaire />} />
                    <Route path="/game/match-three" element={<MatchThree />} />
                    <Route path="/game/red-packet-rain" element={<RedPacketRainGame />} />
                    <Route path="/game/wheel-of-fortune" element={<WheelOfFortune />} />
                    <Route path="/game/plinko" element={<Plinko />} />
                </Routes>
            </div>
        </Router>
    )
}

export default App
