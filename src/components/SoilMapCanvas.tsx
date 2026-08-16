import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface ZoneNode {
  id: string;
  label: string;
  title: string;
  n: number;
  p: number;
  k: number;
  ph: number;
  ec: number;
  humidity: number;
  temp: number;
  status: 'Optimal' | 'Warning' | 'Good';
  position: { top: string; left: string };
  // Extended GIS QGIS properties from index.html (Rathmalagata Estate)
  treeNo?: number;
  soilN?: number;
  leafN?: number;
  lat?: string;
  lon?: string;
}

interface SoilMapCanvasProps {
  zones?: ZoneNode[];
  selectedZone?: ZoneNode;
  onSelectZone?: (zone: ZoneNode) => void;
}

export default function SoilMapCanvas({
  zones = [],
  selectedZone,
  onSelectZone,
}: SoilMapCanvasProps = {}) {
  const [mapLayer, setMapLayer] = useState<'SATELLITE' | 'NDVI' | 'SOIL_N'>('SATELLITE');

  return (
    <View style={styles.container}>
      {/* Top Map Layer Bar & GIS Attribution */}
      <View style={styles.mapControlBar}>
        <View style={styles.layerButtonsGroup}>
          <TouchableOpacity
            style={[styles.layerBtn, mapLayer === 'SATELLITE' && styles.layerBtnActive]}
            onPress={() => setMapLayer('SATELLITE')}
          >
            <Ionicons
              name="globe-outline"
              size={13}
              color={mapLayer === 'SATELLITE' ? '#FFFFFF' : '#4A7C3B'}
            />
            <Text
              style={[
                styles.layerBtnText,
                mapLayer === 'SATELLITE' && styles.layerBtnTextActive,
              ]}
            >
              Satellite Layer
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.layerBtn, mapLayer === 'NDVI' && styles.layerBtnActive]}
            onPress={() => setMapLayer('NDVI')}
          >
            <Ionicons
              name="leaf-outline"
              size={13}
              color={mapLayer === 'NDVI' ? '#FFFFFF' : '#4A7C3B'}
            />
            <Text
              style={[
                styles.layerBtnText,
                mapLayer === 'NDVI' && styles.layerBtnTextActive,
              ]}
            >
              Canopy Leaf_N
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.layerBtn, mapLayer === 'SOIL_N' && styles.layerBtnActive]}
            onPress={() => setMapLayer('SOIL_N')}
          >
            <Ionicons
              name="layers-outline"
              size={13}
              color={mapLayer === 'SOIL_N' ? '#FFFFFF' : '#4A7C3B'}
            />
            <Text
              style={[
                styles.layerBtnText,
                mapLayer === 'SOIL_N' && styles.layerBtnTextActive,
              ]}
            >
              Soil_N Heatmap
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.gisTag}>
          <Text style={styles.gisTagText}>QGIS · Rathmalagata Estate</Text>
        </View>
      </View>

      {/* GIS Field Canvas (Simulating Satellite Base Layer from index.html) */}
      <View
        style={[
          styles.mapCanvasArea,
          mapLayer === 'SATELLITE' && styles.bgSatellite,
          mapLayer === 'NDVI' && styles.bgNdvi,
          mapLayer === 'SOIL_N' && styles.bgSoilN,
        ]}
      >
        {/* Plot Boundary Polygon Outline */}
        <View style={styles.plotBoundaryBox}>
          <View style={styles.plotCornerTL} />
          <View style={styles.plotCornerTR} />
          <View style={styles.plotCornerBL} />
          <View style={styles.plotCornerBR} />
          <Text style={styles.plotBoundaryLabel}>ESTATE COCONUT BLOCK #3 · 7.3202° N, 79.9822° E</Text>
        </View>

        {/* Plantation Grid Lines */}
        <View style={styles.gridOverlay}>
          {[0, 1, 2, 3, 4, 5, 6].map((colIdx) => (
            <View key={colIdx} style={styles.gridLineVertical} />
          ))}
        </View>

        {/* Interactive QGIS Tree Nodes */}
        {zones?.map((zone) => {
          const isSelected = selectedZone?.id === zone.id;
          const treeNumber = zone.treeNo || (zone.id === 'A' ? 30 : zone.id === 'B' ? 49 : zone.id === 'C' ? 64 : zone.id === 'D' ? 148 : 209);
          
          const isHealthy = zone.n >= 40 && zone.n <= 80 && zone.p >= 20 && zone.p <= 50 && zone.k >= 120 && zone.k <= 250;

          return (
            <TouchableOpacity
              key={zone.id}
              activeOpacity={0.85}
              onPress={() => onSelectZone && onSelectZone(zone)}
              style={[
                styles.treePinOuter,
                {
                  top: zone.position.top as any,
                  left: zone.position.left as any,
                },
                isSelected && styles.treePinOuterSelected,
              ]}
            >
              <View
                style={[
                  styles.treePinInner,
                  isSelected ? styles.treePinInnerSelected : (isHealthy ? styles.treePinInnerDefault : styles.treePinInnerWarning),
                ]}
              >
                <Text
                  style={[
                    styles.treePinText,
                    isSelected ? styles.treePinTextSelected : styles.treePinTextDefault,
                  ]}
                >
                  #{treeNumber}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}

        {/* Live Popup Overlay for Selected Tree */}
        {selectedZone && (
          <View style={styles.gisInfoPopup}>
            <View style={styles.popupHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="location" size={16} color="#2E7D32" />
                <Text style={styles.popupTitle}>
                  Coconut Tree #{selectedZone.treeNo || '64'} · {selectedZone.title}
                </Text>
              </View>
              <View style={styles.popupBadge}>
                <Text style={styles.popupBadgeText}>Active Node</Text>
              </View>
            </View>

            <View style={styles.popupMetricsRow}>
              <View style={styles.popupMetricBox}>
                <Text style={styles.popupMetricLabel}>Soil_N (GIS)</Text>
                <Text style={styles.popupMetricVal}>
                  {selectedZone.soilN ? `${selectedZone.soilN}` : '0.0218'}
                </Text>
              </View>

              <View style={styles.popupMetricBox}>
                <Text style={styles.popupMetricLabel}>Leaf_N (GIS)</Text>
                <Text style={styles.popupMetricVal}>
                  {selectedZone.leafN ? `${selectedZone.leafN}` : '2.4293'}
                </Text>
              </View>

              <View style={styles.popupMetricBox}>
                <Text style={styles.popupMetricLabel}>GPS Coordinates</Text>
                <Text style={styles.popupMetricVal}>
                  {selectedZone.lat || '7.3202° N'}, {selectedZone.lon || '79.9823° E'}
                </Text>
              </View>
            </View>
          </View>
        )}
      </View>

      {/* Map Legend Footer */}
      <View style={styles.legendFooter}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#2E7D32' }]} />
          <Text style={styles.legendText}>Selected Tree (GIS Active)</Text>
        </View>

        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#A2BA6E' }]} />
          <Text style={styles.legendText}>Sampled Coconut Palm</Text>
        </View>

        <Text style={styles.coordsText}>Leaflet · QGIS2Web Layer</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    overflow: 'hidden',
  },
  mapControlBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    flexWrap: 'wrap',
    gap: 8,
  },
  layerButtonsGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  layerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: '#F2F0E8',
    borderWidth: 1,
    borderColor: '#E2DFD3',
    gap: 4,
  },
  layerBtnActive: {
    backgroundColor: '#4A7C3B',
    borderColor: '#3B642F',
  },
  layerBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4A7C3B',
  },
  layerBtnTextActive: {
    color: '#FFFFFF',
  },
  gisTag: {
    backgroundColor: '#EBF3E8',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  gisTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2E5A27',
  },
  mapCanvasArea: {
    width: '100%',
    height: 340,
    borderRadius: 16,
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2F4D28',
  },
  bgSatellite: {
    backgroundColor: '#1C3120', // Rich deep green satellite plantation aesthetic
  },
  bgNdvi: {
    backgroundColor: '#1E3E26', // Canopy index tint
  },
  bgSoilN: {
    backgroundColor: '#2D3B23', // Soil nitrogen heatmap tint
  },
  plotBoundaryBox: {
    ...StyleSheet.absoluteFillObject,
    margin: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(165, 214, 114, 0.55)',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 8,
  },
  plotCornerTL: {
    position: 'absolute',
    top: -2,
    left: -2,
    width: 10,
    height: 10,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderColor: '#A5D672',
  },
  plotCornerTR: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 10,
    height: 10,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderColor: '#A5D672',
  },
  plotCornerBL: {
    position: 'absolute',
    bottom: -2,
    left: -2,
    width: 10,
    height: 10,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderColor: '#A5D672',
  },
  plotCornerBR: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 10,
    height: 10,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderColor: '#A5D672',
  },
  plotBoundaryLabel: {
    fontSize: 10,
    color: 'rgba(215, 240, 180, 0.75)',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  gridOverlay: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
  },
  gridLineVertical: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  treePinOuter: {
    position: 'absolute',
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 5,
  },
  treePinOuterSelected: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderColor: '#A5D672',
  },
  treePinInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  treePinInnerDefault: {
    backgroundColor: '#7A9B48',
  },
  treePinInnerWarning: {
    backgroundColor: '#D65D45',
  },
  treePinInnerSelected: {
    backgroundColor: '#2E7D32',
  },
  treePinText: {
    fontSize: 12,
    fontWeight: '800',
  },
  treePinTextDefault: {
    color: '#FFFFFF',
  },
  treePinTextSelected: {
    color: '#FFFFFF',
  },
  gisInfoPopup: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2DFD3',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  popupHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  popupTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1B2C1A',
  },
  popupBadge: {
    backgroundColor: '#EAF5EA',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  popupBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2E7D32',
  },
  popupMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  popupMetricBox: {
    flex: 1,
  },
  popupMetricLabel: {
    fontSize: 10,
    color: '#6E7A6B',
    fontWeight: '600',
  },
  popupMetricVal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1B2C1A',
    marginTop: 2,
  },
  legendFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingHorizontal: 4,
    flexWrap: 'wrap',
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    color: '#6E7A6B',
    fontWeight: '600',
  },
  coordsText: {
    fontSize: 11,
    color: '#8D9B88',
    fontWeight: '600',
  },
});
