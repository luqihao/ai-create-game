// 棋子位置类型
export interface Position {
    x: number
    y: number
}

// 棋盘上的棋子类型
export interface Peg {
    id: number
    position: Position
    active: boolean // true表示棋子在棋盘上，false表示已被移除
}

// 可能的移动
export interface PossibleMove {
    from: Position
    over: Position
    to: Position
}

// 游戏状态
export enum GameStatus {
    PLAYING = 'playing',
    WON = 'won',
    LOST = 'lost'
}
