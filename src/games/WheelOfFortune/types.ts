export interface Prize {
    id: number
    name: string
    probability: number
    color: string
}

export interface WheelConfig {
    prizes: Prize[]
    size: number
    duration: number
    selectedPrizeId?: number
}
