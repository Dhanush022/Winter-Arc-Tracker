"use client";

import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, MeshDistortMaterial } from "@react-three/drei";
import * as THREE from "three";

function Crystal() {
  const mesh = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!mesh.current) return;
    mesh.current.rotation.y += 0.005;
    mesh.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.3) * 0.1;
  });

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
      <mesh ref={mesh}>
        <icosahedronGeometry args={[1.5, 1]} />
        <MeshDistortMaterial
          color="#9ca3af"
          transparent
          opacity={0.7}
          roughness={0.1}
          metalness={0.8}
          distort={0.3}
          speed={2}
        />
      </mesh>
    </Float>
  );
}

function InnerCrystal() {
  const mesh = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!mesh.current) return;
    mesh.current.rotation.y -= 0.01;
    mesh.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.5) * 0.2;
  });

  return (
    <mesh ref={mesh}>
      <octahedronGeometry args={[0.8, 0]} />
      <meshStandardMaterial
        color="#f97316"
        transparent
        opacity={0.5}
        roughness={0}
        metalness={1}
        emissive="#f97316"
        emissiveIntensity={0.3}
      />
    </mesh>
  );
}

export default function IceCrystal() {
  return (
    <div className="w-32 h-32 md:w-40 md:h-40">
      <Canvas camera={{ position: [0, 0, 4], fov: 45 }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[5, 5, 5]} intensity={1} color="#9ca3af" />
        <pointLight position={[-5, -5, 5]} intensity={0.5} color="#f97316" />
        <Crystal />
        <InnerCrystal />
      </Canvas>
    </div>
  );
}
