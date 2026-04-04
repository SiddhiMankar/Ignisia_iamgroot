import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html, Line } from '@react-three/drei';
import { AlertCircle } from 'lucide-react';

function ClusterNode({ cluster, position }) {
  const [hovered, setHovered] = useState(false);
  const meshRef = useRef();

  // Subtle pulsing/floating animation for the node + interactive physics targeting
  useFrame((state) => {
    if (!meshRef.current) return;
    
    // Baseline organic float relative to its anchored position
    const baseY = position[1] + Math.sin(state.clock.elapsedTime * 2 + position[0]) * 0.2;
    
    if (hovered) {
      // "Crazy analytics" interactivity: Attract ball towards the 3D projection of mouse pointer
      const targetX = position[0] + state.pointer.x * 5;
      const targetY = baseY + state.pointer.y * 5;
      const targetZ = position[2] + 2; // Pull it forward visually
      
      meshRef.current.position.x += (targetX - meshRef.current.position.x) * 0.1;
      meshRef.current.position.y += (targetY - meshRef.current.position.y) * 0.1;
      meshRef.current.position.z += (targetZ - meshRef.current.position.z) * 0.1;
    } else {
      // Elastic return to original orbital position
      meshRef.current.position.x += (position[0] - meshRef.current.position.x) * 0.05;
      meshRef.current.position.y += (baseY - meshRef.current.position.y) * 0.05;
      meshRef.current.position.z += (position[2] - meshRef.current.position.z) * 0.05;
    }
  });

  // Calculate radius based on answer length (scale logarithmically or linearly)
  // Adjusted to yield smaller spheres per the user request
  const radius = Math.max(0.25, Math.min(1.5, cluster.answers.length * 0.08));

  return (
    <mesh 
      ref={meshRef}
      position={position}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
      onPointerOut={(e) => { e.stopPropagation(); setHovered(false); document.body.style.cursor = 'auto'; }}
      scale={hovered ? 1.15 : 1}
    >
      <sphereGeometry args={[radius, 32, 32]} />
      <meshStandardMaterial 
        color={hovered ? "#222222" : "#000000"} 
        roughness={0.1}
        metalness={0.9}
        emissive={hovered ? "#1a202c" : "#000000"}
      />
      
      {hovered && (
        <Html distanceFactor={15} center zIndexRange={[100, 0]}>
          <div className="bg-white/95 backdrop-blur-md border border-indigo-200 p-4 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] text-sm w-56 transition-all pointer-events-none transform -translate-y-16">
            <div className="font-bold text-gray-900 border-b border-indigo-100 pb-2 mb-2 flex justify-between items-center">
              <span>Cluster {cluster.id}</span>
              <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
            </div>
            <div className="space-y-1">
              <div className="text-gray-500 flex justify-between text-xs uppercase tracking-wider">
                <span>Volume</span>
                <span className="font-bold text-black">{cluster.answers.length} Responses</span>
              </div>
              <div className="text-gray-500 flex justify-between text-xs uppercase tracking-wider">
                <span>Metrics</span>
                <span className="font-bold text-indigo-600">{cluster.suggestedScore}/5 Score</span>
              </div>
              <div className="text-gray-500 flex justify-between text-xs uppercase tracking-wider">
                <span>AI Confidence</span>
                <span className="font-bold text-teal-600">{Math.round(cluster.confidence * 100)}%</span>
              </div>
            </div>
          </div>
        </Html>
      )}
    </mesh>
  );
}

export default function Analytics() {
  const [clusters, setClusters] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('http://localhost:5000/api/reviews/mock')
      .then(res => {
        setClusters(res.data.clusters);
        setLoading(false);
      })
      .catch(err => {
        console.warn("Backend unavailable, using rich mock data for 3D visualization.", err);
        // Fallback mock payload to ensure 3D Canvas functions
        const fallbackClusters = [
          { id: '101', suggestedScore: 5, confidence: 0.95, answers: Array.from({length: 12}).fill("Good answer mentioning gravity.") },
          { id: '102', suggestedScore: 3, confidence: 0.82, answers: Array.from({length: 8}).fill("Partial answer missing formula.") },
          { id: '103', suggestedScore: 1, confidence: 0.99, answers: Array.from({length: 4}).fill("Completely wrong answer.") },
          { id: '104', suggestedScore: 4, confidence: 0.76, answers: Array.from({length: 15}).fill("Acceptable but slightly off.") },
          { id: '105', suggestedScore: 2, confidence: 0.60, answers: Array.from({length: 6}).fill("Lacking context.") }
        ];
        setClusters(fallbackClusters);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (clusters.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500 minimal-card">
        <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-400 animate-pulse" />
        <p>No clusters found for visualization.</p>
      </div>
    );
  }

  // Pre-calculate positions so they form an orbital constellation
  const nodes = clusters.map((c, i) => {
    const angle = (i / clusters.length) * Math.PI * 2;
    const radius = 4 + Math.random() * 2; // Spread
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const y = (Math.random() - 0.5) * 4; // slight vertical variation
    return { cluster: c, position: [x, y, z] };
  });

  return (
    <div className="space-y-6 h-full flex flex-col pb-8">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-sm font-semibold text-indigo-500 tracking-wider uppercase mb-1 drop-shadow-sm">Advanced Visualization</h2>
          <h1 className="text-3xl font-bold text-gray-900">Neural Analytics Mesh</h1>
          <p className="text-gray-500 mt-1 max-w-xl">
             Explore deep relationships between student cognitive pathways. Spheroid gravity pulls dynamically on hover cursor events mapping real-time dataset analysis.
          </p>
        </div>
      </header>

      <div className="minimal-card flex-1 p-0 overflow-hidden relative border-0">
        <div className="absolute inset-0 rounded-xl overflow-hidden shadow-inner">
          <Canvas camera={{ position: [0, 5, 14], fov: 50 }}>
            <ambientLight intensity={1.5} />
            <directionalLight position={[10, 10, 5]} intensity={2} />
            <pointLight position={[-10, -10, -10]} intensity={0.5} />
            
            <OrbitControls 
              enablePan={false} 
              autoRotate={true} 
              autoRotateSpeed={0.8} 
              maxDistance={25}
              minDistance={5}
            />

            <group position={[0, -1, 0]}>
              {/* Central Core */}
              <mesh position={[0, 0, 0]}>
                <sphereGeometry args={[0.5, 16, 16]} />
                <meshStandardMaterial color="#4f46e5" emissive="#4f46e5" emissiveIntensity={2} toneMapped={false} />
              </mesh>

              {/* Render Nodes and Connecting Neuro-Web Lines */}
              {nodes.map((node, i) => {
                const nextNode = nodes[(i + 1) % nodes.length];
                return (
                  <React.Fragment key={i}>
                    {/* Perimeter Ring connection */}
                    <Line
                      points={[node.position, nextNode.position]}
                      color="#cbd5e1"
                      lineWidth={1.5}
                      transparent
                      opacity={0.3}
                    />
                    {/* Central Core Connection */}
                    <Line
                      points={[node.position, [0,0,0]]}
                      color="#a5b4fc"
                      lineWidth={0.5}
                      transparent
                      opacity={0.4}
                    />
                    <ClusterNode cluster={node.cluster} position={node.position} />
                  </React.Fragment>
                );
              })}
            </group>
          </Canvas>
        </div>
      </div>
    </div>
  );
}
