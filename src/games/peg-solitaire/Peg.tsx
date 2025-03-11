import React, { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Position } from './types'
import * as THREE from 'three'

interface PegProps {
    position: Position
    isSelected: boolean
    isPossibleMove: boolean
    onClick: () => void
}

const Peg: React.FC<PegProps> = ({ position, isSelected, isPossibleMove, onClick }) => {
    const ref = useRef<THREE.Mesh>(null!)

    // 计算实际的3D位置
    const x = position.x - 3 // 中心化
    const z = position.y - 3 // 中心化
    const y = 0.4 // 球体半径，使其位于棋盘表面

    // 每帧更新动画
    useFrame(() => {
        if (ref.current) {
            if (isSelected) {
                ref.current.scale.setScalar(1.2 + Math.sin(Date.now() * 0.008) * 0.1)
            } else if (isPossibleMove) {
                ref.current.scale.setScalar(0.8 + Math.sin(Date.now() * 0.005) * 0.1)
            } else {
                ref.current.scale.setScalar(1)
            }
        }
    })

    // 根据状态确定颜色，使用更鲜明的对比色
    const color = isSelected
        ? '#FFD700' // 金色，选中状态
        : isPossibleMove
        ? '#00FF00' // 亮绿色，可移动目标
        : '#E0E0E0' // 浅灰白色，普通棋子

    // 添加点击处理函数的包装器，确保正确触发
    const handleClick = (e: any) => {
        console.log('Peg组件内点击事件触发, 位置:', position)
        e.stopPropagation() // 阻止事件冒泡
        onClick()
    }

    return (
        <mesh position={[x, y, z]} ref={ref} onClick={handleClick}>
            <sphereGeometry args={[0.4, 32, 32]} />
            <meshStandardMaterial color={color} roughness={0.3} metalness={isSelected ? 0.8 : 0.2} />
        </mesh>
    )
}

export default Peg
