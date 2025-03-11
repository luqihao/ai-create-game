import React, { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { PossibleMove } from './types'
import * as THREE from 'three'

interface JumpingPegProps {
    move: PossibleMove
    duration: number // 动画持续时间（秒）
    onAnimationComplete: () => void
}

const JumpingPeg: React.FC<JumpingPegProps> = ({ move, duration, onAnimationComplete }) => {
    const meshRef = useRef<THREE.Mesh>(null!)
    const startTime = useRef(Date.now())
    const isComplete = useRef(false)

    // 计算起始和目标位置的3D坐标
    const startPos = {
        x: move.from.x - 3,
        y: 0.4, // 球体半径
        z: move.from.y - 3
    }

    const endPos = {
        x: move.to.x - 3,
        y: 0.4,
        z: move.to.y - 3
    }

    // 中间(被跳过棋子)位置
    const midPos = {
        x: move.over.x - 3,
        y: 0.4,
        z: move.over.y - 3
    }

    // 每帧更新位置
    useFrame(() => {
        if (isComplete.current) return

        const elapsed = (Date.now() - startTime.current) / 1000 // 转换为秒
        const progress = Math.min(elapsed / duration, 1)

        if (progress >= 1) {
            // 动画结束
            isComplete.current = true
            meshRef.current.position.set(endPos.x, endPos.y, endPos.z)
            onAnimationComplete()
            return
        }

        // 使用三次贝塞尔曲线创建抛物线效果
        const jumpHeight = 1.5 // 跳跃高度

        // 控制点：起点和终点之间的上方点
        const controlPoint1 = {
            x: startPos.x + (midPos.x - startPos.x) * 0.5,
            y: startPos.y + jumpHeight * 0.7, // 第一个控制点高度
            z: startPos.z + (midPos.z - startPos.z) * 0.5
        }

        const controlPoint2 = {
            x: midPos.x + (endPos.x - midPos.x) * 0.5,
            y: midPos.y + jumpHeight, // 第二个控制点高度
            z: midPos.z + (endPos.z - midPos.z) * 0.5
        }

        // 计算贝塞尔曲线上的点 (使用三次贝塞尔曲线)
        const p0 = new THREE.Vector3(startPos.x, startPos.y, startPos.z)
        const p1 = new THREE.Vector3(controlPoint1.x, controlPoint1.y, controlPoint1.z)
        const p2 = new THREE.Vector3(controlPoint2.x, controlPoint2.y, controlPoint2.z)
        const p3 = new THREE.Vector3(endPos.x, endPos.y, endPos.z)

        const position = new THREE.Vector3()
        position.copy(p0.clone().multiplyScalar(Math.pow(1 - progress, 3)))
        position.add(p1.clone().multiplyScalar(3 * Math.pow(1 - progress, 2) * progress))
        position.add(p2.clone().multiplyScalar(3 * (1 - progress) * Math.pow(progress, 2)))
        position.add(p3.clone().multiplyScalar(Math.pow(progress, 3)))

        // 更新棋子位置
        meshRef.current.position.copy(position)

        // 添加旋转效果，使动画更生动
        meshRef.current.rotation.y += 0.05
    })

    // 确保组件卸载时不会导致问题
    useEffect(() => {
        return () => {
            isComplete.current = true
        }
    }, [])

    return (
        <mesh ref={meshRef} position={[startPos.x, startPos.y, startPos.z]}>
            <sphereGeometry args={[0.4, 32, 32]} />
            <meshStandardMaterial color="#FFD700" roughness={0.3} metalness={0.8} />
        </mesh>
    )
}

export default JumpingPeg
