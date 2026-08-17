import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Html, Billboard } from '@react-three/drei';
import type { FarmData, Tree } from "@/types/yield";
// @ts-ignore
import treeIcon from '../../../assets/icons/coconut-tree-3d.png';

interface Studio3DProps {
  farmData: FarmData | undefined;
  selectedId: string | null;
  onSelectTree: (tree: Tree) => void;
  onClearSelection: () => void;
  highlightZoneId?: string | null;
  isEditingMode: boolean;
  draftPositions: Record<string, { nx: number, nz: number }>;
  onMoveTree: (treeId: string, nx: number, nz: number) => void;
  treeColorMap: Record<number, string>;
}

function TreeModel({
  tree,
  isSelected,
  dimmed,
  onSelect,
  scale,
  isEditingMode,
  isDragged,
  onPointerDown,
  nx,
  nz,
  zoneColor
}: {
  tree: Tree;
  isSelected: boolean;
  dimmed: boolean;
  onSelect: () => void;
  scale: number;
  isEditingMode: boolean;
  isDragged: boolean;
  onPointerDown: (e: any) => void;
  nx: number;
  nz: number;
  zoneColor?: string;
}) {
  const x = nx * scale;
  const z = nz * scale;
  const [imgError, setImgError] = useState(false);

  return (
    <group 
      position={[x, 0, z]} 
      onClick={(e) => { 
        if (isEditingMode) return; 
        e.stopPropagation(); 
        onSelect(); 
      }}
      onPointerDown={(e) => {
        if (!isEditingMode) return;
        e.stopPropagation();
        onPointerDown(e);
      }}
    >
      {/* Glowing ring if dragged */}
      {isDragged && (
        <mesh position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.5, 1.8, 32]} />
          <meshBasicMaterial color="#FBBF24" transparent opacity={0.8} />
        </mesh>
      )}

      {/* Tree Icon Sprite or Fallback */}
      {imgError ? (
        <group position={[0, 0, 0]}>
          {/* Trunk */}
          <mesh position={[0, 2, 0]} rotation={[0, 0, 0.1]}>
            <cylinderGeometry args={[0.15, 0.3, 4, 6]} />
            <meshStandardMaterial color="#8B5A2B" opacity={dimmed ? 0.5 : 1} transparent />
          </mesh>
          
          {/* Canopy Fronds */}
          <group position={[0.4, 3.8, 0]}>
            {Array.from({ length: 6 }).map((_, i) => (
              <group key={i} rotation={[0, (i * Math.PI * 2) / 6, 0]}>
                <mesh rotation={[Math.PI / 6, 0, 0]} position={[0, -0.2, 0.8]} scale={[1, 0.1, 2.5]}>
                  <sphereGeometry args={[0.4, 6, 6]} />
                  <meshStandardMaterial color="#2E7D32" opacity={dimmed ? 0.5 : 1} transparent />
                </mesh>
              </group>
            ))}
            {/* Center coconut cluster */}
            <mesh position={[0, -0.1, 0]}>
              <sphereGeometry args={[0.3, 6, 6]} />
              <meshStandardMaterial color="#2E7D32" opacity={dimmed ? 0.5 : 1} transparent />
            </mesh>
          </group>
        </group>
      ) : (
        <Html position={[0, 2.5, 0]} center transform sprite zIndexRange={[80, 0]}>
          <img 
            src={treeIcon as unknown as string} 
            onError={() => setImgError(true)}
            style={{ 
              width: 80, 
              height: 80, 
              opacity: dimmed ? 0.5 : 1, 
              pointerEvents: 'none',
              userSelect: 'none',
              objectFit: 'contain'
            }} 
            alt="Coconut Tree"
          />
        </Html>
      )}
      {/* Floating Badge */}
      <Html position={[0, 5.5, 0]} center zIndexRange={[100, 0]}>
        <div
          style={{
            backgroundColor: isSelected ? '#FBBF24' : (zoneColor || '#1E293B'),
            color: isSelected ? '#78350F' : 'white',
            padding: '4px 8px',
            borderRadius: '12px',
            fontWeight: 'bold',
            fontSize: '12px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
            border: isSelected ? '2px solid white' : 'none',
            opacity: dimmed ? 0.6 : 1,
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
            fontFamily: 'sans-serif'
          }}
        >
          #{tree.number.toString().padStart(2, '0')}
        </div>
      </Html>
    </group>
  );
}

export function Studio3D({
  farmData,
  selectedId,
  onSelectTree,
  onClearSelection,
  highlightZoneId = null,
  isEditingMode,
  draftPositions,
  onMoveTree,
  treeColorMap,
}: Studio3DProps) {
  const [draggedTreeId, setDraggedTreeId] = useState<string | null>(null);

  const scale = useMemo(() => {
    if (!farmData) return 20;
    const areaSqm = (farmData.perches ?? 40) * 25;
    const sideLen = Math.sqrt(areaSqm);
    return sideLen;
  }, [farmData]);

  if (!farmData) return null;

  return (
    <View className="flex-1 w-full relative bg-transparent">
      <Canvas shadows camera={{ position: [scale * 1.2, scale * 0.8, scale * 1.2], fov: 55 }}>
        
        <ambientLight intensity={0.6} />
        <directionalLight 
          position={[10, 20, 10]} 
          intensity={1.2} 
          castShadow 
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />

        {/* Invisible Catch-All Plane for Dragging */}
        {isEditingMode && (
          <mesh 
            rotation={[-Math.PI / 2, 0, 0]} 
            position={[0, 0.05, 0]} 
            visible={false}
            onPointerMove={(e) => {
              if (draggedTreeId) {
                // Convert 3D world intersection point to relative nx/nz
                const nx = Math.max(-0.5, Math.min(0.5, e.point.x / scale));
                const nz = Math.max(-0.5, Math.min(0.5, e.point.z / scale));
                onMoveTree(draggedTreeId, nx, nz);
              }
            }}
            onPointerUp={() => setDraggedTreeId(null)}
            onPointerOut={() => setDraggedTreeId(null)}
          >
            <planeGeometry args={[scale * 10, scale * 10]} />
            <meshBasicMaterial color="red" />
          </mesh>
        )}

        <group rotation={[0.05, -0.1, -0.05]}>
          {/* Isometric Land Block */}
          <mesh 
            rotation={[-Math.PI / 2, 0, 0]} 
            position={[0, -0.5, 0]} 
            receiveShadow
            onClick={(e) => { 
              if (!isEditingMode) {
                e.stopPropagation(); 
                onClearSelection();
              }
            }}
          >
            <boxGeometry args={[scale, scale, 1]} />
            <meshStandardMaterial color="#8FBC8F" />
          </mesh>
          
          {/* Grid Helper for Isometric Look */}
          <gridHelper args={[scale, Math.ceil(scale / 2), "#2c3629", "#2c3629"]} position={[0, 0.01, 0]} />

          {/* Trees */}
          {farmData.trees.map((t) => {
            const treeZoneId = (t as Tree & { zoneId?: string | null }).zoneId ?? null;
            const dimmed = highlightZoneId !== null && treeZoneId !== highlightZoneId;
            const isSelected = selectedId === t.id;
            
            // Clamp nx and nz to keep trees strictly on the land block
            const rawNx = draftPositions[t.id]?.nx ?? t.nx;
            const rawNz = draftPositions[t.id]?.nz ?? t.nz;
            const nx = Math.max(-0.48, Math.min(0.48, rawNx));
            const nz = Math.max(-0.48, Math.min(0.48, rawNz));

            return (
              <TreeModel
                key={t.id}
                tree={t}
                nx={nx}
                nz={nz}
                isSelected={isSelected}
                dimmed={dimmed}
                zoneColor={treeColorMap[t.number]}
                onSelect={() => onSelectTree(t)}
                scale={scale}
                isEditingMode={isEditingMode}
                isDragged={draggedTreeId === t.id}
                onPointerDown={(e) => {
                  // Ensure event is captured only by this tree
                  (e.target as any).setPointerCapture?.(e.pointerId);
                  setDraggedTreeId(t.id);
                }}
              />
            );
          })}
        </group>

        <OrbitControls 
          enabled={!isEditingMode}
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          maxPolarAngle={Math.PI / 2.1} // Prevent going below ground
          target={[0, scale * 0.3, 0]}
        />
      </Canvas>
    </View>
  );
}
