interface Bubble {
    x: number
    y: number
    color: string
    radius: number
    isMatched?: boolean
    row: number
    col: number
    exploding?: boolean
    explosionProgress?: number
    // 添加掉落相关的属性
    falling?: boolean
    velocityY: number // 改为必需属性
    velocityX: number // 改为必需属性
}

interface Particle {
    x: number
    y: number
    vx: number
    vy: number
    radius: number
    color: string
    alpha: number
    life: number
    scale: number // 添加缩放属性
}

const TIME_MAX = 180

export class GameEngine {
    private canvas: HTMLCanvasElement
    private ctx: CanvasRenderingContext2D
    private bubbles: Bubble[][] = []
    private currentBubble: Bubble | null = null
    private nextBubble: Bubble | null = null
    private shooterX: number
    private shooterY: number
    private shooterAngle: number = Math.PI / 2
    private isGameOver: boolean = false
    private score: number = 0
    private timeLeft: number = TIME_MAX
    private gameStartTime: number = 0
    private lastUpdateTime: number = 0
    private animationFrameId: number | null = null
    private particles: Particle[] = []
    private fallingBubbles: Bubble[] = [] // 添加一个专门存储掉落中泡泡的数组
    private BUBBLE_RADIUS = 1 // 改为实例变量，根据屏幕宽度计算
    private ROWS = 12
    private COLS = 0 // 改为实例变量，根据屏幕宽度计算
    private readonly COLORS = ['#FF5555', '#5555FF', '#55AA55', '#FFFF55', '#AA55AA', '#FFA500']
    private readonly PARTICLE_COUNT = 40 // 减少粒子数量以提高性能
    private readonly PARTICLE_LIFE = 0.6 // 缩短粒子生命周期使动画更快
    private readonly PARTICLE_SPEED = 400 // 增加粒子速度使效果更明显
    private readonly MIN_BUBBLE_RADIUS = 15 // 最小泡泡半径
    private readonly MAX_BUBBLE_RADIUS = 25 // 最大泡泡半径
    private readonly TARGET_COLS_MIN = 8 // 最少列数
    private readonly TARGET_COLS_MAX = 16 // 最多列数

    // Callbacks
    public onScoreChange: (score: number) => void = () => {}
    public onTimeChange: (timeLeft: number) => void = () => {}
    public onGameOver: () => void = () => {}

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas
        const context = canvas.getContext('2d')
        if (!context) {
            throw new Error('Cannot get 2d context')
        }
        this.ctx = context
        
        // 初始化画布大小
        this.resizeCanvas()
        
        // 初始化尺寸相关的属性
        this.calculateDimensions()
        
        this.shooterX = canvas.width / 2
        this.shooterY = canvas.height - 40
        
        // 监听窗口大小变化
        window.addEventListener('resize', this.handleResize.bind(this))
    }

    private calculateDimensions() {
        // 根据屏幕宽度计算合适的列数和泡泡大小
        const maxWidth = this.canvas.width * 0.95 // 预留一些边距
        
        // 先尝试使用目标列数计算泡泡大小
        let targetCols = Math.floor(maxWidth / (this.MAX_BUBBLE_RADIUS * 2))
        
        // 确保列数在合理范围内
        targetCols = Math.max(this.TARGET_COLS_MIN, Math.min(targetCols, this.TARGET_COLS_MAX))
        
        // 根据列数反推泡泡大小
        let bubbleRadius = Math.floor(maxWidth / (targetCols * 2))
        
        // 确保泡泡大小在合理范围内
        bubbleRadius = Math.max(this.MIN_BUBBLE_RADIUS, Math.min(bubbleRadius, this.MAX_BUBBLE_RADIUS))
        
        // 最终确定列数和泡泡大小
        this.COLS = targetCols
        this.BUBBLE_RADIUS = bubbleRadius
        
        console.log(`Screen width: ${this.canvas.width}, Columns: ${this.COLS}, Bubble radius: ${this.BUBBLE_RADIUS}`);
    }

    private handleResize() {
        // 保存当前的泡泡状态
        const oldBubbles = this.bubbles
        const oldCols = this.COLS
        const oldRadius = this.BUBBLE_RADIUS
        
        // 更新画布尺寸
        this.resizeCanvas()
        
        // 重新计算维度
        this.calculateDimensions()
        
        // 如果尺寸发生变化，需要重新排列泡泡
        if (oldCols !== this.COLS || oldRadius !== this.BUBBLE_RADIUS) {
            // 创建新的泡泡数组
            const newBubbles: Bubble[][] = []
            
            // 遍历旧的泡泡并转移到新位置
            for (let row = 0; row < this.ROWS; row++) {
                newBubbles[row] = []
                for (let col = 0; col < this.COLS; col++) {
                    if (col < oldCols && oldBubbles[row]?.[col]) {
                        const oldBubble = oldBubbles[row][col]
                        if (oldBubble) {
                            // 计算新的位置
                            const x = col * (this.BUBBLE_RADIUS * 2) + this.BUBBLE_RADIUS + (row % 2 ? this.BUBBLE_RADIUS : 0)
                            const y = row * (this.BUBBLE_RADIUS * 1.8) + this.BUBBLE_RADIUS
                            
                            newBubbles[row][col] = {
                                ...oldBubble,
                                x,
                                y,
                                radius: this.BUBBLE_RADIUS
                            }
                        }
                    }
                }
            }
            
            this.bubbles = newBubbles
        }
        
        // 更新发射器位置
        this.shooterX = this.canvas.width / 2
        this.shooterY = this.canvas.height - 40
        
        // 如果当前有泡泡在发射器中，更新它的位置
        if (this.currentBubble) {
            this.currentBubble.x = this.shooterX
            this.currentBubble.y = this.shooterY
            this.currentBubble.radius = this.BUBBLE_RADIUS
        }
        
        // 如果有下一个泡泡，更新它的位置
        if (this.nextBubble) {
            this.nextBubble.x = this.shooterX
            this.nextBubble.y = this.shooterY
            this.nextBubble.radius = this.BUBBLE_RADIUS
        }
        
        // 更新掉落中的泡泡大小
        for (const bubble of this.fallingBubbles) {
            bubble.radius = this.BUBBLE_RADIUS
        }
    }

    private resizeCanvas() {
        this.canvas.width = window.innerWidth
        this.canvas.height = window.innerHeight
    }

    public startGame() {
        this.initializeBoard()
        this.createNextBubble()
        this.loadCurrentBubble()
        this.gameStartTime = Date.now()
        this.lastUpdateTime = this.gameStartTime
        this.isGameOver = false
        this.score = 0
        this.timeLeft = TIME_MAX
        this.particles = [] // 确保重置粒子数组
        this.fallingBubbles = [] // 重置掉落的泡泡数组
        this.update()
    }

    private initializeBoard() {
        // Initialize grid with initial bubbles (first 5 rows)
        for (let row = 0; row < this.ROWS; row++) {
            this.bubbles[row] = []
            for (let col = 0; col < this.COLS; col++) {
                if (row < 5) {
                    const x = col * (this.BUBBLE_RADIUS * 2) + this.BUBBLE_RADIUS + (row % 2 ? this.BUBBLE_RADIUS : 0)
                    const y = row * (this.BUBBLE_RADIUS * 1.8) + this.BUBBLE_RADIUS
                    this.bubbles[row][col] = {
                        x,
                        y,
                        color: this.COLORS[Math.floor(Math.random() * this.COLORS.length)],
                        radius: this.BUBBLE_RADIUS,
                        row,
                        col,
                        velocityY: 0,
                        velocityX: 0
                    }
                }
            }
        }
    }

    private createNextBubble() {
        this.nextBubble = {
            x: this.shooterX,
            y: this.shooterY,
            color: this.COLORS[Math.floor(Math.random() * this.COLORS.length)],
            radius: this.BUBBLE_RADIUS,
            row: -1,
            col: -1,
            velocityY: 0,
            velocityX: 0
        }
    }

    private loadCurrentBubble() {
        this.currentBubble = this.nextBubble
        this.createNextBubble()
    }

    public setShootingAngle(mouseX: number, mouseY: number) {
        const dx = mouseX - this.shooterX
        const dy = this.shooterY - mouseY
        this.shooterAngle = Math.atan2(dy, dx)

        // Limit the angle between 0 and PI
        this.shooterAngle = Math.max(0, Math.min(Math.PI, this.shooterAngle))
    }

    public shoot() {
        if (!this.currentBubble || this.isGameOver) return

        const speed = 15
        let vx = Math.cos(this.shooterAngle) * speed
        let vy = -Math.sin(this.shooterAngle) * speed

        const bubble = this.currentBubble
        const animate = () => {
            bubble.x += vx
            bubble.y += vy

            // Check wall collisions
            if (bubble.x <= bubble.radius || bubble.x >= this.canvas.width - bubble.radius) {
                vx *= -1
            }

            // Check collision with existing bubbles
            const collision = this.checkCollision(bubble)
            if (collision) {
                this.snapToGrid(bubble)
                const matches = this.findMatches(bubble)
                if (matches.length >= 3) {
                    this.removeBubbles(matches)
                    this.score += matches.length * 10
                    this.onScoreChange(this.score)
                }
                this.loadCurrentBubble()
                return
            }

            // Continue animation if no collision
            if (bubble.y > bubble.radius) {
                requestAnimationFrame(animate)
            } else {
                this.snapToGrid(bubble)
                this.loadCurrentBubble()
            }
        }

        animate()
    }

    private checkCollision(bubble: Bubble): Bubble | null {
        for (const row of this.bubbles) {
            for (const existingBubble of row) {
                if (!existingBubble) continue
                const dx = bubble.x - existingBubble.x
                const dy = bubble.y - existingBubble.y
                const distance = Math.sqrt(dx * dx + dy * dy)
                if (distance < bubble.radius * 2) {
                    return existingBubble
                }
            }
        }
        return null
    }

    private snapToGrid(bubble: Bubble) {
        // 找到最近的碰撞点
        let closestRow = -1
        let closestCol = -1
        let minDistance = Infinity
        let attachmentPoint = { x: 0, y: 0 }

        // 检查所有可能的网格位置
        for (let row = 0; row < this.ROWS; row++) {
            for (let col = 0; col < this.COLS; col++) {
                const gridX = col * (this.BUBBLE_RADIUS * 2) + this.BUBBLE_RADIUS + (row % 2 ? this.BUBBLE_RADIUS : 0)
                const gridY = row * (this.BUBBLE_RADIUS * 1.8) + this.BUBBLE_RADIUS

                // 计算到当前位置的距离
                const dx = bubble.x - gridX
                const dy = bubble.y - gridY
                const distance = Math.sqrt(dx * dx + dy * dy)

                // 检查这个位置是否为空且有相邻的泡泡
                if (distance < minDistance && !this.bubbles[row]?.[col] && this.hasAdjacentBubble(row, col)) {
                    minDistance = distance
                    closestRow = row
                    closestCol = col
                    attachmentPoint.x = gridX
                    attachmentPoint.y = gridY
                }
            }
        }

        // 如果找到有效的位置
        if (closestRow >= 0 && closestCol >= 0) {
            if (!this.bubbles[closestRow]) {
                this.bubbles[closestRow] = []
            }

            bubble.row = closestRow
            bubble.col = closestCol
            bubble.x = attachmentPoint.x
            bubble.y = attachmentPoint.y

            this.bubbles[closestRow][closestCol] = bubble
        } else {
            // 如果没有找到有效位置，尝试放置在第一行
            const col = Math.round(bubble.x / (this.BUBBLE_RADIUS * 2))
            if (!this.bubbles[0]) {
                this.bubbles[0] = []
            }
            bubble.row = 0
            bubble.col = Math.max(0, Math.min(col, this.COLS - 1))
            bubble.x = bubble.col * (this.BUBBLE_RADIUS * 2) + this.BUBBLE_RADIUS
            bubble.y = this.BUBBLE_RADIUS
            this.bubbles[0][bubble.col] = bubble
        }
    }

    private hasAdjacentBubble(row: number, col: number): boolean {
        const dirs =
            row % 2
                ? [
                      [0, 1],
                      [0, -1],
                      [-1, 0],
                      [-1, 1],
                      [1, 0],
                      [1, 1]
                  ]
                : [
                      [0, 1],
                      [0, -1],
                      [-1, -1],
                      [-1, 0],
                      [1, -1],
                      [1, 0]
                  ]

        for (const [dr, dc] of dirs) {
            const newRow = row + dr
            const newCol = col + dc
            if (
                newRow >= 0 &&
                newRow < this.ROWS &&
                newCol >= 0 &&
                newCol < this.COLS &&
                this.bubbles[newRow]?.[newCol]
            ) {
                return true
            }
        }

        return false
    }

    private findMatches(bubble: Bubble): Bubble[] {
        const matches: Bubble[] = []
        const visited = new Set<string>()

        const check = (row: number, col: number, color: string) => {
            const key = `${row},${col}`
            if (visited.has(key)) return
            visited.add(key)

            const current = this.bubbles[row]?.[col]
            if (!current || current.color !== color) return

            matches.push(current)

            // Check neighbors
            const dirs =
                row % 2
                    ? [
                          [0, 1],
                          [0, -1],
                          [-1, 0],
                          [-1, 1],
                          [1, 0],
                          [1, 1]
                      ]
                    : [
                          [0, 1],
                          [0, -1],
                          [-1, -1],
                          [-1, 0],
                          [1, -1],
                          [1, 0]
                      ]

            for (const [dr, dc] of dirs) {
                const newRow = row + dr
                const newCol = col + dc
                if (newRow >= 0 && newRow < this.ROWS && newCol >= 0 && newCol < this.COLS) {
                    check(newRow, newCol, color)
                }
            }
        }

        check(bubble.row, bubble.col, bubble.color)
        // 只有当匹配的泡泡数量大于等于3个时才返回匹配结果
        return matches.length >= 3 ? matches : []
    }

    private removeBubbles(bubbles: Bubble[]) {
        // 立即检查悬浮泡泡，不等待爆炸动画
        const detachedBubbles = this.findDetachedBubbles(bubbles)
        console.log('检测到悬浮泡泡数量:', detachedBubbles.length); // 调试日志
        
        // 为每个要消除的泡泡创建强化的爆炸效果
        bubbles.forEach((bubble, index) => {
            // 添加微小的延迟，使爆炸效果更有层次感
            setTimeout(() => {
                bubble.exploding = true
                bubble.explosionProgress = 0
                this.createExplosionParticles(bubble)

                // 在每个泡泡开始爆炸时就移除它，而不是等待所有泡泡爆炸完成
                if (index === bubbles.length - 1) {
                    // 在最后一个泡泡爆炸时设置所有爆炸泡泡为null
                    bubbles.forEach(b => {
                        if (this.bubbles[b.row]?.[b.col] === b) {
                            this.bubbles[b.row][b.col] = null as any
                        }
                    })
                }

                // 在第一个泡泡爆炸时就开始处理悬浮泡泡
                if (index === 0 && detachedBubbles.length > 0) {
                    // 直接开始掉落动画
                    detachedBubbles.forEach((detachedBubble) => {
                        if (this.bubbles[detachedBubble.row]?.[detachedBubble.col] === detachedBubble) {
                            // 设置泡泡为掉落状态
                            detachedBubble.falling = true;
                            
                            // 给不同的泡泡设置不同的初始速度，使掉落更自然
                            detachedBubble.velocityY = 1 + Math.random() * 2; 
                            detachedBubble.velocityX = (Math.random() - 0.5) * 4;
                            
                            // 创建掉落开始的爆炸效果
                            this.createSmallExplosion(detachedBubble.x, detachedBubble.y, detachedBubble.color);
                            
                            // 从网格中移除泡泡
                            this.bubbles[detachedBubble.row][detachedBubble.col] = null as any;
                            
                            // 将泡泡添加到掉落数组中
                            this.fallingBubbles.push(detachedBubble);
                        }
                    });
                }
            }, index * 30); // 减少爆炸延迟，使动画更快
        });
    }

    private findDetachedBubbles(excludeBubbles: Bubble[]): Bubble[] {
        const connected = new Set<string>()
        const detached: Bubble[] = []

        // 清理 excludeBubbles 数组中已经被标记为 null 的泡泡
        const validExcludeBubbles = excludeBubbles.filter(bubble => this.bubbles[bubble.row]?.[bubble.col] === bubble)

        // 标记所有与顶部相连的泡泡
        for (let col = 0; col < this.COLS; col++) {
            if (this.bubbles[0]?.[col] && !validExcludeBubbles.includes(this.bubbles[0][col])) {
                this.markConnected(0, col, connected, validExcludeBubbles)
            }
        }

        // 找出所有未连接的泡泡
        for (let row = 0; row < this.ROWS; row++) {
            for (let col = 0; col < this.COLS; col++) {
                const bubble = this.bubbles[row]?.[col]
                if (
                    bubble &&
                    !connected.has(`${row},${col}`) &&
                    !validExcludeBubbles.includes(bubble) &&
                    !bubble.falling &&
                    !bubble.exploding
                ) {
                    detached.push(bubble)
                }
            }
        }

        return detached
    }

    private createSmallExplosion(x: number, y: number, color: string) {
        // 创建小型爆炸粒子
        for (let i = 0; i < 15; i++) {
            const angle = Math.PI * 2 * Math.random()
            const speed = this.PARTICLE_SPEED * 0.5 * (0.5 + Math.random() * 0.5)
            
            this.particles.push({
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 200 * Math.random(),
                radius: this.BUBBLE_RADIUS * (0.2 + Math.random() * 0.2),
                color,
                alpha: 0.8,
                life: this.PARTICLE_LIFE * 0.4,
                scale: 1.5
            })
        }
        
        // 添加一个小型光环
        this.particles.push({
            x,
            y,
            vx: 0,
            vy: 0,
            radius: this.BUBBLE_RADIUS * 2,
            color: '#ffffff',
            alpha: 0.7,
            life: this.PARTICLE_LIFE * 0.2,
            scale: 2
        })
    }

    private createExplosionParticles(bubble: Bubble) {
        const particleCount = bubble.falling ? 25 : this.PARTICLE_COUNT

        // 创建主爆炸粒子 - 使用更强的颜色和更大的速度
        for (let i = 0; i < particleCount; i++) {
            const angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.8
            const speed = (bubble.falling ? 250 : this.PARTICLE_SPEED) * (0.8 + Math.random() * 0.4)

            // 计算粒子颜色 - 增加明度
            let particleColor = bubble.color
            if (particleColor.startsWith('rgb')) {
                particleColor = particleColor.replace('rgb', 'rgba').replace(')', ', 1)')
            }

            this.particles.push({
                x: bubble.x,
                y: bubble.y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - (bubble.falling ? 150 : 400), // 增加垂直初速度
                radius: bubble.radius * (0.5 + Math.random() * 0.3),
                color: particleColor,
                alpha: 1,
                life: this.PARTICLE_LIFE * (0.6 + Math.random() * 0.4),
                scale: 3.0 // 增大粒子尺寸
            })
        }

        // 添加明亮的爆炸光束 - 增加数量和亮度
        for (let i = 0; i < 12; i++) {
            const angle = (Math.PI * 2 * i) / 12 + (Math.random() - 0.5) * 0.2
            const speed = this.PARTICLE_SPEED * 1.8

            this.particles.push({
                x: bubble.x,
                y: bubble.y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 250,
                radius: bubble.radius * 1.5,
                color: '#ffffff',
                alpha: 1,
                life: this.PARTICLE_LIFE * 0.4,
                scale: 3.5
            })
        }

        // 添加大型爆炸光环
        this.particles.push({
            x: bubble.x,
            y: bubble.y,
            vx: 0,
            vy: 0,
            radius: bubble.radius * 4,
            color: '#ffffff',
            alpha: 1,
            life: this.PARTICLE_LIFE * 0.25,
            scale: 5
        })
    }

    private markConnected(row: number, col: number, connected: Set<string>, excludeBubbles: Bubble[]) {
        const key = `${row},${col}`
        if (connected.has(key)) return

        const bubble = this.bubbles[row]?.[col]
        if (!bubble || excludeBubbles.includes(bubble)) return

        connected.add(key)

        const dirs =
            row % 2
                ? [
                      [0, 1],
                      [0, -1],
                      [-1, 0],
                      [-1, 1],
                      [1, 0],
                      [1, 1]
                  ]
                : [
                      [0, 1],
                      [0, -1],
                      [-1, -1],
                      [-1, 0],
                      [1, -1],
                      [1, 0]
                  ]

        for (const [dr, dc] of dirs) {
            const newRow = row + dr
            const newCol = col + dc
            if (newRow >= 0 && newRow < this.ROWS && newCol >= 0 && newCol < this.COLS) {
                this.markConnected(newRow, newCol, connected, excludeBubbles)
            }
        }
    }

    private updateAnimations(deltaTime: number) {
        const deltaSeconds = deltaTime / 1000
        const gravity = 3000 // 增加重力效果使下落更快

        // 更新粒子效果
        this.particles = this.particles.filter(particle => {
            particle.x += particle.vx * deltaSeconds
            particle.y += particle.vy * deltaSeconds
            
            // 对彩色粒子应用重力
            if (particle.color !== '#ffffff') {
                particle.vy += gravity * deltaSeconds * 0.5
            }
            
            // 使用三次方函数使效果更加明显
            const lifeRatio = particle.life / this.PARTICLE_LIFE
            particle.scale = particle.scale * (0.3 + lifeRatio * 0.7)
            particle.alpha = Math.pow(lifeRatio, 1.5) * 2 // 增加初始亮度，使用指数衰减
            
            particle.life -= deltaSeconds
            return particle.life > 0
        })

        const bubblestoRemove: [number, number][] = []

        // 处理网格中爆炸的泡泡
        for (let row = 0; row < this.ROWS; row++) {
            for (let col = 0; col < this.COLS; col++) {
                const bubble = this.bubbles[row]?.[col]
                if (!bubble) continue

                if (bubble.falling) {
                    // 如果在网格中还有标记为falling的泡泡，移动到fallingBubbles数组
                    this.fallingBubbles.push(bubble);
                    this.bubbles[row][col] = null as any;
                } else if (bubble.exploding) {
                    // 更新爆炸动画进度
                    bubble.explosionProgress = Math.min(1, (bubble.explosionProgress || 0) + deltaSeconds * 3)
                    if (bubble.explosionProgress >= 1) {
                        bubblestoRemove.push([row, col])
                    }
                }
            }
        }

        // 移除完成爆炸的泡泡
        for (const [row, col] of bubblestoRemove) {
            if (this.bubbles[row]?.[col]?.exploding) {
                this.bubbles[row][col] = null as any
            }
        }

        // 更新掉落中的泡泡
        const fallingBubblesToKeep: Bubble[] = [];
        
        for (const bubble of this.fallingBubbles) {
            // 更新掉落的泡泡位置，添加加速度效果
            bubble.velocityY += gravity * deltaSeconds * 0.8; // 增加重力影响使下落更加明显
            bubble.y += bubble.velocityY * deltaSeconds;
            bubble.x += bubble.velocityX * deltaSeconds;
            
            // 添加水平阻力
            bubble.velocityX *= 0.98;
            
            // 添加旋转效果的拖尾粒子
            if (Math.random() < 0.6) { // 增加粒子生成频率
                const trailAngle = Math.atan2(bubble.velocityY, bubble.velocityX) - Math.PI;
                const trailDistance = Math.random() * bubble.radius * 0.8;
                const trailX = bubble.x + Math.cos(trailAngle) * trailDistance;
                const trailY = bubble.y + Math.sin(trailAngle) * trailDistance;
                
                this.particles.push({
                    x: trailX,
                    y: trailY,
                    vx: (Math.random() - 0.5) * 50,
                    vy: -Math.random() * 60 - 40,
                    radius: bubble.radius * 0.25,
                    color: bubble.color,
                    alpha: 0.7 + Math.random() * 0.3,
                    life: 0.3 + Math.random() * 0.2,
                    scale: 0.8 + Math.random() * 0.4
                });
            }

            // 检查是否到达画布底部触发爆炸
            if (bubble.y > this.canvas.height - bubble.radius) {
                bubble.falling = false;
                bubble.exploding = true;
                bubble.explosionProgress = 0;
                
                console.log('泡泡落地，创建爆炸效果'); // 调试日志
                
                // 为掉落到底的泡泡创建更强烈的爆炸效果
                this.createLandingExplosion(bubble);
                
                // 添加加分效果
                this.score += 5;
                this.onScoreChange(this.score);
            }
            // 检查是否撞到画布侧边
            else if (bubble.x <= bubble.radius || bubble.x >= this.canvas.width - bubble.radius) {
                bubble.velocityX *= -0.8; // 反弹，但损失一些能量
                
                // 修正位置
                bubble.x = bubble.x <= bubble.radius ? 
                    bubble.radius : this.canvas.width - bubble.radius;
                    
                // 添加碰撞粒子效果
                this.createBounceEffect(bubble);
            }
            
            // 如果泡泡没有爆炸，保留在数组中
            if (!bubble.exploding) {
                fallingBubblesToKeep.push(bubble);
            }
        }
        
        // 更新掉落泡泡数组
        this.fallingBubbles = fallingBubblesToKeep;

        // 更新泡泡的浮动动画
        const floatAmplitude = 2
        const floatSpeed = 0.002

        for (const row of this.bubbles) {
            for (const bubble of row) {
                if (!bubble || bubble.exploding || bubble.falling) continue
                const time = (this.lastUpdateTime + deltaTime) * floatSpeed
                const offset = Math.sin(time + bubble.row * 0.5) * floatAmplitude
                bubble.y = bubble.row * (this.BUBBLE_RADIUS * 1.8) + this.BUBBLE_RADIUS + offset
            }
        }
    }
    
    // 强化落地爆炸效果
    private createLandingExplosion(bubble: Bubble) {
        console.log('创建落地爆炸效果'); // 调试日志
        
        // 创建冲击波效果
        this.particles.push({
            x: bubble.x,
            y: this.canvas.height - 5,
            vx: 0,
            vy: 0,
            radius: bubble.radius * 7, // 增大冲击波尺寸
            color: '#ffffff',
            alpha: 0.9,
            life: this.PARTICLE_LIFE * 0.6,
            scale: 4.0
        })
        
        // 添加水平扩散粒子
        for (let i = 0; i < 30; i++) { // 增加粒子数量
            const angle = (Math.random() - 0.5) * Math.PI * 1.0 - Math.PI / 2
            const speed = this.PARTICLE_SPEED * (0.6 + Math.random() * 0.8)
            
            this.particles.push({
                x: bubble.x,
                y: this.canvas.height - 5,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed * 1.2, // 增加垂直速度
                radius: bubble.radius * (0.3 + Math.random() * 0.4),
                color: bubble.color,
                alpha: 0.9 + Math.random() * 0.1,
                life: this.PARTICLE_LIFE * (0.4 + Math.random() * 0.5),
                scale: 2.0 + Math.random() * 1.5
            })
        }
        
        // 添加上升光束
        for (let i = 0; i < 15; i++) { // 增加光束数量
            const angle = (-0.3 * Math.random() - 0.85) * Math.PI
            const speed = this.PARTICLE_SPEED * 2.0 // 增加光束速度
            
            this.particles.push({
                x: bubble.x + (Math.random() - 0.5) * 20, // 添加随机水平位置
                y: this.canvas.height - 5,
                vx: Math.cos(angle) * speed * (0.7 + Math.random() * 0.6),
                vy: Math.sin(angle) * speed * (0.7 + Math.random() * 0.6),
                radius: bubble.radius * (0.3 + Math.random() * 0.4),
                color: Math.random() > 0.5 ? '#ffffff' : bubble.color, // 随机颜色
                alpha: 0.8 + Math.random() * 0.2,
                life: this.PARTICLE_LIFE * (0.3 + Math.random() * 0.3),
                scale: 2.5
            })
        }
        
        // 添加灰尘效果
        for (let i = 0; i < 20; i++) {
            const angle = (Math.random() - 0.5) * Math.PI - Math.PI / 2
            const speed = 50 + Math.random() * 150
            
            this.particles.push({
                x: bubble.x + (Math.random() - 0.5) * 30,
                y: this.canvas.height - Math.random() * 10,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                radius: bubble.radius * 0.15,
                color: '#cccccc',
                alpha: 0.6 + Math.random() * 0.4,
                life: this.PARTICLE_LIFE * (0.5 + Math.random() * 0.5),
                scale: 0.8 + Math.random() * 0.5
            })
        }
    }

    private createBounceEffect(bubble: Bubble) {
        // 创建简单的碰撞粒子
        for (let i = 0; i < 10; i++) {
            const angle = bubble.x <= bubble.radius ? 
                -Math.PI/2 + Math.random() * Math.PI : 
                Math.PI/2 + Math.random() * Math.PI
            
            const speed = this.PARTICLE_SPEED * 0.3 * (0.5 + Math.random() * 0.5)
            
            this.particles.push({
                x: bubble.x,
                y: bubble.y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                radius: bubble.radius * 0.15,
                color: bubble.color,
                alpha: 0.6,
                life: this.PARTICLE_LIFE * 0.2,
                scale: 1.0
            })
        }
    }

    private render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

        // 绘制瞄准线和普通泡泡
        this.drawGuideLine()
        
        // 首先绘制普通泡泡
        for (const row of this.bubbles) {
            for (const bubble of row) {
                if (!bubble || bubble.exploding) continue
                this.drawBubble(bubble)
            }
        }

        // 使用 screen 混合模式来增强发光效果
        this.ctx.save()
        this.ctx.globalCompositeOperation = 'screen'
        
        // 绘制粒子效果
        for (const particle of this.particles) {
            this.ctx.globalAlpha = particle.alpha
            
            // 为粒子添加发光渐变
            const gradient = this.ctx.createRadialGradient(
                particle.x, particle.y, 0,
                particle.x, particle.y, particle.radius * particle.scale
            )
            
            if (particle.color === '#ffffff') {
                gradient.addColorStop(0, 'rgba(255, 255, 255, 0.95)')
                gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.5)')
                gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
            } else {
                gradient.addColorStop(0, particle.color)
                gradient.addColorStop(0.4, particle.color.replace(')', ', 0.4)'))
                gradient.addColorStop(1, particle.color.replace(')', ', 0)'))
            }
            
            this.ctx.beginPath()
            this.ctx.arc(
                particle.x,
                particle.y,
                particle.radius * particle.scale,
                0,
                Math.PI * 2
            )
            
            this.ctx.fillStyle = gradient
            this.ctx.fill()
        }

        // 绘制掉落中的泡泡
        for (const bubble of this.fallingBubbles) {
            this.drawFallingBubble(bubble);
        }

        // 绘制爆炸中的泡泡
        for (const row of this.bubbles) {
            for (const bubble of row) {
                if (!bubble?.exploding) continue
                this.drawExplodingBubble(bubble)
            }
        }
        
        // 绘制掉落且爆炸中的泡泡
        for (const bubble of this.fallingBubbles) {
            if (bubble.exploding) {
                this.drawExplodingBubble(bubble);
            }
        }
        
        this.ctx.restore()

        // 绘制当前和下一个泡泡
        if (this.currentBubble) {
            this.drawBubble(this.currentBubble)
        }
        if (this.nextBubble) {
            const previewBubble = { ...this.nextBubble }
            previewBubble.x = this.shooterX + 50
            previewBubble.y = this.shooterY
            this.drawBubble(previewBubble)
        }

        // 绘制发射器
        this.drawShooter()
    }

    // 添加专门绘制下落泡泡的方法
    private drawFallingBubble(bubble: Bubble) {
        // 正常绘制泡泡
        this.ctx.beginPath()
        this.ctx.arc(bubble.x, bubble.y, bubble.radius, 0, Math.PI * 2)
        this.ctx.fillStyle = bubble.color
        this.ctx.fill()
        
        // 添加运动模糊效果
        this.ctx.beginPath()
        this.ctx.arc(
            bubble.x - bubble.velocityX * 0.02,
            bubble.y - bubble.velocityY * 0.02,
            bubble.radius * 0.9,
            0,
            Math.PI * 2
        )
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'
        this.ctx.fill()

        // 添加光晕效果
        const glow = this.ctx.createRadialGradient(
            bubble.x, bubble.y, bubble.radius * 0.5,
            bubble.x, bubble.y, bubble.radius * 2
        )
        glow.addColorStop(0, 'rgba(255, 255, 255, 0)')
        glow.addColorStop(0.4, 'rgba(255, 255, 255, 0)')
        glow.addColorStop(0.7, bubble.color.replace(')', ', 0.1)'))
        glow.addColorStop(1, 'rgba(255, 255, 255, 0)')
        
        this.ctx.beginPath()
        this.ctx.arc(bubble.x, bubble.y, bubble.radius * 2, 0, Math.PI * 2)
        this.ctx.fillStyle = glow
        this.ctx.fill()
    }

    private drawBubble(bubble: Bubble) {
        this.ctx.beginPath()
        this.ctx.arc(bubble.x, bubble.y, bubble.radius, 0, Math.PI * 2)
        this.ctx.fillStyle = bubble.color
        this.ctx.fill()

        // Add shine effect
        this.ctx.beginPath()
        this.ctx.arc(
            bubble.x - bubble.radius * 0.3,
            bubble.y - bubble.radius * 0.3,
            bubble.radius * 0.2,
            0,
            Math.PI * 2
        )
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
        this.ctx.fill()
    }

    private drawExplodingBubble(bubble: Bubble) {
        if (bubble.explosionProgress === undefined) return

        const scale = 1 + bubble.explosionProgress * 1.5
        const alpha = Math.max(0, 1 - bubble.explosionProgress * 1.2)

        this.ctx.save()
        this.ctx.globalAlpha = alpha
        
        // 绘制发光效果
        const gradient = this.ctx.createRadialGradient(
            bubble.x, bubble.y, 0,
            bubble.x, bubble.y, bubble.radius * (1 + bubble.explosionProgress * 2)
        )
        gradient.addColorStop(0, bubble.color)
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
        
        this.ctx.beginPath()
        this.ctx.arc(bubble.x, bubble.y, bubble.radius * (1 + bubble.explosionProgress * 2), 0, Math.PI * 2)
        this.ctx.fillStyle = gradient
        this.ctx.fill()

        // 绘制主体
        this.ctx.beginPath()
        this.ctx.arc(bubble.x, bubble.y, bubble.radius * scale, 0, Math.PI * 2)
        this.ctx.fillStyle = bubble.color
        
        // 增强发光效果
        this.ctx.shadowBlur = 50
        this.ctx.shadowColor = bubble.color
        this.ctx.fill()

        // 绘制内部光环
        this.ctx.beginPath()
        this.ctx.arc(
            bubble.x,
            bubble.y,
            bubble.radius * (0.6 + bubble.explosionProgress * 0.8),
            0,
            Math.PI * 2
        )
        this.ctx.strokeStyle = 'white'
        this.ctx.lineWidth = 4 * (1 - bubble.explosionProgress)
        this.ctx.stroke()

        // 绘制外部爆炸光环
        this.ctx.beginPath()
        this.ctx.arc(
            bubble.x,
            bubble.y,
            bubble.radius * (1 + bubble.explosionProgress * 5),
            0,
            Math.PI * 2
        )
        this.ctx.strokeStyle = bubble.color
        this.ctx.lineWidth = 8 * (1 - bubble.explosionProgress)
        this.ctx.stroke()

        this.ctx.restore()
    }

    private drawGuideLine() {
        if (!this.currentBubble) return

        const startX = this.shooterX
        const startY = this.shooterY
        let x = startX
        let y = startY
        let dx = Math.cos(this.shooterAngle) * 20
        let dy = -Math.sin(this.shooterAngle) * 20

        this.ctx.beginPath()
        this.ctx.moveTo(startX, startY)
        this.ctx.setLineDash([5, 5])
        this.ctx.strokeStyle = this.currentBubble.color.replace(')', ', 0.5)')
        this.ctx.lineWidth = 2

        let foundCollision = false
        let maxIterations = 1000 // 增加最大迭代次数，确保线可以到达目标
        let iterations = 0
        let maxBounces = 5
        let bounceCount = 0

        while (!foundCollision && iterations < maxIterations && bounceCount < maxBounces) {
            // 计算下一个点，使用更大的步长以加快射线检测
            let nextX = x + dx
            let nextY = y + dy

            // 检查墙壁碰撞
            if (nextX <= this.currentBubble.radius) {
                nextX = this.currentBubble.radius
                dx = Math.abs(dx)
                bounceCount++
            } else if (nextX >= this.canvas.width - this.currentBubble.radius) {
                nextX = this.canvas.width - this.currentBubble.radius
                dx = -Math.abs(dx)
                bounceCount++
            }

            // 检查顶部边界碰撞
            if (nextY <= this.currentBubble.radius) {
                foundCollision = true
                nextY = this.currentBubble.radius
            }

            // 检查与现有泡泡的碰撞
            for (let row = 0; row < this.ROWS; row++) {
                for (let col = 0; col < this.COLS; col++) {
                    const bubble = this.bubbles[row]?.[col]
                    if (!bubble) continue

                    const diffX = nextX - bubble.x
                    const diffY = nextY - bubble.y
                    const distance = Math.sqrt(diffX * diffX + diffY * diffY)

                    if (distance < this.currentBubble.radius * 2) {
                        foundCollision = true
                        // 调整碰撞点到泡泡边缘
                        const angle = Math.atan2(diffY, diffX)
                        nextX = bubble.x + Math.cos(angle) * (this.currentBubble.radius * 2)
                        nextY = bubble.y + Math.sin(angle) * (this.currentBubble.radius * 2)
                        break
                    }
                }
                if (foundCollision) break
            }

            // 绘制线段
            this.ctx.lineTo(nextX, nextY)

            // 如果找到碰撞点，结束循环
            if (foundCollision) {
                break
            }

            // 更新当前位置
            x = nextX
            y = nextY
            iterations++

            // 每隔一定距离重新开始绘制以保持虚线效果
            if (iterations % 20 === 0) {
                this.ctx.stroke()
                this.ctx.beginPath()
                this.ctx.moveTo(x, y)
            }
        }

        this.ctx.stroke()
        this.ctx.setLineDash([])
    }

    private drawShooter() {
        const length = 40
        const endX = this.shooterX + Math.cos(this.shooterAngle) * length
        const endY = this.shooterY - Math.sin(this.shooterAngle) * length

        this.ctx.beginPath()
        this.ctx.moveTo(this.shooterX, this.shooterY)
        this.ctx.lineTo(endX, endY)
        this.ctx.strokeStyle = '#333'
        this.ctx.lineWidth = 3
        this.ctx.stroke()
    }

    private gameOver() {
        if (!this.isGameOver) {
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

    private update = () => {
        const currentTime = Date.now()
        const deltaTime = currentTime - this.lastUpdateTime
        this.lastUpdateTime = currentTime

        if (!this.isGameOver) {
            // Update time
            const elapsedSeconds = Math.floor((currentTime - this.gameStartTime) / 1000)
            this.timeLeft = Math.max(TIME_MAX - elapsedSeconds, 0)
            this.onTimeChange(this.timeLeft)

            if (this.timeLeft <= 0) {
                this.gameOver()
                return
            }

            // 更新动画和粒子
            this.updateAnimations(deltaTime)

            // 检查胜利条件 - 修改为同时检查网格和掉落的泡泡
            let remainingBubbles = false
            for (const row of this.bubbles) {
                if (row.some(bubble => bubble !== null)) {
                    remainingBubbles = true
                    break
                }
            }
            
            // 如果网格中没有泡泡，但还有掉落中的泡泡，游戏也不应该结束
            if (!remainingBubbles && this.fallingBubbles.length === 0) {
                this.score += this.timeLeft * 10
                this.gameOver()
                return
            }

            this.render()
            this.animationFrameId = requestAnimationFrame(this.update)
        }
    }
}
