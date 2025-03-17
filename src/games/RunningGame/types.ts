export interface Character {
    x: number
    y: number
    width: number
    height: number
    currentLane: number
    isJumping: boolean
    jumpHeight: number
    jumpSpeed: number
    baseY: number
    runningFrame: number // 奔跑动画帧
    lastFrameUpdate: number // 最后一次更新动画帧的时间
}

export interface Obstacle {
    x: number
    y: number
    width: number
    height: number
    speed: number
    originalBaseSpeed: number // 添加原始基础速度属性
    speedVariation: number // 添加速度变化属性
    lane: number
    type: ObstacleType
    passed: boolean // 标记是否已经被玩家通过
    groupId: number // 添加组ID属性用于标识同一组的障碍物
}

export interface Lane {
    x: number
    y: number // 添加 y 属性用于确定车道的垂直位置
    width: number
}

export enum ObstacleType {
    LOW = 'low',
    HIGH = 'high',
    DOUBLE = 'double' // 两个并排的障碍物
}

export interface GameSounds {
    jump: HTMLAudioElement
    collision: HTMLAudioElement
    score: HTMLAudioElement
}
