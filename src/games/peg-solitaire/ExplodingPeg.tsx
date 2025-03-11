import React, { useRef, useState, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { Position } from './types'
import * as THREE from 'three'

interface ExplodingPegProps {
    position: Position
    duration: number // 动画持续时间（秒）
    particleCount: number // 爆炸粒子数量
    onAnimationComplete: () => void
}

interface Particle {
    position: THREE.Vector3
    velocity: THREE.Vector3
    size: number
    color: THREE.Color
}

const ExplodingPeg: React.FC<ExplodingPegProps> = ({ position, duration, particleCount = 30, onAnimationComplete }) => {
    const groupRef = useRef<THREE.Group>(null!)
    const startTime = useRef(Date.now())
    const particles = useRef<Particle[]>([])
    const [initialized, setInitialized] = useState(false)

    // 计算3D位置
    const x = position.x - 3
    const z = position.y - 3
    const y = 0.4

    // 初始化粒子
    useEffect(() => {
        if (!initialized) {
            // 创建一组随机方向的粒子
            for (let i = 0; i < particleCount; i++) {
                // 随机方向
                const theta = Math.random() * Math.PI * 2
                const phi = Math.random() * Math.PI * 2
                const speed = 0.01 + Math.random() * 0.03

                // 粒子初始位置（略有随机偏移）
                const initialOffset = 0.05
                const initialX = Math.random() * initialOffset - initialOffset / 2
                const initialY = Math.random() * initialOffset - initialOffset / 2
                const initialZ = Math.random() * initialOffset - initialOffset / 2

                // 粒子速度向量
                const velocity = new THREE.Vector3(
                    Math.sin(theta) * Math.cos(phi),
                    Math.sin(theta) * Math.sin(phi),
                    Math.cos(theta)
                ).multiplyScalar(speed)

                particles.current.push({
                    position: new THREE.Vector3(x + initialX, y + initialY, z + initialZ),
                    velocity,
                    size: 0.1 + Math.random() * 0.15, // 随机大小
                    color: new THREE.Color().setHSL(Math.random(), 0.8, 0.7) // 随机颜色
                })
            }
            setInitialized(true)
        }
    }, [initialized, particleCount, x, y, z])

    // 动画帧更新
    useFrame(() => {
        if (!initialized) return

        const elapsed = (Date.now() - startTime.current) / 1000 // 转换为秒
        const progress = Math.min(elapsed / duration, 1)

        if (progress >= 1) {
            // 动画结束
            onAnimationComplete()
            return
        }

        // 更新粒子位置和大小
        particles.current.forEach((particle, index) => {
            // 应用速度
            particle.position.add(particle.velocity)

            // 应用重力和随机扰动
            particle.velocity.y -= 0.0005 // 重力
            particle.velocity.x += (Math.random() - 0.5) * 0.001
            particle.velocity.z += (Math.random() - 0.5) * 0.001

            // 根据进度缩小粒子
            const meshScale = 1 - progress * 0.8

            // 更新对应的mesh
            const mesh = groupRef.current.children[index] as THREE.Mesh
            if (mesh) {
                mesh.position.copy(particle.position)
                mesh.scale.setScalar(particle.size * meshScale)
            }
        })
    })

    return (
        <group ref={groupRef}>
            {initialized &&
                particles.current.map((particle, index) => (
                    <mesh key={index} position={[particle.position.x, particle.position.y, particle.position.z]}>
                        <sphereGeometry args={[1, 8, 8]} />
                        <meshStandardMaterial
                            color={particle.color}
                            emissive={particle.color}
                            emissiveIntensity={0.5}
                        />
                    </mesh>
                ))}
        </group>
    )
}

export default ExplodingPeg
