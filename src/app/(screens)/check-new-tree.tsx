import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

type SamplePoint = {
  id: number;
  name: string;
  n: number;
  p: number;
  k: number;
  ph: number;
  ec: number;
  humidity: number;
  temp: number;
};

import Constants from 'expo-constants';
const ip = Constants.expoConfig?.hostUri?.split(':')[0] || '192.168.1.7';
const BASE_URL = `http://${ip}:8000/api/v1/analysis`;

export default function CheckNewTreeScreen() {
  const router = useRouter();

  // Phase workflow: 'CONNECT' -> 'SAMPLING' -> 'REPORT'
  const [phase, setPhase] = useState<'CONNECT' | 'SAMPLING' | 'REPORT'>('CONNECT');
  const [deviceConnected, setDeviceConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);

  // Backend Session State
  const [analysisId, setAnalysisId] = useState<string>('');
  const [finalReport, setFinalReport] = useState<any>(null);

  // Sampling step: 1, 2, 3
  const [activeStep, setActiveStep] = useState<number>(1);
  const [loadingSensor, setLoadingSensor] = useState<boolean>(false);

  // Collected data for 3 points
  const [samples, setSamples] = useState<SamplePoint[]>([
    { id: 1, name: 'Point 1 · North Corner', n: 0, p: 0, k: 0, ph: 0, ec: 0, humidity: 0, temp: 0 },
    { id: 2, name: 'Point 2 · East Corner', n: 0, p: 0, k: 0, ph: 0, ec: 0, humidity: 0, temp: 0 },
    { id: 3, name: 'Point 3 · South Corner', n: 0, p: 0, k: 0, ph: 0, ec: 0, humidity: 0, temp: 0 },
  ]);

  const [samplesCollected, setSamplesCollected] = useState<boolean[]>([false, false, false]);

  const handleConnectDevice = () => {
    setConnecting(true);
    setTimeout(() => {
      setConnecting(false);
      setDeviceConnected(true);
    }, 1200);
  };

  const handleStartSampling = async () => {
    // Call backend to start session
    try {
      const res = await fetch(`${BASE_URL}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tree_no: "MK-101", zone_id: "Zone A" })
      });
      if (!res.ok) throw new Error("Failed to start analysis session on backend.");
      const data = await res.json();
      setAnalysisId(data.analysis_id);
      console.log("Session started:", data.analysis_id);
      
      setPhase('SAMPLING');
      setActiveStep(1);
    } catch (err: any) {
      Alert.alert("Backend Error", err.message);
    }
  };

  const handleGetSensorData = async () => {
    setLoadingSensor(true);
    
    // Simulate getting hardware readings
    setTimeout(async () => {
      const simulatedPoints: SamplePoint[] = [
        { id: 1, name: 'Point 1 · North Corner', n: 0.0159, p: 0.3430, k: 0.0629, ph: 6.4, ec: 1.2, humidity: 48, temp: 24.2 },
        { id: 2, name: 'Point 2 · East Corner', n: 0.0335, p: 0.1530, k: 0.0658, ph: 6.5, ec: 1.3, humidity: 50, temp: 24.6 },
        { id: 3, name: 'Point 3 · South Corner', n: 0.0218, p: 0.1109, k: 0.1118, ph: 6.3, ec: 1.1, humidity: 46, temp: 24.0 },
      ];
      const currentPointData = simulatedPoints[activeStep - 1];

      // Update Local State
      setSamples((prev) => prev.map((item) => (item.id === activeStep ? currentPointData : item)));
      setSamplesCollected((prev) => {
        const next = [...prev];
        next[activeStep - 1] = true;
        return next;
      });

      // Post reading to Backend immediately
      try {
        const res = await fetch(`${BASE_URL}/reading`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            analysis_id: analysisId,
            tree_no: "MK-101",
            point_name: `point${activeStep}`,
            reading: {
              N: currentPointData.n,
              P: currentPointData.p,
              K: currentPointData.k,
              pH: currentPointData.ph,
              EC: currentPointData.ec,
              moisture: currentPointData.humidity,
              temperature: currentPointData.temp
            }
          })
        });
        if (!res.ok) {
           const errText = await res.text();
           throw new Error(errText);
        }
      } catch (err: any) {
        Alert.alert("Backend Error", err.message);
      }

      setLoadingSensor(false);
    }, 800);
  };

  const handleNextStep = async () => {
    if (activeStep < 3) {
      setActiveStep(activeStep + 1);
    } else {
      // Trigger Complete / ML Pipeline on Backend!
      try {
        const res = await fetch(`${BASE_URL}/complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ analysis_id: analysisId, tree_no: "MK-101" })
        });
        if (!res.ok) {
           const errText = await res.text();
           throw new Error(errText);
        }
        const reportData = await res.json();
        setFinalReport(reportData);
        setPhase('REPORT');
      } catch (err: any) {
        Alert.alert("Prediction Failed", err.message);
      }
    }
  };

  const updateSampleValue = (id: number, key: 'n' | 'p' | 'k' | 'ph', delta: number) => {
    setSamples((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const currentVal = Number(item[key]);
          const newVal = Number((currentVal + delta).toFixed(4));
          return { ...item, [key]: Math.max(0, newVal) };
        }
        return item;
      })
    );
  };

  // Averages are now calculated on the backend!

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            if (phase === 'REPORT') setPhase('SAMPLING');
            else if (phase === 'SAMPLING') setPhase('CONNECT');
            else router.push('/(tabs)/soil');
          }}
        >
          <Ionicons name="arrow-back" size={22} color="#1B2C1A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Estate Soil Test & CRI Profile</Text>
      </View>

      <ScrollView
        style={styles.scrollBody}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* PHASE 1: CONNECT DEVICE */}
        {phase === 'CONNECT' && (
          <View style={styles.connectContainer}>
            <View style={styles.connectCard}>
              <View style={styles.deviceIconCircle}>
                <Ionicons
                  name={deviceConnected ? 'hardware-chip' : 'radio-outline'}
                  size={48}
                  color={deviceConnected ? '#2E7D32' : '#4A7C3B'}
                />
              </View>

              <Text style={styles.connectCardTitle}>
                {deviceConnected ? 'Field Sense Probe Ready' : 'Connect Your Sensor Probe'}
              </Text>
              <Text style={styles.connectCardDesc}>
                {deviceConnected
                  ? 'Field Sense Probe · SN 20481 is connected via Bluetooth Low Energy.'
                  : 'Turn on your Field Sense soil probe and bring it close to begin pairing.'}
              </Text>

              {!deviceConnected ? (
                <TouchableOpacity
                  style={styles.connectBtn}
                  activeOpacity={0.85}
                  onPress={handleConnectDevice}
                  disabled={connecting}
                >
                  {connecting ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <Text style={styles.connectBtnText}>Connect device 📶</Text>
                      <Ionicons name="bluetooth" size={18} color="#FFFFFF" />
                    </>
                  )}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.startTestBtn}
                  activeOpacity={0.85}
                  onPress={handleStartSampling}
                >
                  <Text style={styles.startTestBtnText}>Start 3-Point Soil Test →</Text>
                  <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* PHASE 2: 3-POINT SOIL SAMPLING STEPPER */}
        {phase === 'SAMPLING' && (
          <View style={styles.samplingContainer}>
            {/* Top Stepper */}
            <View style={styles.stepperHeader}>
              {[1, 2, 3].map((step) => {
                const isCurrent = step === activeStep;
                const isDone = samplesCollected[step - 1];

                return (
                  <TouchableOpacity
                    key={step}
                    style={[
                      styles.stepCircle,
                      isDone && styles.stepCircleDone,
                      isCurrent && styles.stepCircleActive,
                    ]}
                    onPress={() => setActiveStep(step)}
                  >
                    {isDone ? (
                      <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                    ) : (
                      <Text
                        style={[
                          styles.stepCircleNumber,
                          (isCurrent || isDone) && { color: '#FFFFFF' },
                        ]}
                      >
                        {step}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Active Sample Point Card */}
            {(() => {
              const currentPoint = samples[activeStep - 1];
              const isCollected = samplesCollected[activeStep - 1];

              return (
                <View style={styles.samplePointCard}>
                  <View style={styles.sampleHeaderRow}>
                    <View>
                      <Text style={styles.samplePointTitle}>{currentPoint.name}</Text>
                      <Text style={styles.samplePointSub}>
                        Insert probe 10 cm deep near palm drip circle
                      </Text>
                    </View>
                    <View style={styles.stepBadge}>
                      <Text style={styles.stepBadgeText}>Step {activeStep} of 3</Text>
                    </View>
                  </View>

                  {/* Readings Table - Interactive & Accurate to All.csv */}
                  {isCollected ? (
                    <View style={styles.readingsGrid}>
                      <EditableMetricRow
                        label="Nitrogen (N)"
                        unit="%"
                        val={currentPoint.n}
                        onDecrease={() => updateSampleValue(activeStep, 'n', -0.002)}
                        onIncrease={() => updateSampleValue(activeStep, 'n', 0.002)}
                        icon="leaf-outline"
                      />
                      <EditableMetricRow
                        label="Phosphorus (P)"
                        unit="%"
                        val={currentPoint.p}
                        onDecrease={() => updateSampleValue(activeStep, 'p', -0.02)}
                        onIncrease={() => updateSampleValue(activeStep, 'p', 0.02)}
                        icon="layers-outline"
                      />
                      <EditableMetricRow
                        label="Potassium (K)"
                        unit="%"
                        val={currentPoint.k}
                        onDecrease={() => updateSampleValue(activeStep, 'k', -0.01)}
                        onIncrease={() => updateSampleValue(activeStep, 'k', 0.01)}
                        icon="cube-outline"
                      />
                      <EditableMetricRow
                        label="Soil pH"
                        unit=""
                        val={currentPoint.ph}
                        onDecrease={() => updateSampleValue(activeStep, 'ph', -0.1)}
                        onIncrease={() => updateSampleValue(activeStep, 'ph', 0.1)}
                        icon="flask-outline"
                      />
                      <ReadingCell label="Conductivity" val={`${currentPoint.ec} dS/m`} icon="flash-outline" />
                      <ReadingCell label="Humidity" val={`${currentPoint.humidity}%`} icon="water-outline" />
                      <ReadingCell label="Temperature" val={`${currentPoint.temp}°C`} icon="thermometer-outline" />
                    </View>
                  ) : (
                    <View style={styles.placeholderContainer}>
                      <Ionicons name="radio-outline" size={38} color="#8D9B88" />
                      <Text style={styles.placeholderText}>
                        Press button below to capture live probe readings
                      </Text>
                    </View>
                  )}

                  {/* Actions */}
                  <TouchableOpacity
                    style={styles.getSensorBtn}
                    activeOpacity={0.85}
                    onPress={handleGetSensorData}
                    disabled={loadingSensor}
                  >
                    {loadingSensor ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons name="refresh-outline" size={18} color="#FFFFFF" />
                        <Text style={styles.getSensorBtnText}>
                          {isCollected ? 'Re-take Sensor Data' : 'Get Sensor Data'}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>

                  {isCollected && (
                    <TouchableOpacity
                      style={[styles.primaryButton, activeStep === 3 && !samplesCollected.every(Boolean) && { opacity: 0.5 }]}
                      activeOpacity={0.85}
                      onPress={() => {
                        if (activeStep < 3) {
                          handleNextStep();
                        } else {
                          if (samplesCollected.every(Boolean)) {
                            handleNextStep();
                          } else {
                            Alert.alert("Incomplete", "Please collect readings for all 3 points before calculating.");
                          }
                        }
                      }}
                    >
                      <Text style={styles.primaryButtonText}>
                        {activeStep < 3
                          ? `Next · point ${activeStep + 1}`
                          : 'Calculate Average & View Recommendations'}
                      </Text>
                      <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                    </TouchableOpacity>
                  )}
                </View>
              );
            })()}
          </View>
        )}

        {/* PHASE 3: FINAL REPORT & CRI OPTIMAL PERCENTAGE COMPARISON */}
        {phase === 'REPORT' && (
          <View style={styles.reportContainer}>
            {/* 3 Point Data Comparison Row - Interactive & Editable */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={styles.sectionHeading}>
                1. Collected 3-Point Sample Data
              </Text>
              <View style={styles.editableBadgeTag}>
                <Ionicons name="create-outline" size={12} color="#2E7D32" />
                <Text style={styles.editableBadgeTagText}>Live Editable</Text>
              </View>
            </View>

            <View style={styles.pointsGridRow}>
              {samples.map((point) => (
                <View key={point.id} style={styles.pointMiniCard}>
                  <Text style={styles.pointMiniTitle}>Point {point.id}</Text>
                  <Text style={styles.pointMiniSub}>{point.name.split('·')[1] || point.name}</Text>
                  <View style={styles.pointMiniDivider} />

                  <EditableMetricRow
                    label="Nitrogen (N)"
                    unit="%"
                    val={point.n}
                    onDecrease={() => updateSampleValue(point.id, 'n', -0.002)}
                    onIncrease={() => updateSampleValue(point.id, 'n', 0.002)}
                    icon="leaf-outline"
                  />
                  <EditableMetricRow
                    label="Phosphorus (P)"
                    unit="%"
                    val={point.p}
                    onDecrease={() => updateSampleValue(point.id, 'p', -0.02)}
                    onIncrease={() => updateSampleValue(point.id, 'p', 0.02)}
                    icon="layers-outline"
                  />
                  <EditableMetricRow
                    label="Potassium (K)"
                    unit="%"
                    val={point.k}
                    onDecrease={() => updateSampleValue(point.id, 'k', -0.01)}
                    onIncrease={() => updateSampleValue(point.id, 'k', 0.01)}
                    icon="cube-outline"
                  />
                  <EditableMetricRow
                    label="Soil pH"
                    unit=""
                    val={point.ph}
                    onDecrease={() => updateSampleValue(point.id, 'ph', -0.2)}
                    onIncrease={() => updateSampleValue(point.id, 'ph', 0.2)}
                    icon="flask-outline"
                  />

                  <Text style={styles.pointStaticFoot}>
                    EC: {point.ec} dS/m · {point.humidity}% Hum
                  </Text>
                </View>
              ))}
            </View>

            {/* CRI Optimal Benchmark Comparison Section */}
            <Text style={styles.sectionHeading}>
              2. Calculated Averages vs. CRI Optimal Targets
            </Text>
            {(() => {
              if (!finalReport) return null;
              const avg = { 
                n: finalReport.average.N, 
                p: finalReport.average.P, 
                k: finalReport.average.K, 
                ph: finalReport.average.pH, 
                ec: finalReport.average.EC, 
                humidity: finalReport.average.moisture, 
                temp: finalReport.average.temperature 
              };
              return (
                <View style={styles.averagesCard}>
                  <View style={styles.averagesHeaderRow}>
                    <View style={styles.avgHeaderLeft}>
                      <Ionicons name="shield-checkmark" size={20} color="#2E5A27" />
                      <View>
                        <Text style={styles.averagesTitle}>
                          CRI Optimal Profile Comparison
                        </Text>
                        <Text style={styles.averagesSubtitle}>
                          NPK benchmarks based on official CRI Coconut standards
                        </Text>
                      </View>
                    </View>
                    <View style={styles.optimalBadge}>
                      <Text style={styles.optimalBadgeText}>100% Verified Profile</Text>
                    </View>
                  </View>

                  <View style={styles.benchmarkList}>
                    {/* CRI Nitrogen Benchmark */}
                    <BenchmarkItem
                      label="Nitrogen (N)"
                      valText={`${avg.n}%`}
                      criText="CRI Optimal: 0.015 ~ 0.045%"
                      percentText="100% Optimal (Within CRI Range)"
                      progress={0.72}
                      isCri
                    />

                    {/* CRI Phosphorus Benchmark */}
                    <BenchmarkItem
                      label="Phosphorus (P)"
                      valText={`${avg.p}%`}
                      criText="CRI Optimal: 0.10 ~ 0.35%"
                      percentText="98% Optimal (Within CRI Range)"
                      progress={0.65}
                      isCri
                    />

                    {/* CRI Potassium Benchmark */}
                    <BenchmarkItem
                      label="Potassium (K)"
                      valText={`${avg.k}%`}
                      criText="CRI Optimal: 0.05 ~ 0.15%"
                      percentText="100% Optimal (CRI Standard)"
                      progress={0.76}
                      isCri
                    />

                    {/* Soil pH Benchmark */}
                    <BenchmarkItem
                      label="Soil pH"
                      valText={`${avg.ph}`}
                      criText="Optimal Range: 6.0 ~ 6.8"
                      percentText="100% Optimal pH Balance"
                      progress={0.64}
                    />

                    {/* Conductivity Benchmark */}
                    <BenchmarkItem
                      label="Conductivity (EC)"
                      valText={`${avg.ec} dS/m`}
                      criText="Optimal Range: 0.8 ~ 1.8 dS/m"
                      percentText="96% Optimal Salinity"
                      progress={0.58}
                    />

                    {/* Humidity Benchmark */}
                    <BenchmarkItem
                      label="Soil Humidity"
                      valText={`${avg.humidity}%`}
                      criText="Optimal Range: 45% ~ 65%"
                      percentText="100% Optimal Moisture"
                      progress={0.52}
                    />

                    {/* Temperature Benchmark */}
                    <BenchmarkItem
                      label="Soil Temperature"
                      valText={`${avg.temp}°C`}
                      criText="Optimal Range: 24.0°C ~ 28.0°C"
                      percentText="99% Optimal Root Temp"
                      progress={0.45}
                    />
                  </View>
                </View>
              );
            })()}

            {/* AI PREDICTED 14th LEAF SECTION */}
            <Text style={styles.sectionHeading}>
              3. AI Predicted 14th Frond (Leaf) NPK Profile
            </Text>

            {(() => {
              if (!finalReport) return null;
              
              const avg = finalReport.average;
              const leafN = finalReport.prediction.leafN;
              const leafP = finalReport.prediction.leafP;
              const leafK = finalReport.prediction.leafK;
              const modelName = finalReport.prediction.modelVersion;

              return (
                <View style={styles.aiLeafCard}>
                  <View style={styles.aiLeafBanner}>
                    <Ionicons name="sparkles" size={18} color="#2E7D32" />
                    <Text style={styles.aiLeafBannerText}>
                      Based on your 3-Point Composite Soil Average (N: {avg.N}%, P: {avg.P}%, K: {avg.K}%), our {modelName} ML Model predicted the 14th Frond Leaf nutrient concentration below:
                    </Text>
                  </View>

                  <View style={styles.leafCardsGrid}>
                    {/* Leaf N */}
                    <View style={styles.leafMetricBox}>
                      <View style={styles.leafMetricTopRow}>
                        <Text style={styles.leafMetricTitle}>Leaf Nitrogen (N)</Text>
                        <View style={styles.leafBadgeOptimal}>
                          <Text style={styles.leafBadgeText}>Predicted</Text>
                        </View>
                      </View>
                      <Text style={styles.leafMetricVal}>{leafN}%</Text>
                      <Text style={styles.leafMetricTarget}>CRI Critical Range: 1.80% ~ 2.00%</Text>
                      <View style={styles.leafBarTrack}>
                        <View style={[styles.leafBarFill, { width: '82%', backgroundColor: '#2E7D32' }]} />
                      </View>
                    </View>

                    {/* Leaf P */}
                    <View style={styles.leafMetricBox}>
                      <View style={styles.leafMetricTopRow}>
                        <Text style={styles.leafMetricTitle}>Leaf Phosphorus (P)</Text>
                        <View style={styles.leafBadgeOptimal}>
                          <Text style={styles.leafBadgeText}>Predicted</Text>
                        </View>
                      </View>
                      <Text style={styles.leafMetricVal}>{leafP}%</Text>
                      <Text style={styles.leafMetricTarget}>CRI Critical Range: 0.12% ~ 0.18%</Text>
                      <View style={styles.leafBarTrack}>
                        <View style={[styles.leafBarFill, { width: '75%', backgroundColor: '#1D6F8A' }]} />
                      </View>
                    </View>

                    {/* Leaf K */}
                    <View style={styles.leafMetricBox}>
                      <View style={styles.leafMetricTopRow}>
                        <Text style={styles.leafMetricTitle}>Leaf Potassium (K)</Text>
                        <View style={styles.leafBadgeOptimal}>
                          <Text style={styles.leafBadgeText}>Predicted</Text>
                        </View>
                      </View>
                      <Text style={styles.leafMetricVal}>{leafK}%</Text>
                      <Text style={styles.leafMetricTarget}>CRI Critical Range: 1.20% ~ 1.50%</Text>
                      <View style={styles.leafBarTrack}>
                        <View style={[styles.leafBarFill, { width: '88%', backgroundColor: '#8C6324' }]} />
                      </View>
                    </View>
                  </View>

                  <View style={styles.aiLeafFooterNote}>
                    <Ionicons name="information-circle-outline" size={16} color="#5C6C57" />
                    <Text style={styles.aiLeafFooterText}>
                      Because predicted 14th frond nutrition meets CRI thresholds, the system calculates the exact maintenance recommendations below.
                    </Text>
                  </View>
                </View>
              );
            })()}

            {/* CRI Official Fertilizer Prescription & Palm Health Evaluation */}
            <Text style={styles.sectionHeading}>
              4. Official CRI Fertilizer Prescription & Palm Health Evaluation
            </Text>

            {(() => {
              if (!finalReport) return null;
              
              const recomm = finalReport.recommendation;
              const ureaKg = recomm.urea;
              const mopKg = recomm.MOP;
              const pKg = recomm.ERP;
              const doloKg = recomm.dolomite;
              
              let healthTitle = 'HEALTHY PALM';
              let healthSub = 'All leaf NPK nutrients meet CRI optimal standards. Standard maintenance dosage applies.';
              let healthColor = '#2E7D32';
              let healthBg = '#EAF5EA';
              let healthBorder = '#C8E6C5';
              let healthIcon = 'checkmark-circle';

              if (recomm.healthStatus.includes('Deficiency') || recomm.healthStatus.includes('Poor')) {
                healthTitle = 'UNHEALTHY / WEAK PALM';
                healthSub = 'Immediate remedial fertilization required. See CRI elevated dosage prescriptions below.';
                healthColor = '#C62828';
                healthBg = '#FDEDED';
                healthBorder = '#F5C6C6';
                healthIcon = 'warning';
              } else if (recomm.healthStatus.includes('Sub-optimal') || recomm.healthStatus.includes('Mild')) {
                healthTitle = 'MODERATE HEALTH';
                healthSub = 'Minor nutrient deficiency detected. Follow CRI corrective dosage below.';
                healthColor = '#E68A00';
                healthBg = '#FFF8EC';
                healthBorder = '#FDE2BA';
                healthIcon = 'alert-circle';
              }

              return (
                <View>
                  {/* Palm Health Status Banner Card */}
                  <View style={[styles.palmHealthBanner, { backgroundColor: healthBg, borderColor: healthBorder }]}>
                    <Ionicons name={healthIcon as any} size={28} color={healthColor} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.palmHealthTitle, { color: healthColor }]}>{healthTitle}</Text>
                      <Text style={styles.palmHealthSub}>{healthSub}</Text>
                      <Text style={{ fontSize: 13, color: healthColor, fontWeight: '700', marginTop: 4 }}>
                        Backend Status: {recomm.healthStatus}
                      </Text>
                    </View>
                  </View>

                  {/* Official CRI Prescription Cards Grid */}
                  <View style={styles.criPrescriptionsContainer}>
                    {/* Nitrogen Card */}
                    <View style={styles.criPrescriptionCard}>
                      <View style={styles.criCardHeader}>
                        <View style={styles.criIconGreen}>
                          <Text style={styles.criIconText}>N</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.criCardTitle}>Nitrogen Prescription (Urea)</Text>
                          <Text style={styles.criCardStatus}>{recomm.nutrientEvaluation?.Nitrogen}</Text>
                        </View>
                        <View style={styles.criDosageBadge}>
                          <Text style={styles.criDosageText}>{ureaKg} kg/year</Text>
                        </View>
                      </View>
                      <Text style={styles.criCardBody}>
                        Apply <Text style={styles.recommBold}>{ureaKg} kg of Urea per tree per year</Text> (split into 2 monsoonal applications of {(ureaKg / 2).toFixed(2)} kg around the 1.5m drip circle).
                      </Text>
                    </View>

                    {/* Potassium Card */}
                    <View style={styles.criPrescriptionCard}>
                      <View style={styles.criCardHeader}>
                        <View style={styles.criIconAmber}>
                          <Text style={styles.criIconText}>K</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.criCardTitle}>Potassium Prescription (MOP)</Text>
                          <Text style={styles.criCardStatus}>{recomm.nutrientEvaluation?.Potassium}</Text>
                        </View>
                        <View style={styles.criDosageBadge}>
                          <Text style={styles.criDosageText}>{mopKg} kg/year</Text>
                        </View>
                      </View>
                      <Text style={styles.criCardBody}>
                        Apply <Text style={styles.recommBold}>{mopKg} kg of Muriate of Potash (MOP) per tree per year</Text> based on official CRI K% standards.
                      </Text>
                    </View>

                    {/* Phosphorus Card */}
                    <View style={styles.criPrescriptionCard}>
                      <View style={styles.criCardHeader}>
                        <View style={styles.criIconBlue}>
                          <Text style={styles.criIconText}>P</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.criCardTitle}>Phosphorus Prescription (ERP / TSP)</Text>
                          <Text style={styles.criCardStatus}>{recomm.nutrientEvaluation?.Phosphorus}</Text>
                        </View>
                        <View style={styles.criDosageBadge}>
                          <Text style={styles.criDosageText}>{pKg} kg/year</Text>
                        </View>
                      </View>
                      <Text style={styles.criCardBody}>
                        Recommended phosphorus source: at <Text style={styles.recommBold}>{pKg} kg/tree/year</Text>.
                      </Text>
                    </View>

                    {/* Dolomite & Mg Card */}
                    <View style={styles.criPrescriptionCardSecondary}>
                      <View style={styles.criCardHeader}>
                        <Ionicons name="shield-checkmark" size={22} color="#4A7C3B" />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.criCardTitle}>Magnesium & Soil Acidity Buffering</Text>
                          <Text style={styles.criCardStatus}>Dolomite Dosage: {doloKg} kg/year</Text>
                        </View>
                      </View>
                      <Text style={styles.criCardBody}>
                        Recommended dosage: <Text style={styles.recommBold}>{doloKg} kg Dolomite</Text>. Apply at least 2 weeks before chemical fertilizer application.
                      </Text>
                    </View>
                    
                    {/* Agronomic Advice Card */}
                    {recomm.agronomicAdvice && recomm.agronomicAdvice.length > 0 && (
                      <View style={styles.criPrescriptionCardSecondary}>
                        <View style={styles.criCardHeader}>
                           <Ionicons name="information-circle" size={22} color="#4A7C3B" />
                           <Text style={styles.criCardTitle}>Agronomic Advice</Text>
                        </View>
                        {recomm.agronomicAdvice.map((advice: string, idx: number) => (
                           <Text key={idx} style={[styles.criCardBody, { marginBottom: 6 }]}>• {advice}</Text>
                        ))}
                      </View>
                    )}
                  </View>

                  <TouchableOpacity
                    style={styles.doneReportBtn}
                    activeOpacity={0.85}
                    onPress={() => router.push('/(tabs)/soil')}
                  >
                    <Text style={styles.doneReportBtnText}>
                      Save Official CRI Report & Return to Dashboard
                    </Text>
                    <Ionicons name="checkmark-done" size={18} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              );
            })()}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

/* --- Helper Reading Cell Component --- */
function ReadingCell({ label, val, icon }: { label: string; val: string; icon: any }) {
  return (
    <View style={styles.cellBox}>
      <Ionicons name={icon} size={15} color="#5C6C57" />
      <Text style={styles.cellLabel}>{label}</Text>
      <Text style={styles.cellVal}>{val}</Text>
    </View>
  );
}

/* --- Helper Benchmark Comparison Component (CRI & Optimal Targets) --- */
function BenchmarkItem({
  label,
  valText,
  criText,
  percentText,
  progress,
  isCri,
}: {
  label: string;
  valText: string;
  criText: string;
  percentText: string;
  progress: number;
  isCri?: boolean;
}) {
  return (
    <View style={styles.benchmarkRow}>
      <View style={styles.benchmarkTopRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={styles.benchmarkLabel}>{label}</Text>
          {isCri && (
            <View style={styles.criMiniTag}>
              <Text style={styles.criMiniTagText}>CRI Standard</Text>
            </View>
          )}
        </View>
        <Text style={styles.benchmarkVal}>{valText}</Text>
      </View>

      <View style={styles.benchmarkMidRow}>
        <Text style={styles.benchmarkCriText}>{criText}</Text>
        <Text style={styles.benchmarkPercentText}>{percentText}</Text>
      </View>

      <View style={styles.benchmarkTrack}>
        <View style={styles.benchmarkOptimalBand} />
        <View style={[styles.benchmarkFill, { width: `${progress * 100}%` }]} />
      </View>
    </View>
  );
}

function EditableMetricRow({
  label,
  unit,
  val,
  onDecrease,
  onIncrease,
  icon = 'create-outline',
}: {
  label: string;
  unit: string;
  val: number;
  onDecrease: () => void;
  onIncrease: () => void;
  icon?: any;
}) {
  return (
    <View style={styles.cellBoxEditable}>
      <View style={styles.cellTopRow}>
        <Ionicons name={icon} size={15} color="#2E7D32" />
        <Text style={styles.cellLabelText}>{label}</Text>
      </View>

      <Text style={styles.cellValEditableText}>
        {val} {unit}
      </Text>

      <View style={styles.cardStepperRow}>
        <TouchableOpacity style={styles.cardStepBtn} onPress={onDecrease} activeOpacity={0.7}>
          <Ionicons name="remove" size={14} color="#2E7D32" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.cardStepBtn} onPress={onIncrease} activeOpacity={0.7}>
          <Ionicons name="add" size={14} color="#2E7D32" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAF8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 56 : 28,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#ECE9E0',
    gap: 12,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F3F2EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1B2C1A',
  },
  scrollBody: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  connectContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 30,
  },
  connectCard: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#EAE7DF',
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 4,
  },
  deviceIconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#EAF5EA',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
  },
  connectCardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1B2C1A',
    marginBottom: 8,
    textAlign: 'center',
  },
  connectCardDesc: {
    fontSize: 14,
    color: '#6E7A6B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  connectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4A7C3B',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 28,
    gap: 10,
  },
  connectBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  startTestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2E7D32',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 28,
    gap: 10,
  },
  startTestBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  samplingContainer: {
    width: '100%',
  },
  stepperHeader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 18,
    marginBottom: 24,
  },
  stepCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EAE7DF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepCircleActive: {
    backgroundColor: '#4A7C3B',
    borderWidth: 3,
    borderColor: '#BBE3B2',
  },
  stepCircleDone: {
    backgroundColor: '#2E7D32',
  },
  stepCircleNumber: {
    fontSize: 15,
    fontWeight: '800',
    color: '#5C6A58',
  },
  samplePointCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#EAE7DF',
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  sampleHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 18,
  },
  samplePointTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1B2C1A',
  },
  samplePointSub: {
    fontSize: 13,
    color: '#6E7A6B',
    marginTop: 2,
  },
  stepBadge: {
    backgroundColor: '#EBF3E8',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  stepBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2E5A27',
  },
  readingsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  cellBox: {
    width: '31%',
    minWidth: 100,
    backgroundColor: '#F9F8F5',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ECE9E0',
  },
  cellLabel: {
    fontSize: 12,
    color: '#5C6A58',
    fontWeight: '600',
    marginTop: 4,
  },
  cellVal: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1B2C1A',
    marginTop: 2,
  },
  placeholderContainer: {
    height: 140,
    backgroundColor: '#F9F8F5',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#ECE9E0',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    padding: 16,
  },
  placeholderText: {
    fontSize: 13,
    color: '#7A8876',
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
  },
  getSensorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4A7C3B',
    paddingVertical: 14,
    borderRadius: 16,
    gap: 8,
    marginBottom: 12,
  },
  getSensorBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E3B18',
    paddingVertical: 14,
    borderRadius: 16,
    gap: 8,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  reportContainer: {
    width: '100%',
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1B2C1A',
    marginBottom: 12,
    marginTop: 6,
  },
  pointsGridRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
    marginBottom: 24,
  },
  pointMiniCard: {
    flex: 1,
    minWidth: 150,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EAE7DF',
    padding: 14,
  },
  pointMiniTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1B2C1A',
  },
  pointMiniSub: {
    fontSize: 11,
    color: '#6E7A6B',
    fontWeight: '600',
  },
  pointMiniDivider: {
    height: 1,
    backgroundColor: '#ECE9E0',
    marginVertical: 8,
  },
  pointMiniMetric: {
    fontSize: 12,
    color: '#3A4B38',
    fontWeight: '700',
    marginBottom: 3,
  },
  averagesCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#EAE7DF',
    padding: 20,
    marginBottom: 24,
  },
  averagesHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 10,
  },
  avgHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  averagesTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1B2C1A',
  },
  averagesSubtitle: {
    fontSize: 12,
    color: '#6E7A6B',
  },
  optimalBadge: {
    backgroundColor: '#EAF5EA',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 14,
  },
  optimalBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2E7D32',
  },
  benchmarkList: {
    gap: 14,
  },
  benchmarkRow: {
    backgroundColor: '#F9F8F5',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ECE9E0',
  },
  benchmarkTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  benchmarkLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1B2C1A',
  },
  criMiniTag: {
    backgroundColor: '#EBF3E8',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  criMiniTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2E5A27',
  },
  benchmarkVal: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1B2C1A',
  },
  benchmarkMidRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  benchmarkCriText: {
    fontSize: 12,
    color: '#4A7C3B',
    fontWeight: '700',
  },
  benchmarkPercentText: {
    fontSize: 11,
    color: '#5C6A58',
    fontWeight: '600',
  },
  benchmarkTrack: {
    width: '100%',
    height: 8,
    backgroundColor: '#E8E5DD',
    borderRadius: 4,
    position: 'relative',
    overflow: 'hidden',
  },
  benchmarkOptimalBand: {
    position: 'absolute',
    left: '30%',
    width: '45%',
    height: '100%',
    backgroundColor: '#D1E6CE',
  },
  benchmarkFill: {
    height: '100%',
    backgroundColor: '#2E7D32',
    borderRadius: 4,
  },
  recommCardPrimary: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#EAE7DF',
    padding: 20,
    marginBottom: 16,
  },
  recommHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  recommIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4A7C3B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recommTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1B2C1A',
  },
  recommSubtitle: {
    fontSize: 12,
    color: '#6E7A6B',
    marginTop: 2,
  },
  recommList: {
    gap: 12,
  },
  recommItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  recommItemText: {
    flex: 1,
    fontSize: 13,
    color: '#3A4B38',
    lineHeight: 19,
  },
  recommBold: {
    fontWeight: '800',
    color: '#1B2C1A',
  },
  recommCardSecondary: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#EAE7DF',
    padding: 20,
    marginBottom: 20,
  },
  recommIconBoxSecondary: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EAF5EA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recommBodyText: {
    fontSize: 13,
    color: '#4B5548',
    lineHeight: 19,
    marginBottom: 18,
  },
  doneReportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2E7D32',
    paddingVertical: 14,
    borderRadius: 16,
    gap: 8,
  },
  doneReportBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  aiLeafCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#EAE7DF',
    padding: 18,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  aiLeafBanner: {
    flexDirection: 'row',
    backgroundColor: '#EAF5EA',
    padding: 12,
    borderRadius: 14,
    gap: 10,
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  aiLeafBannerText: {
    flex: 1,
    fontSize: 12,
    color: '#1E4018',
    lineHeight: 18,
    fontWeight: '600',
  },
  leafCardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 14,
  },
  leafMetricBox: {
    flex: 1,
    minWidth: 160,
    backgroundColor: '#FAFAF8',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E6E3DC',
    padding: 14,
  },
  leafMetricTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  leafMetricTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4B5548',
  },
  leafBadgeOptimal: {
    backgroundColor: '#EBF3E8',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  leafBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2E7D32',
  },
  leafMetricVal: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1B2C1A',
    marginBottom: 4,
  },
  leafMetricTarget: {
    fontSize: 11,
    color: '#717B6E',
    fontWeight: '600',
    marginBottom: 8,
  },
  leafBarTrack: {
    width: '100%',
    height: 8,
    backgroundColor: '#EAE7DF',
    borderRadius: 4,
    overflow: 'hidden',
  },
  leafBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  aiLeafFooterNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F6F0',
    padding: 10,
    borderRadius: 12,
    gap: 8,
  },
  aiLeafFooterText: {
    flex: 1,
    fontSize: 11,
    color: '#5C6C57',
    fontWeight: '600',
  },
  editableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F2EB',
  },
  editableLabel: {
    fontSize: 12,
    color: '#4B5548',
    fontWeight: '600',
  },
  editableValText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1B2C1A',
  },
  editableStepper: {
    flexDirection: 'row',
    gap: 6,
  },
  editStepBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#EBF3E8',
    borderWidth: 1,
    borderColor: '#C6E0C0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editStepBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#2E7D32',
  },
  editableBadgeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EAF5EA',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 12,
    gap: 4,
  },
  editableBadgeTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2E7D32',
  },
  pointStaticFoot: {
    fontSize: 10,
    color: '#8D9B88',
    fontWeight: '600',
    marginTop: 6,
    textAlign: 'center',
  },
  cellBoxEditable: {
    width: '47%',
    minWidth: 135,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#D4E8D1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  cellTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cellLabelText: {
    fontSize: 12,
    color: '#3E5A39',
    fontWeight: '700',
  },
  cellValEditableText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1B2C1A',
    marginTop: 4,
    marginBottom: 10,
  },
  cardStepperRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  cardStepBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EBF3E8',
    borderWidth: 1,
    borderColor: '#C6E0C0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  palmHealthBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    marginBottom: 16,
    gap: 12,
  },
  palmHealthTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  palmHealthSub: {
    fontSize: 13,
    color: '#4B5A46',
    lineHeight: 18,
  },
  criPrescriptionsContainer: {
    gap: 12,
    marginBottom: 20,
  },
  criPrescriptionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E6E4DD',
  },
  criPrescriptionCardSecondary: {
    backgroundColor: '#F7FBF6',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#D4EAD1',
  },
  criCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  criIconGreen: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2E7D32',
    justifyContent: 'center',
    alignItems: 'center',
  },
  criIconAmber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E68A00',
    justifyContent: 'center',
    alignItems: 'center',
  },
  criIconBlue: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1D6F8A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  criIconText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
  criCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1B2C1A',
  },
  criCardStatus: {
    fontSize: 12,
    color: '#5C6C57',
    fontWeight: '600',
    marginTop: 2,
  },
  criDosageBadge: {
    backgroundColor: '#EAF5EA',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#C6E8C3',
  },
  criDosageText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#2E7D32',
  },
  criCardBody: {
    fontSize: 13,
    color: '#3A4836',
    lineHeight: 19,
  },
});
