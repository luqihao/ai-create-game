import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import PegSolitaire from './games/peg-solitaire'
import styles from './App.module.scss'
import { MatchThree } from './games/MatchThree'

function App() {
    return (
        <Router>
            <div className={styles.App}>
                <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/game/peg-solitaire" element={<PegSolitaire />} />
                    <Route path="/game/match-three" element={<MatchThree />} />
                    {/* 这里可以添加更多游戏路由 */}
                </Routes>
            </div>
        </Router>
    )
}

export default App
