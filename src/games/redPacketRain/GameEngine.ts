// 红包类型
export enum RedPacketType {
    SMALL = 'small',
    MEDIUM = 'medium',
    LARGE = 'large',
    BOMB = 'bomb'
}

// 红包对象
export interface RedPacket {
    id: number
    x: number
    y: number
    width: number
    height: number
    type: RedPacketType
    speed: number
    rotation: number // 添加旋转属性
    rotationSpeed: number // 添加旋转速度属性
}

// 爆炸效果
export interface Explosion {
    x: number
    y: number
    particles: {
        x: number
        y: number
        vx: number
        vy: number
        size: number
        color: string
        opacity: number
    }[]
    scoreEffect: {
        value: number // 显示的分数
        opacity: number // 透明度
        y: number // y坐标，会向上移动
    }
    timeLeft: number
}

export class GameEngine {
    private canvas: HTMLCanvasElement
    private ctx: CanvasRenderingContext2D
    private redPackets: RedPacket[] = []
    private explosions: Explosion[] = []
    private nextId = 0
    private score = 0
    private timeLeft = 60 // 60秒游戏时间
    private gameOver = false
    private gameStartTime = 0
    private lastUpdateTime = 0
    private lastGenerationTime = 0

    private columns = 4 // 将屏幕分为4列
    private lastUsedColumn = -1 // 跟踪上一次使用的列，初始为-1

    private stages = [
        { speed: 3.5, interval: 700 }, // 前20秒
        { speed: 5.5, interval: 450 }, // 中20秒
        { speed: 7.0, interval: 250 } // 后20秒
    ]

    private packetSize = { width: 90, height: 110 }

    private packetColors = {
        [RedPacketType.SMALL]: '#FF4D4F', // 小红包 - 浅红色
        [RedPacketType.MEDIUM]: '#FF7A45', // 中红包 - 橙红色
        [RedPacketType.LARGE]: '#FAAD14', // 大红包 - 金黄色
        [RedPacketType.BOMB]: '#000000' // 炸弹 - 黑色
    }

    private packetScores = {
        [RedPacketType.SMALL]: 1,
        [RedPacketType.MEDIUM]: 3,
        [RedPacketType.LARGE]: 5,
        [RedPacketType.BOMB]: -3
    }

    public onScoreChange: (score: number) => void = () => {}
    public onTimeChange: (timeLeft: number) => void = () => {}
    public onGameOver: () => void = () => {}

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas
        const context = canvas.getContext('2d')
        if (!context) {
            throw new Error('无法获取 canvas 上下文')
        }
        this.ctx = context

        this.resizeCanvas()

        window.addEventListener('resize', this.resizeCanvas.bind(this))
    }

    private resizeCanvas() {
        this.canvas.width = window.innerWidth
        this.canvas.height = window.innerHeight
    }

    private currentStageIndex = 0

    private currentBaseSpeed: number = 3.5

    private update() {
        const currentTime = Date.now()
        const deltaTime = currentTime - this.lastUpdateTime
        this.lastUpdateTime = currentTime

        const elapsedSeconds = Math.floor((currentTime - this.gameStartTime) / 1000)
        if (!this.gameOver) {
            this.timeLeft = Math.max(60 - elapsedSeconds, 0)
            this.onTimeChange(this.timeLeft)

            if (this.timeLeft <= 0) {
                this.gameOver = true
                this.onGameOver()
                return
            }
        }

        const stageIndex = Math.min(Math.floor(elapsedSeconds / 20), 2)
        const currentStage = this.stages[stageIndex]

        if (stageIndex !== this.currentStageIndex) {
            this.currentStageIndex = stageIndex
            this.currentBaseSpeed = currentStage.speed
        }

        if (currentTime - this.lastGenerationTime > currentStage.interval && !this.gameOver) {
            this.generateRedPacket()
            this.lastGenerationTime = currentTime
        }

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

        this.updateRedPackets(deltaTime)

        this.updateExplosions(deltaTime)

        if (!this.gameOver) {
            requestAnimationFrame(this.update.bind(this))
        }
    }

    private generateRedPacket() {
        const rand = Math.random() * 10
        let type: RedPacketType

        if (rand < 1) {
            type = RedPacketType.LARGE
        } else if (rand < 4) {
            type = RedPacketType.MEDIUM
        } else if (rand < 9) {
            type = RedPacketType.SMALL
        } else {
            type = RedPacketType.BOMB
        }

        const size = this.packetSize

        const columnWidth = this.canvas.width / this.columns

        let column
        do {
            column = Math.floor(Math.random() * this.columns)
        } while (column === this.lastUsedColumn && this.columns > 1)

        this.lastUsedColumn = column

        const padding = size.width * 0.1
        const minX = column * columnWidth + padding
        const maxX = (column + 1) * columnWidth - size.width - padding
        const x = minX + Math.random() * (maxX - minX)

        const y = -size.height
        const speed = this.currentBaseSpeed

        // 为每个红包设置随机的初始旋转角度和旋转速度
        const rotation = Math.random() * Math.PI * 0.4 - Math.PI * 0.2 // 初始角度在 -36° 到 36° 之间
        const rotationSpeed = (Math.random() * 0.03 - 0.015) * (Math.random() < 0.5 ? -1 : 1) // 随机正负方向，速度在 -0.015 到 0.015 之间

        this.redPackets.push({
            id: this.nextId++,
            x,
            y,
            width: size.width,
            height: size.height,
            type,
            speed,
            rotation,
            rotationSpeed
        })
    }

    private updateRedPackets(deltaTime: number) {
        this.redPackets = this.redPackets.filter(packet => {
            packet.y += packet.speed * (deltaTime / 16)

            packet.speed = this.currentBaseSpeed

            // 更新旋转角度
            packet.rotation += packet.rotationSpeed * (deltaTime / 16)

            this.drawRedPacket(packet)

            return packet.y < this.canvas.height
        })
    }

    private drawRedPacket(packet: RedPacket) {
        this.ctx.save()

        // 计算红包中心点
        const centerX = packet.x + packet.width / 2
        const centerY = packet.y + packet.height / 2

        // 平移到红包中心
        this.ctx.translate(centerX, centerY)

        // 应用旋转
        this.ctx.rotate(packet.rotation)

        // 绘制红包（需要将坐标调整回左上角）
        this.ctx.fillStyle = this.packetColors[packet.type]
        this.ctx.fillRect(-packet.width / 2, -packet.height / 2, packet.width, packet.height)

        if (packet.type !== RedPacketType.BOMB) {
            // 金色边框
            this.ctx.strokeStyle = 'gold'
            this.ctx.lineWidth = 3
            this.ctx.beginPath()
            this.ctx.roundRect(-packet.width / 2, -packet.height / 2, packet.width, packet.height, 8)
            this.ctx.stroke()

            // 中央圆形
            this.ctx.beginPath()
            this.ctx.arc(0, 0, packet.width * 0.3, 0, Math.PI * 2)
            this.ctx.stroke()

            // 福字
            this.ctx.fillStyle = 'gold'
            this.ctx.font = `bold ${packet.width * 0.5}px Arial`
            this.ctx.textAlign = 'center'
            this.ctx.textBaseline = 'middle'
            this.ctx.fillText('福', 0, 0)
        } else {
            // 炸弹红包
            this.ctx.strokeStyle = '#444'
            this.ctx.lineWidth = 4
            this.ctx.beginPath()
            this.ctx.roundRect(-packet.width / 2, -packet.height / 2, packet.width, packet.height, 8)
            this.ctx.stroke()

            // 白色圆形
            this.ctx.fillStyle = 'white'
            this.ctx.beginPath()
            this.ctx.arc(0, 0, packet.width * 0.3, 0, Math.PI * 2)
            this.ctx.fill()

            // 炸弹符号
            this.ctx.fillStyle = 'black'
            this.ctx.font = `${packet.width * 0.45}px Arial`
            this.ctx.textAlign = 'center'
            this.ctx.textBaseline = 'middle'
            this.ctx.fillText('💣', 0, 0)
        }

        this.ctx.restore()
    }

    private updateExplosions(deltaTime: number) {
        this.explosions = this.explosions.filter(explosion => {
            explosion.timeLeft -= deltaTime

            for (const particle of explosion.particles) {
                particle.x += particle.vx * (deltaTime / 16)
                particle.y += particle.vy * (deltaTime / 16)
                particle.vy += 0.1
                particle.opacity -= 0.02 * (deltaTime / 16)
            }

            explosion.scoreEffect.y -= 1 * (deltaTime / 16)
            explosion.scoreEffect.opacity -= 0.015 * (deltaTime / 16)

            this.drawExplosion(explosion)

            return explosion.timeLeft > 0
        })
    }

    private drawExplosion(explosion: Explosion) {
        for (const particle of explosion.particles) {
            if (particle.opacity <= 0) continue

            this.ctx.save()
            this.ctx.globalAlpha = particle.opacity
            this.ctx.fillStyle = particle.color

            this.ctx.beginPath()
            this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
            this.ctx.fill()

            this.ctx.restore()
        }

        if (explosion.scoreEffect.opacity > 0) {
            this.ctx.save()
            this.ctx.globalAlpha = explosion.scoreEffect.opacity

            const value = explosion.scoreEffect.value
            this.ctx.fillStyle = value > 0 ? '#FFD700' : '#FF4500'

            this.ctx.font = 'bold 32px Arial'
            this.ctx.textAlign = 'center'
            this.ctx.textBaseline = 'middle'

            const text = value > 0 ? `+${value}` : `${value}`
            this.ctx.fillText(text, explosion.x, explosion.scoreEffect.y)

            this.ctx.restore()
        }
    }

    public handleClick(x: number, y: number) {
        if (this.gameOver) return

        const sortedPackets = [...this.redPackets].sort((a, b) => a.y - b.y)

        for (let i = 0; i < sortedPackets.length; i++) {
            const packet = sortedPackets[i]

            if (x >= packet.x && x <= packet.x + packet.width && y >= packet.y && y <= packet.y + packet.height) {
                const originalIndex = this.redPackets.findIndex(p => p.id === packet.id)
                if (originalIndex !== -1) {
                    this.redPackets.splice(originalIndex, 1)

                    const scoreChange = this.packetScores[packet.type]
                    this.score += scoreChange
                    this.onScoreChange(this.score)

                    this.createExplosion(
                        packet.x + packet.width / 2,
                        packet.y + packet.height / 2,
                        scoreChange,
                        packet.type
                    )

                    return
                }
            }
        }
    }

    private createExplosion(x: number, y: number, score: number, type: RedPacketType) {
        const particles = []
        const particleCount = 25

        const baseColor = this.packetColors[type]

        for (let i = 0; i < particleCount; i++) {
            const angle = Math.random() * Math.PI * 2
            const speed = 1 + Math.random() * 4

            particles.push({
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 2.5,
                size: 3 + Math.random() * 5,
                color: type === RedPacketType.BOMB ? '#FF4500' : baseColor,
                opacity: 1
            })
        }

        this.explosions.push({
            x,
            y,
            particles,
            scoreEffect: {
                value: score,
                opacity: 1,
                y: y - 20
            },
            timeLeft: 1000
        })
    }

    public startGame() {
        this.score = 0
        this.timeLeft = 60
        this.gameOver = false
        this.redPackets = []
        this.explosions = []
        this.nextId = 0
        this.gameStartTime = Date.now()
        this.lastUpdateTime = this.gameStartTime
        this.lastGenerationTime = this.gameStartTime
        this.currentStageIndex = 0
        this.currentBaseSpeed = this.stages[0].speed // 初始化基础速度
        this.lastUsedColumn = -1 // 重置最后使用的列

        this.onScoreChange(this.score)
        this.onTimeChange(this.timeLeft)

        // 开始游戏循环
        this.update()
    }

    public destroy() {
        window.removeEventListener('resize', this.resizeCanvas.bind(this))
    }
}
