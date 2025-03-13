import { WheelConfig } from './types'

export class WheelOfFortuneEngine {
    private config: WheelConfig
    private isSpinning: boolean = false
    private currentRotation: number = 0
    private targetRotation: number = 0
    private rotationSpeed: number = 0
    private maxSpeed: number = 1080
    private acceleration: number = 2160
    private deceleration: number = 0
    private currentPhase: 'accelerating' | 'constant' | 'decelerating' = 'accelerating'
    private timeInPhase: number = 0
    private onComplete?: (prizeId: number) => void
    private currentPrizeId?: number

    constructor(config: WheelConfig) {
        this.config = config
    }

    public setOnComplete(callback: (prizeId: number) => void) {
        this.onComplete = callback
    }

    public startSpin(selectedPrizeId?: number): void {
        if (this.isSpinning) return

        this.isSpinning = true

        // 确定最终停止的位置
        const prizeIndex = selectedPrizeId
            ? this.config.prizes.findIndex(p => p.id === selectedPrizeId)
            : this.getRandomPrizeIndex()

        this.currentPrizeId = this.config.prizes[prizeIndex].id

        // 计算目标角度
        const degreesPerPrize = 360 / this.config.prizes.length
        const targetDegree = 360 - (prizeIndex * degreesPerPrize + degreesPerPrize / 2)

        // 计算总旋转量（基础8圈 + 目标角度）
        this.targetRotation = 360 * 8 + targetDegree

        // 重置状态
        this.currentPhase = 'accelerating'
        this.timeInPhase = 0
        this.rotationSpeed = 0

        // 计算减速度
        const decelerationDistance = this.targetRotation * 0.6
        this.deceleration = (this.maxSpeed * this.maxSpeed) / (2 * decelerationDistance)
    }

    public update(deltaTime: number): number {
        if (!this.isSpinning) return this.currentRotation

        const dt = deltaTime / 1000
        this.timeInPhase += dt

        switch (this.currentPhase) {
            case 'accelerating':
                this.rotationSpeed = Math.min(this.rotationSpeed + this.acceleration * dt, this.maxSpeed)
                if (this.rotationSpeed >= this.maxSpeed) {
                    this.currentPhase = 'constant'
                    this.timeInPhase = 0
                }
                break

            case 'constant':
                if (this.currentRotation >= this.targetRotation * 0.4) {
                    this.currentPhase = 'decelerating'
                    this.timeInPhase = 0
                }
                break

            case 'decelerating':
                this.rotationSpeed = Math.max(0, this.rotationSpeed - this.deceleration * dt)
                if (this.rotationSpeed === 0) {
                    this.isSpinning = false
                    this.currentRotation = this.targetRotation % 360
                    if (this.onComplete && this.currentPrizeId) {
                        this.onComplete(this.currentPrizeId)
                    }
                    return this.currentRotation
                }
                break
        }

        this.currentRotation += this.rotationSpeed * dt

        if (this.currentRotation >= this.targetRotation) {
            this.isSpinning = false
            this.currentRotation = this.targetRotation % 360
            this.rotationSpeed = 0
            if (this.onComplete && this.currentPrizeId) {
                this.onComplete(this.currentPrizeId)
            }
        }

        return this.currentRotation % 360
    }

    private getRandomPrizeIndex(): number {
        const totalProbability = this.config.prizes.reduce((sum, prize) => sum + prize.probability, 0)
        let random = Math.random() * totalProbability

        for (let i = 0; i < this.config.prizes.length; i++) {
            random -= this.config.prizes[i].probability
            if (random <= 0) return i
        }
        return 0
    }

    public isActive(): boolean {
        return this.isSpinning
    }
}
