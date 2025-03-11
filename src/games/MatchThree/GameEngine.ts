type GemType = 'red' | 'blue' | 'green' | 'yellow' | 'purple' | 'orange' | 'teal'

interface Gem {
    type: GemType
    x: number
    y: number
    targetY: number
    targetX: number
    isNew: boolean
    isMatched: boolean
    explosionProgress: number
    scale: number
}

export class GameEngine {
    private canvas: HTMLCanvasElement
    private ctx: CanvasRenderingContext2D
    private board: Gem[][]
    private rows: number
    private cols: number
    private cellSize: number = 60
    private gemColors: Record<GemType, string> = {
        red: '#FF5555',
        blue: '#5555FF',
        green: '#55AA55',
        yellow: '#FFFF55',
        purple: '#AA55AA',
        orange: '#FFA500', // 添加橙色
        teal: '#008080' // 添加青色
    }
    private score: number = 0
    private gemTypes: GemType[] = ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'teal']
    private selectedGem: { row: number; col: number } | null = null
    private animationId: number | null = null
    private initializing: boolean = true
    private images: Record<GemType, HTMLImageElement> = {} as Record<GemType, HTMLImageElement>
    private imagesLoaded: boolean = false
    private gemFallDelay: number = 15 // 控制掉落间隔的毫秒数，从30改为15，加快速度
    private gemCreationQueue: { row: number; col: number }[] = []
    private lastGemCreationTime: number = 0
    private isAnimating: boolean = false // 添加动画状态标记

    // 回调函数
    public onScoreChange: (score: number) => void = () => {}
    public onGameStart: () => void = () => {}

    constructor(canvas: HTMLCanvasElement, rows: number, cols: number) {
        this.canvas = canvas
        this.rows = rows
        this.cols = cols
        this.board = Array(rows)
            .fill(0)
            .map(() => Array(cols).fill(null))

        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error('无法获取 canvas 上下文')
        this.ctx = ctx

        // 预加载图标
        this.preloadImages().then(() => {
            this.imagesLoaded = true
            this.initialize()
        })

        // 添加事件监听
        this.canvas.addEventListener('click', this.handleClick.bind(this))
    }

    private async preloadImages(): Promise<void> {
        const loadPromises = this.gemTypes.map(type => {
            return new Promise<void>(resolve => {
                const img = new Image()
                img.onload = () => {
                    this.images[type] = img
                    resolve()
                }
                img.onerror = () => {
                    // 如果SVG加载失败，创建一个备用的颜色圆形
                    console.warn(`Failed to load image for ${type}, using fallback`)
                    const canvas = document.createElement('canvas')
                    canvas.width = 40
                    canvas.height = 40
                    const ctx = canvas.getContext('2d')
                    if (ctx) {
                        ctx.fillStyle = this.gemColors[type]
                        ctx.beginPath()
                        ctx.arc(20, 20, 18, 0, Math.PI * 2)
                        ctx.fill()

                        const fallbackImg = new Image()
                        fallbackImg.src = canvas.toDataURL()
                        fallbackImg.onload = () => {
                            this.images[type] = fallbackImg
                            resolve()
                        }
                    } else {
                        resolve() // 即使失败也要让Promise完成
                    }
                }
                img.src = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><circle cx="20" cy="20" r="18" fill="${encodeURIComponent(
                    this.gemColors[type]
                )}" /></svg>`
            })
        })

        return Promise.all(loadPromises).then(() => {})
    }

    public initialize() {
        if (!this.imagesLoaded) {
            return // 如果图片未加载完毕，则等待
        }

        // 初始化游戏板，但不立即设置所有宝石
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                this.board[row][col] = null as any
            }
        }

        // 使用延迟创建宝石，按照从左下到右上的顺序
        this.createGemsWithDelay()
    }

    // 新增方法：按顺序从左下到右上创建宝石
    private createGemsWithDelay() {
        this.gemCreationQueue = []

        // 计算对角线数量：从左下角开始，到右上角，总共需要 (rows + cols - 1) 条对角线
        const totalDiagonals = this.rows + this.cols - 1

        // 从左下角开始，按对角线方向添加元素
        for (let diagonal = 0; diagonal < totalDiagonals; diagonal++) {
            const diagonalGems: { row: number; col: number }[] = []

            // 计算这条对角线上的所有点
            // startRow 是这条对角线在最左边时的行号
            // startCol 是这条对角线在最左边时的列号
            let startRow = this.rows - 1 - diagonal
            let startCol = 0

            // 如果超出了顶部，需要从右边开始
            if (startRow < 0) {
                startCol = Math.abs(startRow)
                startRow = 0
            }

            // 收集这条对角线上的所有点
            while (startRow < this.rows && startCol < this.cols) {
                diagonalGems.push({ row: startRow, col: startCol })
                startRow++
                startCol++
            }

            // 将这条对角线上的点添加到队列中
            // 注意：同一对角线上的点会被一起创建
            this.gemCreationQueue.push(...diagonalGems)
        }

        // 开始创建宝石
        this.lastGemCreationTime = performance.now()
        this.startAnimation()
    }

    public restart() {
        this.score = 0
        this.initializing = true
        this.selectedGem = null
        if (this.animationId !== null) {
            cancelAnimationFrame(this.animationId)
            this.animationId = null
        }
        this.initialize()
    }

    public destroy() {
        if (this.animationId !== null) {
            cancelAnimationFrame(this.animationId)
        }
        this.canvas.removeEventListener('click', this.handleClick.bind(this))
    }

    private getRandomGemType(): GemType {
        const randIndex = Math.floor(Math.random() * this.gemTypes.length)
        return this.gemTypes[randIndex]
    }

    private startAnimation() {
        const animate = (timestamp: number) => {
            // 处理宝石创建
            this.processGemCreation(timestamp)

            this.update()
            this.render()
            this.animationId = requestAnimationFrame(animate)
        }

        this.animationId = requestAnimationFrame(animate)
    }

    private processGemCreation(timestamp: number) {
        // 如果队列为空，不需要处理
        if (this.gemCreationQueue.length === 0) return

        // 检查是否应该创建新一组宝石
        if (timestamp - this.lastGemCreationTime > this.gemFallDelay) {
            // 获取当前对角线上的所有点的行号和列号之和（它们应该相等）
            const currentSum = this.gemCreationQueue[0].row + this.gemCreationQueue[0].col

            // 创建同一对角线上的所有宝石
            while (
                this.gemCreationQueue.length > 0 &&
                this.gemCreationQueue[0].row + this.gemCreationQueue[0].col === currentSum
            ) {
                const { row, col } = this.gemCreationQueue.shift()!
                const type = this.getRandomGemType()

                this.board[row][col] = {
                    type,
                    x: col * this.cellSize + this.cellSize / 2,
                    y: -this.cellSize * 2, // 从顶部稍高的位置开始
                    targetY: row * this.cellSize + this.cellSize / 2,
                    targetX: col * this.cellSize + this.cellSize / 2,
                    isNew: true,
                    isMatched: false,
                    explosionProgress: 0,
                    scale: 1
                }
            }

            this.lastGemCreationTime = timestamp
        }
    }

    private update() {
        let allGemsInPlace = true
        let anyExplosions = false
        let needHandleFalling = false

        // 设置动画状态
        this.isAnimating = this.gemCreationQueue.length > 0

        // 如果仍有宝石在队列中等待创建，游戏不会开始
        if (this.gemCreationQueue.length > 0) {
            allGemsInPlace = false
        }

        // 更新宝石位置和动画
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                const gem = this.board[row][col]
                if (!gem) continue

                // 处理爆炸动画
                if (gem.isMatched) {
                    this.isAnimating = true
                    anyExplosions = true
                    gem.explosionProgress += 0.05
                    gem.scale = Math.max(0, 1 - gem.explosionProgress)

                    // 在爆炸开始时计分（当爆炸进度接近0时）
                    if (gem.explosionProgress <= 0.05) {
                        this.score++
                        this.onScoreChange(this.score)
                    }

                    // 当动画完成时标记需要处理下落
                    if (gem.explosionProgress >= 1) {
                        this.board[row][col] = null as any
                        needHandleFalling = true
                        continue
                    }
                    continue
                }

                // 移动动画 - 加快速度，从0.2提高到0.25
                const dx = gem.targetX - gem.x
                const dy = gem.targetY - gem.y
                if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
                    this.isAnimating = true
                    gem.x += dx * 0.25
                    gem.y += dy * 0.25
                    allGemsInPlace = false
                } else {
                    gem.x = gem.targetX
                    gem.y = gem.targetY
                    gem.isNew = false
                }
            }
        }

        // 如果有宝石消除完成，立即处理下落
        if (needHandleFalling) {
            this.handleFalling()
        }

        // 在初始化阶段，等待所有宝石掉落到位
        if (this.initializing && allGemsInPlace && !anyExplosions) {
            this.initializing = false
            this.checkMatches()
            this.onGameStart()
        }

        // 如果不是在初始化状态，并且没有动画进行，检查匹配
        if (!this.initializing && allGemsInPlace && !anyExplosions) {
            this.checkMatches()
        }
    }

    private render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

        // 绘制网格背景
        this.ctx.strokeStyle = '#ddd'
        this.ctx.lineWidth = 1
        for (let row = 0; row <= this.rows; row++) {
            this.ctx.beginPath()
            this.ctx.moveTo(0, row * this.cellSize)
            this.ctx.lineTo(this.cols * this.cellSize, row * this.cellSize)
            this.ctx.stroke()
        }

        for (let col = 0; col <= this.cols; col++) {
            this.ctx.beginPath()
            this.ctx.moveTo(col * this.cellSize, 0)
            this.ctx.lineTo(col * this.cellSize, this.rows * this.cellSize)
            this.ctx.stroke()
        }

        // 绘制宝石
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                const gem = this.board[row][col]
                if (!gem) continue

                const size = this.cellSize * 0.8 * gem.scale

                this.ctx.save()
                this.ctx.translate(gem.x, gem.y)

                if (gem.isMatched) {
                    // 修改爆炸效果的绘制
                    const particleCount = 8
                    const radius = this.cellSize * 0.4 * (1 + gem.explosionProgress)
                    const alpha = Math.max(0, 1 - gem.explosionProgress) // 添加透明度过渡

                    this.ctx.globalAlpha = alpha
                    this.ctx.fillStyle = this.gemColors[gem.type]
                    for (let i = 0; i < particleCount; i++) {
                        const angle = ((Math.PI * 2) / particleCount) * i
                        const x = Math.cos(angle) * radius * gem.explosionProgress
                        const y = Math.sin(angle) * radius * gem.explosionProgress
                        const particleSize = size * (1 - gem.explosionProgress) * 0.3

                        this.ctx.beginPath()
                        this.ctx.arc(x, y, particleSize, 0, Math.PI * 2)
                        this.ctx.fill()
                    }
                    this.ctx.globalAlpha = 1 // 恢复透明度
                } else if (this.imagesLoaded && this.images[gem.type]) {
                    // 确保图片已加载后再绘制宝石
                    try {
                        this.ctx.drawImage(this.images[gem.type], -size / 2, -size / 2, size, size)
                    } catch (err) {
                        // 如果绘制图片失败，使用颜色代替
                        console.error('Error drawing image:', err)
                        this.ctx.fillStyle = this.gemColors[gem.type]
                        this.ctx.beginPath()
                        this.ctx.arc(0, 0, size / 2, 0, Math.PI * 2)
                        this.ctx.fill()
                    }

                    // 绘制高亮选择框
                    if (this.selectedGem && this.selectedGem.row === row && this.selectedGem.col === col) {
                        // 添加发光效果
                        this.ctx.shadowColor = '#00FFFF'
                        this.ctx.shadowBlur = 10
                        this.ctx.strokeStyle = '#00FFFF' // 使用亮蓝色
                        this.ctx.lineWidth = 4
                        this.ctx.strokeRect(-size / 2 - 5, -size / 2 - 5, size + 10, size + 10)
                        // 重置阴影效果
                        this.ctx.shadowColor = 'transparent'
                        this.ctx.shadowBlur = 0
                    }
                } else {
                    // 如果图片未加载，绘制备用的颜色圆形
                    this.ctx.fillStyle = this.gemColors[gem.type]
                    this.ctx.beginPath()
                    this.ctx.arc(0, 0, size / 2, 0, Math.PI * 2)
                    this.ctx.fill()
                }

                this.ctx.restore()
            }
        }
    }

    private handleClick(e: MouseEvent) {
        // 如果正在初始化或者有动画在进行，禁止点击
        if (this.initializing || this.isAnimating) return

        const rect = this.canvas.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top

        const col = Math.floor(x / this.cellSize)
        const row = Math.floor(y / this.cellSize)

        if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) return

        if (!this.selectedGem) {
            this.selectedGem = { row, col }
        } else {
            const selectedRow = this.selectedGem.row
            const selectedCol = this.selectedGem.col

            // 检查是否相邻
            const isAdjacent =
                (Math.abs(row - selectedRow) === 1 && col === selectedCol) ||
                (Math.abs(col - selectedCol) === 1 && row === selectedRow)

            if (isAdjacent) {
                this.swapGems(selectedRow, selectedCol, row, col)
                this.selectedGem = null
            } else {
                // 如果不相邻，选中新点击的元素
                this.selectedGem = { row, col }
            }
        }
    }

    private swapGems(row1: number, col1: number, row2: number, col2: number) {
        this.isAnimating = true // 开始交换动画时设置标记

        // 交换宝石目标位置
        const gem1 = this.board[row1][col1]
        const gem2 = this.board[row2][col2]

        // 先保存原始位置，以便需要还原时使用
        const gem1OriginalX = gem1.targetX
        const gem1OriginalY = gem1.targetY
        const gem2OriginalX = gem2.targetX
        const gem2OriginalY = gem2.targetY

        // 执行交换
        gem1.targetX = gem2.targetX
        gem1.targetY = gem2.targetY
        gem2.targetX = gem1OriginalX
        gem2.targetY = gem1OriginalY

        // 交换数组中的位置
        this.board[row1][col1] = gem2
        this.board[row2][col2] = gem1

        // 延迟检查是否有匹配，给动画一点时间完成
        setTimeout(() => {
            // 检查是否有匹配
            if (!this.checkMatches()) {
                // 如果没有匹配，还原位置
                gem1.targetX = gem1OriginalX
                gem1.targetY = gem1OriginalY
                gem2.targetX = gem2OriginalX
                gem2.targetY = gem2OriginalY

                // 还原数组中的位置
                this.board[row1][col1] = gem1
                this.board[row2][col2] = gem2
            }
            // 动画完成后重置标记
            this.isAnimating = false
        }, 300) // 等待300毫秒，让交换动画有时间完成
    }

    private checkMatches() {
        // 使用二维数组来标记已匹配的宝石
        const matched = Array(this.rows)
            .fill(0)
            .map(() => Array(this.cols).fill(false))
        let hasMatches = false

        // 检查水平匹配
        for (let row = 0; row < this.rows; row++) {
            let matchCount = 1
            let currentType: GemType | null = null

            for (let col = 0; col <= this.cols; col++) {
                const gem = col < this.cols ? this.board[row][col] : null

                if (!gem || gem.type !== currentType) {
                    if (matchCount >= 3) {
                        // 标记匹配的宝石
                        for (let i = col - matchCount; i < col; i++) {
                            matched[row][i] = true
                        }
                        hasMatches = true
                    }
                    matchCount = 1
                    currentType = gem ? gem.type : null
                } else {
                    matchCount++
                }
            }
        }

        // 检查垂直匹配
        for (let col = 0; col < this.cols; col++) {
            let matchCount = 1
            let currentType: GemType | null = null

            for (let row = 0; row <= this.rows; row++) {
                const gem = row < this.rows ? this.board[row][col] : null

                if (!gem || gem.type !== currentType) {
                    if (matchCount >= 3) {
                        // 标记匹配的宝石
                        for (let i = row - matchCount; i < row; i++) {
                            matched[i][col] = true
                        }
                        hasMatches = true
                    }
                    matchCount = 1
                    currentType = gem ? gem.type : null
                } else {
                    matchCount++
                }
            }
        }

        // 根据标记收集匹配的宝石
        const matches: Gem[] = []
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                if (matched[row][col]) {
                    matches.push(this.board[row][col])
                }
            }
        }

        if (matches.length > 0) {
            this.processMatches(matches)
            return true
        }

        return false
    }

    private processMatches(matches: Gem[]) {
        this.isAnimating = true // 开始消除动画时设置标记

        // 移除分数统计，因为现在在爆炸动画时计分
        // this.score += matches.length

        // 标记匹配的宝石
        matches.forEach(gem => {
            gem.isMatched = true
            gem.explosionProgress = 0
            gem.scale = 1
        })

        // 不需要在这里触发分数更新
        // this.onScoreChange(this.score)

        const animationDuration = 500
        setTimeout(() => {
            this.handleFalling()
        }, animationDuration)
    }

    private handleFalling() {
        this.isAnimating = true // 开始下落动画时设置标记

        let anyFalling = false

        // 移除匹配的宝石并让上面的宝石下落
        for (let col = 0; col < this.cols; col++) {
            let shiftCount = 0
            let emptySpaces: number[] = []

            // 从底部向上检查空位
            for (let row = this.rows - 1; row >= 0; row--) {
                if (!this.board[row][col]) {
                    shiftCount++
                    emptySpaces.push(row)
                } else if (shiftCount > 0) {
                    // 将宝石向下移动
                    const gem = this.board[row][col]
                    gem.targetY += shiftCount * this.cellSize
                    this.board[row + shiftCount][col] = gem
                    this.board[row][col] = null as any
                    anyFalling = true
                }
            }

            // 在顶部创建新的宝石
            for (let i = 0; i < shiftCount; i++) {
                const row = i
                const type = this.getRandomGemType()
                this.board[row][col] = {
                    type,
                    x: col * this.cellSize + this.cellSize / 2,
                    y: -this.cellSize * (i + 1),
                    targetY: row * this.cellSize + this.cellSize / 2,
                    targetX: col * this.cellSize + this.cellSize / 2,
                    isNew: true,
                    isMatched: false,
                    explosionProgress: 0,
                    scale: 1
                }
                anyFalling = true
            }
        }

        // 如果有宝石在下落，不要立即检查匹配
        if (!anyFalling) {
            this.isAnimating = false // 所有动画完成后重置标记
            this.checkMatches()
        }
    }
}
