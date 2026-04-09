"use client";
import { Canvas } from "@react-three/fiber";
import { Float, MeshDistortMaterial, OrbitControls, Sphere } from "@react-three/drei";

export default function ThreeScene({ skinIdx }: { skinIdx?: number }) {
  // Professional Skin Tone Mapping (Fitzpatrick Scale)
  const skinColors = [
    "#f3e1d7", // Type 1
    "#e8d1c5", // Type 2
    "#dcbfa6", // Type 3
    "#a17249", // Type 4
    "#7d4e2d", // Type 5
    "#3d2b1f"  // Type 6
  ];

  const activeColor = skinIdx !== undefined ? skinColors[skinIdx] : "#22d3ee"; // Cyan default

  return (
    <Canvas camera={{ position: [0, 0, 3] }} dpr={[1, 2]}>
      <ambientLight intensity={0.2} />
      <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={2} color="#ffffff" />
      <pointLight position={[-10, -10, -10]} color="#00f0ff" intensity={1} />
      
      <Float speed={1.5} rotationIntensity={0.5} floatIntensity={0.5}>
        {/* The "Solid" Skin Layer */}
        <Sphere args={[1, 64, 64]}>
          <MeshDistortMaterial
            color={activeColor}
            speed={3}
            distort={0.2}
            roughness={0.3}
            metalness={0.2}
            emissive={activeColor}
            emissiveIntensity={0.1}
          />
        </Sphere>

        {/* The "Holographic" Wireframe Layer */}
        <Sphere args={[1.05, 32, 32]}>
          <meshStandardMaterial 
            color="#22d3ee" 
            wireframe 
            transparent 
            opacity={0.1} 
          />
        </Sphere>
      </Float>
      
      <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={0.5} />
    </Canvas>
  );
}