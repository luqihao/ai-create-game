import { Character, Obstacle, Lane, ObstacleType, GameSounds } from './types'

interface StageConfig {
    baseSpeed: number
    speedVariation: number
    spawnInterval: number
    obstacleTypes: ObstacleType[]
}

export class GameEngine {
    private canvas: HTMLCanvasElement
    private ctx: CanvasRenderingContext2D
    private character: Character
    private obstacles: Obstacle[] = []
    private timeLeft: number = 60
    private gameStartTime: number = 0
    private lastUpdateTime: number = 0
    private lastObstacleTime: number = 0
    private isGameOver: boolean = false
    private lanes: Lane[] = []
    private score: number = 0
    private animationFrameId: number | null = null
    private sounds: GameSounds
    private currentStage: number = 0

    // 游戏配置
    private readonly FRAME_UPDATE_INTERVAL = 100 // 角色动画更新间隔（毫秒）
    private readonly OBSTACLE_HEIGHTS = {
        [ObstacleType.LOW]: 30,
        [ObstacleType.HIGH]: 60,
        [ObstacleType.DOUBLE]: 40
    }

    // 难度阶段配置
    private readonly STAGES: StageConfig[] = [
        {
            baseSpeed: 5,
            speedVariation: 0.5,
            spawnInterval: 1000, // 第一阶段较慢的生成间隔
            obstacleTypes: [ObstacleType.LOW]
        },
        {
            baseSpeed: 5,
            speedVariation: 0.5,
            spawnInterval: 800, // 第二阶段加快生成
            obstacleTypes: [ObstacleType.LOW, ObstacleType.HIGH]
        },
        {
            baseSpeed: 5,
            speedVariation: 0.5,
            spawnInterval: 500, // 第三阶段显著加快
            obstacleTypes: [ObstacleType.LOW, ObstacleType.HIGH, ObstacleType.DOUBLE]
        },
        {
            baseSpeed: 5,
            speedVariation: 0.5,
            spawnInterval: 400, // 最终阶段极快的生成速度
            obstacleTypes: [ObstacleType.LOW, ObstacleType.HIGH, ObstacleType.DOUBLE]
        }
    ]

    private readonly STAGE_TIMES = [60, 45, 30, 15]

    // 回调函数
    public onGameOver: () => void = () => {}
    public onTimeChange: (timeLeft: number) => void = () => {}
    public onScoreChange: (score: number) => void = () => {}

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas
        const context = canvas.getContext('2d')
        if (!context) {
            throw new Error('Cannot get 2d context')
        }
        this.ctx = context

        // 设置 canvas 尺寸
        this.canvas.width = window.innerWidth
        this.canvas.height = window.innerHeight - 60

        // 初始化赛道
        const laneWidth = this.canvas.width / 3
        const laneY = this.canvas.height * 0.75 // 确保车道的y坐标正确设置
        this.lanes = [
            { x: 0, y: laneY, width: laneWidth },
            { x: laneWidth, y: laneY, width: laneWidth },
            { x: laneWidth * 2, y: laneY, width: laneWidth }
        ]

        // 初始化角色位置
        const characterY = this.canvas.height * 0.75
        this.character = {
            x: this.lanes[1].x + this.lanes[1].width / 2,
            y: characterY,
            width: 40,
            height: 60,
            currentLane: 1,
            isJumping: false,
            jumpHeight: 0,
            jumpSpeed: 0,
            baseY: characterY,
            runningFrame: 0,
            lastFrameUpdate: 0
        }

        // 初始化音效
        this.sounds = {
            jump: new Audio('/sounds/jump.mp3'),
            collision: new Audio('/sounds/collision.mp3'),
            score: new Audio('/sounds/score.mp3')
        }

        // 设置初始状态
        this.isGameOver = true // 初始化时设置为 true，只有在 startGame 时才设置为 false
        this.score = 0
        this.timeLeft = 60
        this.gameStartTime = 0
        this.lastUpdateTime = 0
        this.lastObstacleTime = 0 // 确保初始化该值

        this.resizeCanvas()
        window.addEventListener('resize', this.resizeCanvas.bind(this))
    }

    private resizeCanvas() {
        this.canvas.width = window.innerWidth
        this.canvas.height = window.innerHeight - 60

        // 重置离屏 canvas
        this.offscreenCanvas = null

        const laneWidth = this.canvas.width / 3
        const laneY = this.canvas.height * 0.75
        this.lanes = this.lanes.map((_, index) => ({
            x: laneWidth * index,
            y: laneY, // 确保在重设大小时保持y坐标
            width: laneWidth
        }))

        // 更新角色基准位置为屏幕下方 3/4 处
        this.character.baseY = this.canvas.height * 0.75
        this.character.y = this.character.baseY - this.character.jumpHeight
        this.character.x = this.lanes[this.character.currentLane].x + this.lanes[this.character.currentLane].width / 2
    }

    public startGame() {
        // 确保清除之前的游戏状态
        if (this.animationFrameId !== null) {
            cancelAnimationFrame(this.animationFrameId)
            this.animationFrameId = null
        }

        // 重置所有游戏状态
        this.isGameOver = false
        this.score = 0
        this.timeLeft = 60
        this.gameStartTime = Date.now()
        this.lastUpdateTime = this.gameStartTime
        this.obstacles = []
        this.lastObstacleTime = Date.now() // 确保初始化障碍物生成时间

        // 重置角色状态
        this.character.runningFrame = 0
        this.character.lastFrameUpdate = this.gameStartTime
        this.character.isJumping = false
        this.character.jumpHeight = 0
        this.character.jumpSpeed = 0
        this.character.currentLane = 1
        this.character.x = this.lanes[1].x + this.lanes[1].width / 2

        // 开始游戏循环
        this.update()
    }

    private update = () => {
        const currentTime = Date.now()
        const deltaTime = Math.min(currentTime - this.lastUpdateTime, 32) // 限制最大帧时间为32ms (约30fps)
        this.lastUpdateTime = currentTime

        if (!this.isGameOver) {
            // 更新时间
            const elapsedSeconds = Math.floor((currentTime - this.gameStartTime) / 1000)
            this.timeLeft = Math.max(60 - elapsedSeconds, 0)
            this.onTimeChange(this.timeLeft)

            // 仅在时间到时结束游戏
            if (this.timeLeft <= 0) {
                this.gameOver()
                return
            }

            // 更新当前难度阶段
            this.updateDifficultyStage()

            // 使用 requestAnimationFrame 的时间戳来平滑更新
            this.updateCharacter(deltaTime)
            this.updateObstacles(deltaTime)

            // 限制障碍物生成的频率
            if (currentTime - this.lastObstacleTime >= this.STAGES[this.currentStage].spawnInterval) {
                this.generateObstacles(currentTime)
            }

            // 碰撞检测优化：只检查屏幕内的障碍物
            this.checkCollisions()

            // 渲染优化
            this.render()

            // 使用 requestAnimationFrame 进行下一帧渲染
            this.animationFrameId = requestAnimationFrame(this.update)
        }
    }

    private updateCharacter(deltaTime: number) {
        const currentTime = Date.now()
        if (currentTime - this.character.lastFrameUpdate >= this.FRAME_UPDATE_INTERVAL) {
            this.character.runningFrame = (this.character.runningFrame + 1) % 4
            this.character.lastFrameUpdate = currentTime
        }

        // 根据游戏阶段增加角色移动速度
        const stageSpeedMultiplier = 1 + this.currentStage * 0.25 // 每个阶段增加25%的速度

        if (this.character.isJumping) {
            // 优化跳跃物理参数，考虑阶段速度
            const gravity = 0.9 * (deltaTime / 16) // 重力保持不变
            this.character.jumpSpeed += gravity
            // 跳跃速度随阶段加快
            this.character.jumpHeight -= this.character.jumpSpeed * (deltaTime / 16) * stageSpeedMultiplier

            // 增加最大跳跃高度限制
            this.character.jumpHeight = Math.min(this.character.jumpHeight, 180)

            // 当角色落地时
            if (this.character.jumpHeight <= 0) {
                this.character.isJumping = false
                this.character.jumpHeight = 0
                this.character.jumpSpeed = 0
            }
        }

        this.character.y = this.character.baseY - this.character.jumpHeight
    }

    private updateDifficultyStage(): void {
        // 根据剩余时间确定当前阶段
        let newStage = 0
        for (let i = 0; i < this.STAGE_TIMES.length; i++) {
            if (this.timeLeft <= this.STAGE_TIMES[i]) {
                newStage = i
                break
            }
        }

        // 如果阶段发生变化，更新所有现有障碍物的速度
        if (newStage !== this.currentStage) {
            this.currentStage = newStage
            const stage = this.STAGES[this.currentStage]

            // 更新所有现有障碍物的速度
            this.obstacles.forEach(obstacle => {
                // 保持每个障碍物的相对速度变化，但基于新阶段的基础速度
                const speedDifference = obstacle.speed - obstacle.originalBaseSpeed
                obstacle.originalBaseSpeed = stage.baseSpeed
                obstacle.speed = stage.baseSpeed + speedDifference
            })
        }
    }

    private updateObstacles(deltaTime: number) {
        const obstacleGroups = new Map<number, Obstacle[]>()
        this.obstacles.forEach(obs => {
            if (!obstacleGroups.has(obs.groupId)) {
                obstacleGroups.set(obs.groupId, [])
            }
            obstacleGroups.get(obs.groupId)?.push(obs)
        })

        this.obstacles = this.obstacles.filter(obstacle => {
            const movement = obstacle.speed * (deltaTime / 16)

            const group = obstacleGroups.get(obstacle.groupId) || []
            const groupIndex = group.indexOf(obstacle)
            const prevObstacle = groupIndex > 0 ? group[groupIndex - 1] : null

            if (prevObstacle) {
                // 根据游戏阶段动态调整最小垂直间隔
                const minVerticalGap = Math.max(70 - this.currentStage * 10, 40) // 从70逐渐减少到40
                const maxMovement = Math.max(0, prevObstacle.y - minVerticalGap - obstacle.y)
                obstacle.y += Math.min(movement, maxMovement)
            } else {
                obstacle.y += movement
            }

            if (!obstacle.passed && obstacle.y > this.character.y + this.character.height / 2) {
                obstacle.passed = true
                this.score += 10
                this.onScoreChange(this.score)
                this.sounds.score.play().catch(console.error)
            }

            return obstacle.y < this.canvas.height
        })
    }

    private generateObstacles(currentTime: number): void {
        if (!this.lastObstacleTime) {
            this.lastObstacleTime = currentTime
            return
        }

        const stageIndex = Math.min(Math.max(this.currentStage, 0), this.STAGES.length - 1)
        const stage = this.STAGES[stageIndex]
        const timeSinceLastObstacle = currentTime - this.lastObstacleTime

        const lastObstacleGroup = this.findLastObstacleGroup()
        // 根据阶段动态调整最小距离
        const minDistance = Math.max(80 - stageIndex * 15, 40) // 从80逐渐减少到40

        const canGenerateNewObstacles =
            timeSinceLastObstacle >= stage.spawnInterval &&
            (lastObstacleGroup.length === 0 || lastObstacleGroup[lastObstacleGroup.length - 1].y > minDistance)

        if (canGenerateNewObstacles) {
            // 根据游戏阶段调整连续障碍物的概率和数量
            let baseConsecutiveProb
            if (stageIndex <= 1) {
                baseConsecutiveProb = 0.4 + stageIndex * 0.15 // 第一阶段0.4，第二阶段0.55
            } else {
                baseConsecutiveProb = 0.7 + (stageIndex - 1) * 0.15 // 第三阶段0.7，第四阶段0.85
            }

            const shouldGenerateConsecutive = Math.random() < baseConsecutiveProb
            let maxConsecutive
            if (stageIndex <= 1) {
                maxConsecutive = Math.min(2 + stageIndex, 3) // 前两个阶段2-3个
            } else {
                maxConsecutive = Math.min(4 + stageIndex, 6) // 后两个阶段4-6个
            }

            // 确保每次至少生成2个障碍物
            const consecutiveCount = shouldGenerateConsecutive
                ? Math.max(Math.floor(Math.random() * maxConsecutive) + 2, 2)
                : 2

            const groupBaseSpeed = stage.baseSpeed + (Math.random() * 2 - 1) * stage.speedVariation
            const usedLanes = new Set<number>()

            // 后期阶段更容易在相邻车道生成障碍物
            const allowAdjacentLanes = stageIndex >= 2 && Math.random() < 0.5 + (stageIndex - 2) * 0.2

            // 跟踪每个车道的使用次数，确保均衡分布
            const laneUsageCount = new Array(3).fill(0)
            this.obstacles.slice(-10).forEach(obs => {
                laneUsageCount[obs.lane]++
            })

            for (let i = 0; i < consecutiveCount; i++) {
                const obstacleType = stage.obstacleTypes[Math.floor(Math.random() * stage.obstacleTypes.length)]
                const speed = groupBaseSpeed + i * 0.2

                // 改进的车道选择逻辑
                let currentLane
                if (i === 0) {
                    // 优先选择使用次数较少的车道
                    const minUsage = Math.min(...laneUsageCount)
                    const leastUsedLanes = laneUsageCount
                        .map((count, index) => ({ count, index }))
                        .filter(lane => lane.count === minUsage)
                        .map(lane => lane.index)

                    currentLane = leastUsedLanes[Math.floor(Math.random() * leastUsedLanes.length)]
                } else {
                    const prevLane = Array.from(usedLanes)[usedLanes.size - 1]

                    // 计算每个车道的权重，中间车道给予稍高权重
                    const weights = [1, 1.2, 1].map((baseWeight, lane) => {
                        // 如果是已使用的车道，权重降低
                        if (usedLanes.has(lane)) return 0
                        // 如果是相邻车道且不允许相邻，权重降低
                        if (!allowAdjacentLanes && Math.abs(lane - prevLane) === 1) return 0
                        // 如果这个车道使用次数明显多于其他车道，降低权重
                        const avgUsage = laneUsageCount.reduce((a, b) => a + b, 0) / 3
                        if (laneUsageCount[lane] > avgUsage * 1.5) return baseWeight * 0.5
                        return baseWeight
                    })

                    // 根据权重选择车道
                    const totalWeight = weights.reduce((a, b) => a + b, 0)
                    if (totalWeight === 0) {
                        // 如果所有车道权重都为0，重置已使用车道并随机选择
                        usedLanes.clear()
                        currentLane = Math.floor(Math.random() * 3)
                    } else {
                        let random = Math.random() * totalWeight
                        currentLane = weights.findIndex(weight => {
                            random -= weight
                            return random <= 0
                        })
                    }
                }

                usedLanes.add(currentLane)
                laneUsageCount[currentLane]++ // 更新使用次数

                // ...rest of the obstacle generation code...
                const baseVerticalGap = Math.max(90 - stageIndex * 15, 50)
                const randomOffset = (Math.random() - 0.5) * 20
                const verticalOffset = -i * (baseVerticalGap + randomOffset)

                this.obstacles.push({
                    x:
                        this.lanes[currentLane].x +
                        (this.lanes[currentLane].width - (obstacleType === ObstacleType.DOUBLE ? 60 : 30)) / 2,
                    y: verticalOffset,
                    width: obstacleType === ObstacleType.DOUBLE ? 60 : 30,
                    height: this.OBSTACLE_HEIGHTS[obstacleType],
                    speed: speed,
                    originalBaseSpeed: groupBaseSpeed,
                    speedVariation: stage.speedVariation,
                    type: obstacleType,
                    lane: currentLane,
                    passed: false,
                    groupId: Date.now()
                })
            }

            this.lastObstacleTime = currentTime
        }
    }

    // 辅助方法：找到最后一组障碍物
    private findLastObstacleGroup(): Obstacle[] {
        if (this.obstacles.length === 0) return []

        const lastGroupId = this.obstacles[this.obstacles.length - 1].groupId
        return this.obstacles.filter(obs => obs.groupId === lastGroupId)
    }

    private checkCollisions() {
        if (this.isGameOver) return

        // 只检查屏幕内的障碍物
        const visibleObstacles = this.obstacles.filter(
            obs => obs.y < this.canvas.height && obs.y + obs.height > 0 && !obs.passed
        )

        for (const obstacle of visibleObstacles) {
            if (this.isColliding(this.character, obstacle)) {
                this.sounds.collision.play().catch(console.error)
                this.gameOver()
                return
            }
        }
    }

    private isColliding(char: Character, obs: Obstacle): boolean {
        // 只有当在同一个赛道时才检查碰撞
        if (char.currentLane !== obs.lane) {
            return false
        }

        // 角色的横向边界
        const charLeft = char.x - char.width / 2
        const charRight = char.x + char.width / 2
        const charTop = char.y - char.height / 2
        const charBottom = char.y + char.height / 2

        // 障碍物的边界
        const obsLeft = obs.x
        const obsRight = obs.x + obs.width
        const obsTop = obs.y
        const obsBottom = obs.y + obs.height

        // 检查水平和垂直重叠
        const horizontalOverlap = !(charRight < obsLeft || charLeft > obsRight)
        const verticalOverlap = !(charBottom < obsTop || charTop > obsBottom)

        // 如果角色正在跳跃且向上运动，或者已经在障碍物上方，不检测碰撞
        if (char.isJumping && (char.jumpSpeed < 0 || charBottom < obsTop)) {
            return false
        }

        return horizontalOverlap && verticalOverlap
    }

    private render() {
        // 使用 clearRect 优化，只清除需要更新的区域
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

        // 离屏渲染优化：创建离屏 canvas 用于赛道渲染
        const offscreenCanvas = this.getOffscreenCanvas()
        this.ctx.drawImage(offscreenCanvas, 0, 0)

        // 优化渲染顺序
        const visibleObstacles = this.obstacles.filter(obs => obs.y < this.canvas.height && obs.y + obs.height > 0)

        if (this.character.isJumping) {
            // 跳跃时：先绘制障碍物，再绘制角色
            visibleObstacles.forEach(obstacle => {
                this.drawObstacle(obstacle)
            })
            this.drawCharacter(this.character)
        } else {
            // 非跳跃时：先绘制角色，再绘制障碍物
            this.drawCharacter(this.character)
            visibleObstacles.forEach(obstacle => {
                this.drawObstacle(obstacle)
            })
        }
    }

    // 创建离屏 canvas 用于赛道渲染
    private offscreenCanvas: HTMLCanvasElement | null = null
    private getOffscreenCanvas(): HTMLCanvasElement {
        if (!this.offscreenCanvas) {
            this.offscreenCanvas = document.createElement('canvas')
            this.offscreenCanvas.width = this.canvas.width
            this.offscreenCanvas.height = this.canvas.height
            const offscreenCtx = this.offscreenCanvas.getContext('2d')!

            // 绘制赛道到离屏 canvas
            this.lanes.forEach(lane => {
                offscreenCtx.fillStyle = '#eee'
                offscreenCtx.fillRect(lane.x, 0, lane.width, this.canvas.height)
                offscreenCtx.strokeStyle = '#ddd'
                offscreenCtx.strokeRect(lane.x, 0, lane.width, this.canvas.height)
            })
        }
        return this.offscreenCanvas
    }

    private drawCharacter(char: Character) {
        this.ctx.save()
        this.ctx.translate(char.x, char.y)

        // 如果角色在跳跃状态，添加阴影效果
        if (char.isJumping) {
            this.ctx.shadowColor = 'rgba(0, 0, 0, 0.3)'
            this.ctx.shadowBlur = 10
            this.ctx.shadowOffsetY = 5
        }

        // 身体
        this.ctx.fillStyle = '#333'
        this.ctx.fillRect(-char.width / 2, -char.height / 2, char.width, char.height)

        // 头部
        this.ctx.beginPath()
        this.ctx.arc(0, -char.height / 2, char.width / 3, 0, Math.PI * 2)
        this.ctx.fill()

        // 清除阴影效果后绘制腿部
        this.ctx.shadowColor = 'transparent'
        this.ctx.shadowBlur = 0
        this.ctx.shadowOffsetY = 0

        // 腿部动画
        const legSpread = char.isJumping ? 20 : Math.sin((char.runningFrame * Math.PI) / 2) * 15
        this.ctx.strokeStyle = '#333'
        this.ctx.lineWidth = 4

        // 左腿
        this.ctx.beginPath()
        this.ctx.moveTo(-5, char.height / 2)
        this.ctx.lineTo(-legSpread, char.height)
        this.ctx.stroke()

        // 右腿
        this.ctx.beginPath()
        this.ctx.moveTo(5, char.height / 2)
        this.ctx.lineTo(legSpread, char.height)
        this.ctx.stroke()

        this.ctx.restore()
    }

    private drawObstacle(obs: Obstacle) {
        // 添加阴影效果
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.2)'
        this.ctx.shadowBlur = 5
        this.ctx.shadowOffsetY = 2

        // 主体颜色略微调亮，使阴影效果更明显
        this.ctx.fillStyle = '#ff1a1a'

        if (obs.type === ObstacleType.DOUBLE) {
            // 绘制双重障碍物
            this.ctx.fillRect(obs.x, obs.y, obs.width / 2 - 5, obs.height)
            this.ctx.fillRect(obs.x + obs.width / 2 + 5, obs.y, obs.width / 2 - 5, obs.height)
        } else {
            // 绘制单个障碍物
            this.ctx.fillRect(obs.x, obs.y, obs.width, obs.height)
        }

        // 清除阴影效果后绘制支柱
        this.ctx.shadowColor = 'transparent'
        this.ctx.shadowBlur = 0
        this.ctx.shadowOffsetY = 0

        // 绘制栏杆支柱 (位于障碍物底部)
        this.ctx.fillStyle = '#800000'
        this.ctx.fillRect(obs.x, obs.y + obs.height, 5, 20)
        this.ctx.fillRect(obs.x + obs.width - 5, obs.y + obs.height, 5, 20)
    }

    public moveLeft() {
        if (this.character.currentLane > 0) {
            this.character.currentLane--
            this.character.x =
                this.lanes[this.character.currentLane].x + this.lanes[this.character.currentLane].width / 2
        }
    }

    public moveRight() {
        if (this.character.currentLane < 2) {
            this.character.currentLane++
            this.character.x =
                this.lanes[this.character.currentLane].x + this.lanes[this.character.currentLane].width / 2
        }
    }

    public jump() {
        if (!this.character.isJumping) {
            this.character.isJumping = true
            this.character.jumpHeight = 0
            const stageSpeedMultiplier = 1 + this.currentStage * 0.25 // 每个阶段增加25%的速度
            this.character.jumpSpeed = -25 * stageSpeedMultiplier // 跳跃速度随阶段变化
            this.sounds.jump.play().catch(console.error)
        }
    }

    private gameOver() {
        if (!this.isGameOver) {
            // 防止重复调用
            this.isGameOver = true
            if (this.animationFrameId !== null) {
                cancelAnimationFrame(this.animationFrameId)
                this.animationFrameId = null
            }
            this.onGameOver()
        }
    }

    public destroy() {
        if (this.animationFrameId !== null) {
            cancelAnimationFrame(this.animationFrameId)
        }
        window.removeEventListener('resize', this.resizeCanvas.bind(this))
    }
}
