// 使用默认导入方式导入 Matter.js
import Matter from 'matter-js'

// Types for prizes
type PrizeSlot = {
    name: string
    value: string
    position: { x: number; y: number }
    width: number
}

export class PlinkoEngine {
    private engine: Matter.Engine
    private render: Matter.Render
    private runner: Matter.Runner
    private world: Matter.World
    private canvas: HTMLCanvasElement
    private ball: Matter.Body | null = null
    private pegs: Matter.Body[] = []
    private walls: Matter.Body[] = []
    private prizeSlots: PrizeSlot[] = []
    private currentPrize: string = ''
    private gameActive: boolean = false

    // Callback function for when the game ends
    public onGameEnd: (prize: string) => void = () => {}

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas
        this.engine = Matter.Engine.create()
        this.world = this.engine.world

        // Create the renderer - 缩小尺寸
        this.render = Matter.Render.create({
            canvas: this.canvas,
            engine: this.engine,
            options: {
                width: 400, // 从600改为400
                height: 500, // 从700改为500
                wireframes: false,
                background: '#f0f0f0'
            }
        })

        this.runner = Matter.Runner.create()

        // Configure physics but don't start the engine yet
        this.engine.gravity.y = 0.5
        this.world.gravity.y = 0.5
    }

    init() {
        // Set up the canvas dimensions and create game elements
        this.setupCanvas()
        this.createWalls()
        this.createPegs()
        this.createPrizeSlots()

        // 只运行渲染器，不运行物理引擎
        Matter.Render.run(this.render)
    }

    private setupCanvas() {
        this.canvas.width = 400
        this.canvas.height = 500
    }

    private createWalls() {
        const sideWallThickness = 20
        const bottomWallThickness = 5 // 减小底部边界厚度

        const wallOptions = {
            isStatic: true,
            render: { fillStyle: '#333' },
            restitution: 0.6
        }

        this.walls = [
            // Left wall
            Matter.Bodies.rectangle(
                -sideWallThickness / 2,
                this.canvas.height / 2,
                sideWallThickness,
                this.canvas.height,
                wallOptions
            ),
            // Right wall
            Matter.Bodies.rectangle(
                this.canvas.width + sideWallThickness / 2,
                this.canvas.height / 2,
                sideWallThickness,
                this.canvas.height,
                wallOptions
            ),
            // Bottom wall - 更薄的底部边界
            Matter.Bodies.rectangle(
                this.canvas.width / 2,
                this.canvas.height - bottomWallThickness / 2,
                this.canvas.width,
                bottomWallThickness,
                {
                    ...wallOptions,
                    label: 'bottom-wall'
                }
            )
        ]

        Matter.World.add(this.world, this.walls)
    }

    private createPegs() {
        const pegRadius = 7 // 稍微减小钉子尺寸
        const pegOptions = {
            isStatic: true,
            restitution: 0.7,
            friction: 0.05,
            render: { fillStyle: '#555' }
        }

        // Create a grid of pegs - 调整布局
        const columns = 8 // 从10改为8
        const rows = 7 // 从8改为7
        const horizontalSpacing = this.canvas.width / (columns + 1)
        const verticalSpacing = 50 // 从60改为50
        const startY = 100 // 从150改为100

        for (let row = 0; row < rows; row++) {
            const offset = row % 2 === 0 ? 0 : horizontalSpacing / 2
            const pegsInRow = row % 2 === 0 ? columns : columns - 1

            for (let col = 0; col < pegsInRow; col++) {
                const x = offset + horizontalSpacing * (col + 1)
                const y = startY + row * verticalSpacing

                const peg = Matter.Bodies.circle(x, y, pegRadius, pegOptions)
                this.pegs.push(peg)
                Matter.World.add(this.world, peg)
            }
        }
    }

    private createPrizeSlots() {
        const slotCount = 7 // 从5增加到7个格子
        const slotWidth = this.canvas.width / slotCount
        const slotY = this.canvas.height - 60
        const prizeBackgroundY = this.canvas.height - 25

        // 修改奖品配置，增加两个20元奖品
        const prizeValues = ['5元', '10元', '20元', '50元', '20元', '10元', '5元']
        const prizeColors = ['#FFD700', '#1E90FF', '#32CD32', '#FF4500', '#32CD32', '#1E90FF', '#FFD700']

        // 修复隔板位置问题 - 确保所有隔板都在屏幕内并且宽度一致
        const dividerThickness = 5
        // 增加隔板高度，消除底部空隙
        const dividerHeight = 90 // 减小隔板高度

        // 存储所有隔板的位置信息，以便精确计算每个奖品槽的位置和宽度
        const dividerPositions: number[] = []

        // 首先添加奖品背景，确保它们在隔板下面
        this.prizeSlots = [] // 清空现有的奖品槽
        const prizeBackgrounds: Matter.Body[] = []

        // Store prize slot information and create prize backgrounds first
        for (let i = 0; i < slotCount; i++) {
            // 临时计算槽位置，后面会根据实际隔板位置重新调整
            const slotCenterX = (i + 0.5) * slotWidth

            this.prizeSlots.push({
                name: `奖槽 ${i + 1}`,
                value: prizeValues[i],
                position: { x: slotCenterX, y: prizeBackgroundY }, // 更新位置
                width: slotWidth
            })

            // 添加奖品背景 - 调整垂直位置和高度
            const prizeBackground = Matter.Bodies.rectangle(
                slotCenterX,
                prizeBackgroundY, // 使用新的垂直位置
                slotWidth - dividerThickness,
                40, // 略微减小高度，避免遮挡底部
                {
                    isStatic: true,
                    isSensor: true, // 使其不影响物理碰撞
                    render: {
                        fillStyle: prizeColors[i],
                        opacity: 0.8
                    },
                    collisionFilter: {
                        group: -1,
                        category: 0x0002,
                        mask: 0x0001
                    }
                }
            )

            prizeBackgrounds.push(prizeBackground)
        }

        // 添加所有奖品背景到世界
        Matter.World.add(this.world, prizeBackgrounds)

        // Add slot dividers on top of prize backgrounds
        const dividers: Matter.Body[] = []
        for (let i = 0; i <= slotCount; i++) {
            // 计算隔板位置时进行调整，确保第一个和最后一个隔板完全显示在屏幕内
            let x
            if (i === 0) {
                // 第一个隔板稍微向右移动，使其完全显示
                x = dividerThickness / 2
            } else if (i === slotCount) {
                // 最后一个隔板稍微向左移动，使其完全显示
                x = i * slotWidth - dividerThickness / 2
            } else {
                // 中间的隔板位置不变
                x = i * slotWidth
            }

            dividerPositions.push(x)

            // 创建隔板，确保其置于顶层 - 移除不支持的 zIndex 属性
            const divider = Matter.Bodies.rectangle(
                x,
                slotY + dividerHeight / 2, // 向下移动，使其更接近底部
                dividerThickness,
                dividerHeight,
                {
                    isStatic: true,
                    isSensor: false, // 移除传感器属性，使其产生物理碰撞
                    restitution: 0.6, // 添加弹性
                    render: {
                        fillStyle: '#333'
                        // 删除不支持的 zIndex 属性
                    },
                    // 确保隔板具有碰撞性能
                    collisionFilter: {
                        group: 0,
                        category: 0x0001,
                        mask: 0xffffffff
                    }
                }
            )
            dividers.push(divider)
        }

        // 添加所有隔板到世界 - 在奖品背景之后添加，确保它们在上层
        Matter.World.add(this.world, dividers)

        // 更新奖品文本位置 - 修复闭包函数和类型问题
        for (let i = 0; i < slotCount; i++) {
            // 根据隔板位置精确计算每个奖品槽的中心位置和宽度
            const leftDividerX = dividerPositions[i]
            const rightDividerX = dividerPositions[i + 1]
            const slotCenterX = (leftDividerX + rightDividerX) / 2
            const actualSlotWidth = rightDividerX - leftDividerX

            // 更新奖品槽位置信息
            this.prizeSlots[i].position.x = slotCenterX
            this.prizeSlots[i].width = actualSlotWidth

            // 在奖品背景上方添加文本渲染 - 修复函数调用和类型问题
            const currentIndex = i // 保存当前索引值
            const currentCenterX = slotCenterX // 保存当前中心点位置

            // 使用正确的事件监听方式
            Matter.Events.on(this.render, 'afterRender', () => {
                const ctx = this.render.context as CanvasRenderingContext2D
                if (ctx) {
                    ctx.font = '16px Arial'
                    ctx.fillStyle = '#000'
                    ctx.textAlign = 'center'
                    ctx.textBaseline = 'middle'
                    ctx.fillText(prizeValues[currentIndex], currentCenterX, prizeBackgroundY)
                }
            })
        }

        // 简化碰撞检测，小球碰到底部就立即结束游戏
        Matter.Events.on(this.engine, 'collisionStart', event => {
            if (!this.gameActive || !this.ball) return

            const pairs = event.pairs

            for (let i = 0; i < pairs.length; i++) {
                const pair = pairs[i]
                const bodyA = pair.bodyA
                const bodyB = pair.bodyB

                // 检查是否碰到底部边界
                const isBottomWall = bodyA.label === 'bottom-wall' || bodyB.label === 'bottom-wall'
                const isBallInvolved = bodyA === this.ball || bodyB === this.ball

                if (isBallInvolved && isBottomWall) {
                    // 直接结束游戏
                    this.handleGameEnd()
                }
            }
        })
    }

    private handleGameEnd() {
        if (!this.gameActive || !this.ball) return

        // 防止重复调用
        if (!this.gameActive) return
        this.gameActive = false

        try {
            // 立即停止小球运动
            Matter.Body.setStatic(this.ball, true)
            Matter.Body.setVelocity(this.ball, { x: 0, y: 0 })

            // 根据小球的当前位置判断奖品
            const ballX = this.ball.position.x
            const prize = this.prizeSlots.find(slot => Math.abs(slot.position.x - ballX) < slot.width / 2)
            this.currentPrize = prize ? prize.value : '没中奖'

            // 停止物理引擎，但保持小球可见
            Matter.Runner.stop(this.runner)

            // 触发游戏结束回调
            if (this.onGameEnd) {
                this.onGameEnd(this.currentPrize)
            }
        } catch (error) {
            console.error('Game end error:', error)
            if (this.onGameEnd) {
                this.onGameEnd('游戏异常')
            }
        }
    }

    startGame(powerLevel: number = 0.5) {
        if (this.gameActive) return
        this.gameActive = true

        // Remove any existing ball
        if (this.ball) {
            Matter.World.remove(this.world, this.ball)
            this.ball = null
        }

        // Create new ball
        const ballRadius = 10
        const ballOptions = {
            restitution: 0.8,
            friction: 0.05,
            density: 0.02,
            render: { fillStyle: '#f00' },
            collisionFilter: {
                group: 0,
                category: 0x0001,
                mask: 0xffffffff
            }
        }

        const ballX = this.canvas.width - ballRadius * 2
        const ballY = ballRadius * 2

        this.ball = Matter.Bodies.circle(ballX, ballY, ballRadius, ballOptions)
        Matter.World.add(this.world, this.ball)

        // Set initial velocity based on power level
        const baseVelocityX = -2.5
        const baseVelocityY = 0.5
        const extraVelocityX = -6 * powerLevel
        const extraVelocityY = 2.5 * powerLevel
        const randomFactor = 0.8
        const randomX = (Math.random() * 2 - 1) * randomFactor
        const randomY = (Math.random() * 2 - 1) * randomFactor

        const velocityX = baseVelocityX + extraVelocityX + randomX
        const velocityY = baseVelocityY + extraVelocityY + randomY

        Matter.Body.setVelocity(this.ball, {
            x: velocityX,
            y: velocityY
        })

        // Now start the physics engine
        Matter.Runner.run(this.runner, this.engine)
    }

    cleanup() {
        // 清理时才移除小球和其他物体
        if (this.ball) {
            Matter.World.remove(this.world, this.ball)
            this.ball = null
        }
        Matter.World.clear(this.world, false)
        Matter.Engine.clear(this.engine)
        Matter.Render.stop(this.render)
        Matter.Runner.stop(this.runner)
    }
}

export class SpringEngine {
    private canvas: HTMLCanvasElement
    private ctx: CanvasRenderingContext2D
    private springWidth: number = 30 // 弹簧宽度
    private springHeight: number = 80 // 弹簧自然高度
    private compression: number = 0 // 压缩量，向下为正
    private velocity: number = 0
    private isCompressing: boolean = false
    private capWidth: number = 40 // 弹簧帽宽度
    private capHeight: number = 8 // 弹簧帽高度

    // 物理参数调整
    private readonly springConstant: number = 0.25
    private readonly damping: number = 0.12
    private readonly maxCompression: number = 50
    private readonly compressionSpeed: number = 2.5

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas
        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error('无法获取 canvas context')
        this.ctx = ctx
    }

    init() {
        this.canvas.width = this.canvas.offsetWidth
        this.canvas.height = this.canvas.offsetHeight
        this.animate()
    }

    startCompressing() {
        this.isCompressing = true
    }

    release() {
        this.isCompressing = false
    }

    getPowerLevel(): number {
        return (this.compression / this.maxCompression) * 100
    }

    private updateSpring() {
        if (this.isCompressing) {
            this.compression = Math.min(this.compression + this.compressionSpeed, this.maxCompression)
        } else if (this.compression > 0) {
            // 直接用弹簧系数计算力
            const force = -this.springConstant * this.compression
            this.velocity += force
            this.velocity *= 1 - this.damping
            this.compression = Math.max(0, this.compression + this.velocity)
        }
    }

    private drawSpring() {
        const centerX = this.canvas.width / 2
        const bottomY = this.canvas.height - 10
        const currentHeight = this.springHeight - this.compression
        const topY = bottomY - currentHeight

        // 绘制上弹簧帽
        this.drawSpringCap(centerX, topY, true)

        // 绘制弹簧主体
        const waves = 10 // 调整波浪数量

        this.ctx.beginPath()
        this.ctx.moveTo(centerX, topY)

        // 使用贝塞尔曲线绘制更平滑的波浪
        const points = waves * 40 // 更密集的采样点
        for (let i = 0; i <= points; i++) {
            const progress = i / points
            const y = topY + progress * currentHeight

            // 使用三重正弦叠加创造更有机的形状
            const compressionScale = 1 - (this.compression / this.maxCompression) * 0.3
            const frequency = waves * Math.PI * 2
            const xOffset =
                (Math.sin(progress * frequency) * 0.7 +
                    Math.sin(progress * frequency * 2) * 0.2 +
                    Math.sin(progress * frequency * 0.5) * 0.1) *
                this.springWidth *
                0.5 *
                compressionScale

            // 使用二次贝塞尔曲线连接点，使线条更平滑
            if (i === 0) {
                this.ctx.moveTo(centerX + xOffset, y)
            } else {
                const prevProgress = (i - 1) / points
                const prevY = topY + prevProgress * currentHeight
                const prevXOffset =
                    (Math.sin(prevProgress * frequency) * 0.7 +
                        Math.sin(prevProgress * frequency * 2) * 0.2 +
                        Math.sin(prevProgress * frequency * 0.5) * 0.1) *
                    this.springWidth *
                    0.5 *
                    compressionScale

                const cpX = centerX + (prevXOffset + xOffset) / 2
                const cpY = (prevY + y) / 2

                this.ctx.quadraticCurveTo(cpX, cpY, centerX + xOffset, y)
            }
        }

        // 设置弹簧样式
        this.ctx.strokeStyle = '#4a90e2'
        this.ctx.lineWidth = 4.5
        this.ctx.lineCap = 'round'
        this.ctx.lineJoin = 'round'
        this.ctx.stroke()

        // 绘制下弹簧帽
        this.drawSpringCap(centerX, bottomY, false)
    }

    // 绘制弹簧帽
    private drawSpringCap(x: number, y: number, isTop: boolean) {
        // 绘制主体矩形，使用与弹簧相同的颜色
        this.ctx.fillStyle = '#4a90e2'
        this.ctx.fillRect(x - this.capWidth / 2, y - (isTop ? this.capHeight : 0), this.capWidth, this.capHeight)

        // 绘制装饰线条，使用稍深一点的相近颜色
        this.ctx.beginPath()
        this.ctx.strokeStyle = '#3476c5' // 深一点的蓝色
        this.ctx.lineWidth = 2

        const lineY = y - (isTop ? this.capHeight / 2 : -this.capHeight / 2)
        this.ctx.moveTo(x - this.capWidth / 3, lineY)
        this.ctx.lineTo(x + this.capWidth / 3, lineY)
        this.ctx.stroke()
    }

    // 动画循环
    private animate = () => {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
        this.updateSpring()
        this.drawSpring()
        requestAnimationFrame(this.animate)
    }

    cleanup() {
        // 暂时没有需要清理的资源
    }
}
