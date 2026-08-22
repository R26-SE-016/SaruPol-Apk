import React, { useMemo, useState, Component } from 'react';
import { View, Text, Platform } from 'react-native';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Html, Text3D } from '@react-three/drei';
import type { FarmData, Tree } from "@/types/yield";
// @ts-ignore
const treeIcon = 'https://i.ibb.co/xKSGghy9/coconut-tree-3d.png';
const fontJson = require('../../../assets/fonts/helvetiker.json');
import { Center } from '@react-three/drei';

// CRITICAL FIX: @react-three/drei Html crashes React Native WebGL renderer
const SafeHtml = Platform.OS === 'web' ? Html : (({ children }: any) => <>{null}</>);

// ─── Error Boundary ────────────────────────────────────────────────────────────
class Studio3DErrorBoundary extends Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: any) {
    console.warn('[Studio3D] Caught 3D render error:', error?.message);
  }
  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? null;
    }
    return this.props.children;
  }
}

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
  const [imgError, setImgError] = useState(Platform.OS !== 'web');

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

      {/* Tree Icon Sprite or Fallback geometry */}
      {imgError ? (
        <group position={[0, 0, 0]}>
          <mesh position={[0, 2, 0]} rotation={[0, 0, 0.1]}>
            <cylinderGeometry args={[0.15, 0.3, 4, 6]} />
            <meshStandardMaterial color="#8B5A2B" opacity={dimmed ? 0.5 : 1} transparent />
          </mesh>
          <group position={[0.4, 3.8, 0]}>
            {Array.from({ length: 6 }).map((_, i) => (
              <group key={i} rotation={[0, (i * Math.PI * 2) / 6, 0]}>
                <mesh rotation={[Math.PI / 6, 0, 0]} position={[0, -0.2, 0.8]} scale={[1, 0.1, 2.5]}>
                  <sphereGeometry args={[0.4, 6, 6]} />
                  <meshStandardMaterial color="#2E7D32" opacity={dimmed ? 0.5 : 1} transparent />
                </mesh>
              </group>
            ))}
            <mesh position={[0, -0.1, 0]}>
              <sphereGeometry args={[0.3, 6, 6]} />
              <meshStandardMaterial color="#2E7D32" opacity={dimmed ? 0.5 : 1} transparent />
            </mesh>
          </group>
        </group>
      ) : (
        <SafeHtml position={[0, 2.5, 0]} center transform sprite zIndexRange={[80, 0]}>
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
        </SafeHtml>
      )}

      {/* Floating tree number badge */}
      {Platform.OS === 'web' ? (
        <SafeHtml position={[0, 5.5, 0]} center zIndexRange={[100, 0]}>
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
        </SafeHtml>
      ) : (
        <Center position={[0, 5.5, 0]}>
          <Text3D font={fontJson as any} size={0.6} height={0.05} bevelEnabled={false}>
            {tree.number.toString()}
            <meshStandardMaterial color={isSelected ? '#FBBF24' : (zoneColor || '#ffffff')} />
          </Text3D>
        </Center>
      )}
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
    return Math.sqrt(areaSqm);
  }, [farmData]);

  if (!farmData) return null;

  return (
    <Studio3DErrorBoundary
      fallback={
        <View style={{ flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f5f9', borderRadius: 16 }}>
          <Text style={{ color: '#64748b', fontSize: 13, textAlign: 'center', padding: 20 }}>
            3D view unavailable on this device.{'\n'}Use the 2D map view instead.
          </Text>
        </View>
      }
    >
      <View style={{ flex: 1, width: '100%' }}>
        <Canvas
          shadows={Platform.OS === 'web'}
          camera={{ position: [scale * 1.2, scale * 0.8, scale * 1.2], fov: 55 }}
          onCreated={({ gl }) => {
            if (!gl || !gl.capabilities) {
              console.warn('[Studio3D] WebGL context not ready');
            }
          }}
        >
          <ambientLight intensity={0.6} />
          <directionalLight
            position={[10, 20, 10]}
            intensity={1.2}
            castShadow={Platform.OS === 'web'}
            shadow-mapSize-width={1024}
            shadow-mapSize-height={1024}
          />

          {/* Invisible drag plane */}
          {isEditingMode && (
            <mesh
              rotation={[-Math.PI / 2, 0, 0]}
              position={[0, 0.05, 0]}
              visible={false}
              onPointerMove={(e) => {
                if (draggedTreeId) {
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
            {/* Land block */}
            <mesh
              rotation={[-Math.PI / 2, 0, 0]}
              position={[0, -0.5, 0]}
              receiveShadow={Platform.OS === 'web'}
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

            <gridHelper args={[scale, Math.ceil(scale / 2), "#2c3629", "#2c3629"]} position={[0, 0.01, 0]} />

            {/* Trees */}
            {farmData.trees.map((t) => {
              const treeZoneId = (t as Tree & { zoneId?: string | null }).zoneId ?? null;
              const dimmed = highlightZoneId !== null && treeZoneId !== highlightZoneId;
              const isSelected = selectedId === t.id;
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
            maxPolarAngle={Math.PI / 2.1}
            target={[0, scale * 0.3, 0]}
          />
        </Canvas>
      </View>
    </Studio3DErrorBoundary>
  );
}
