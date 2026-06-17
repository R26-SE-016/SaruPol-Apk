import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Image, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Camera } from 'expo-camera';
import { COLORS, ROUNDING } from '../../constants/theme';
import GlassCard from '../../components/common/GlassCard';
import GradientButton from '../../components/common/GradientButton';
import { classifyImage } from '../../services/pathologyService';
import { useAppStore } from '../../store/appStore';

export default function ScanScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const addHistoryItem = useAppStore(state => state.addHistoryItem);
  const language = useAppStore(state => state.language);

  const [selectedPart, setSelectedPart] = useState('leaf');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Coconut parts config
  const parts = [
    { id: 'leaf', label: language === 'en' ? '🍃 Leaf' : '🍃 අත්ත/කොළ' },
    { id: 'trunk', label: language === 'en' ? '🪵 Trunk' : '🪵 කඳ' },
    { id: 'crown', label: language === 'en' ? '👑 Crown' : '👑 කරටිය' },
    { id: 'root', label: language === 'en' ? '🕸️ Root' : '🕸️ මුල්' },
    { id: 'nut', label: language === 'en' ? '🥥 Nut' : '🥥 ගෙඩි' },
    { id: 'inflorescence', label: language === 'en' ? '🌾 Flower' : '🌾 කරල/මල' },
  ];

  const requestPermissions = async () => {
    if (Platform.OS !== 'web') {
      const cameraStatus = await Camera.requestCameraPermissionsAsync();
      const galleryStatus = await ImagePicker.requestMediaLibraryPermissionsAsync();
      return cameraStatus.granted && galleryStatus.granted;
    }
    return true;
  };

  const handlePickImage = async (useCamera: boolean) => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) {
      Alert.alert(t('common.error'), 'Camera or Gallery permissions are required.');
      return;
    }

    let result;
    const pickerOptions: ImagePicker.ImagePickerOptions = {
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    };

    if (useCamera) {
      result = await ImagePicker.launchCameraAsync(pickerOptions);
    } else {
      result = await ImagePicker.launchImageLibraryAsync(pickerOptions);
    }

    if (!result.canceled && result.assets && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      setImageBase64(result.assets[0].base64 || null);
    }
  };

  const handleScan = async () => {
    if (!imageBase64) {
      Alert.alert(t('common.error'), language === 'en' ? 'Please capture or choose an image first.' : 'කරුණාකර පළමුව ඡායාරූපයක් ලබාගන්න.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        imageBase64: imageBase64,
        part: selectedPart,
        system: 'B' as const // System B is the primary multi-label classifier
      };

      const result = await classifyImage(payload);
      
      // Save image to history along with prediction (we store base64 or Uri depending on storage space, Uri is local so we store that)
      const historyPayload = {
        type: 'pathology' as const,
        input: { part: selectedPart, imageUri },
        result: result
      };
      
      await addHistoryItem(historyPayload);
      
      // Navigate to pathology-result view
      // We pass the result via query parameters or use state. Since Zustand handles persistence, let's pass it via global store or local variables. 
      // The easiest way in Expo router is to save the result in the history and navigate. 
      router.push({
        pathname: '/(screens)/scan-result',
        params: { 
          part: selectedPart,
          status: result.status,
          diagnosis: result.diagnosis,
          confidence: result.confidence,
          severity: result.severity,
          chemical: result.recommendations?.chemical || '',
          cultural: result.recommendations?.cultural || '',
          preventive: result.recommendations?.preventive || '',
          imageUri: imageUri || ''
        }
      });
    } catch (err: any) {
      Alert.alert(t('common.error'), 'Diagnosis service failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const clearSelection = () => {
    setImageUri(null);
    setImageBase64(null);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{t('pathology.title')}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Instructions */}
        <Text style={styles.instructionsText}>{t('pathology.instruction')}</Text>

        {/* Part Selector */}
        <Text style={styles.sectionLabel}>{t('pathology.partSelectorTitle')}</Text>
        <View style={styles.partsGrid}>
          {parts.map((part) => (
            <TouchableOpacity
              key={part.id}
              style={[
                styles.partBtn,
                selectedPart === part.id && styles.partBtnSelected,
              ]}
              onPress={() => setSelectedPart(part.id)}
            >
              <Text style={[
                styles.partBtnText,
                selectedPart === part.id && styles.partBtnTextSelected
              ]}>
                {part.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Image Display / Selector */}
        <View style={styles.imageBox}>
          {imageUri ? (
            <View style={styles.imagePreviewContainer}>
              <Image source={{ uri: imageUri }} style={styles.imagePreview} />
              <TouchableOpacity style={styles.closeBtn} onPress={clearSelection}>
                <Ionicons name="close-circle" size={32} color={COLORS.diseased} />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.emptyImageWrapper}>
              <Ionicons name="camera" size={48} color={COLORS.textMuted} />
              <Text style={styles.emptyImageText}>
                {language === 'en' ? 'No Image Selected' : 'ඡායාරූපයක් තෝරාගෙන නැත'}
              </Text>
            </View>
          )}
        </View>

        {/* Photo Selection Buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.mediaButton}
            onPress={() => handlePickImage(true)}
          >
            <Ionicons name="camera-outline" size={20} color={COLORS.textPrimary} />
            <Text style={styles.mediaBtnText}>{t('pathology.captureBtn')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.mediaButton}
            onPress={() => handlePickImage(false)}
          >
            <Ionicons name="image-outline" size={20} color={COLORS.textPrimary} />
            <Text style={styles.mediaBtnText}>{t('pathology.galleryBtn')}</Text>
          </TouchableOpacity>
        </View>

        {/* Scan Actions */}
        {imageUri && (
          <GradientButton
            title={language === 'en' ? 'Run AI Diagnosis' : 'රෝගය හඳුනාගන්න (AI)'}
            onPress={handleScan}
            loading={loading}
            style={styles.scanBtn}
          />
        )}

        {/* Library Reference Link */}
        <TouchableOpacity
          style={styles.libraryBtn}
          onPress={() => {
            Alert.alert(
              t('pathology.diseaseLibrary'),
              language === 'en'
                ? 'SaruPol identifies: Leaf Blight, Gray Leaf Spot, Bud Rot, Stem Bleeding, Root Wilt, Rhinoceros Beetle damage, Red Palm Weevil damage, and Nut Fall.'
                : 'සරුපොල් මඟින්: කොළ අංගමාරය, කුණු වීම්, කඳෙන් මැලියම් වැගිරීම්, මුල් මැලවීම්, රතු කුරුමිණි හානි සහ ගෙඩි හැලීම් හඳුනාගත හැක.'
            );
          }}
        >
          <Ionicons name="library-outline" size={18} color={COLORS.primaryLight} />
          <Text style={styles.libraryBtnText}>{t('pathology.diseaseLibrary')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 30,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(76, 175, 80, 0.12)',
    backgroundColor: COLORS.surface,
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
  },
  instructionsText: {
    color: COLORS.textPrimary,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
    textAlign: 'center',
  },
  sectionLabel: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  partsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  partBtn: {
    backgroundColor: COLORS.surface,
    borderColor: 'rgba(76, 175, 80, 0.15)',
    borderWidth: 1.5,
    borderRadius: ROUNDING.sm,
    paddingVertical: 10,
    paddingHorizontal: 16,
    minWidth: '47%',
    flexGrow: 1,
    alignItems: 'center',
  },
  partBtnSelected: {
    borderColor: COLORS.primaryLight,
    backgroundColor: 'rgba(27, 94, 32, 0.25)',
  },
  partBtnText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  partBtnTextSelected: {
    color: COLORS.textPrimary,
    fontWeight: 'bold',
  },
  imageBox: {
    width: '100%',
    height: 250,
    borderRadius: ROUNDING.md,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(76, 175, 80, 0.25)',
    backgroundColor: 'rgba(27, 94, 32, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: 20,
  },
  imagePreviewContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  closeBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 10,
  },
  emptyImageWrapper: {
    alignItems: 'center',
    gap: 10,
  },
  emptyImageText: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontWeight: '500',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  mediaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.surface,
    borderColor: 'rgba(76, 175, 80, 0.15)',
    borderWidth: 1,
    borderRadius: ROUNDING.sm,
    paddingVertical: 12,
    width: '48%',
  },
  mediaBtnText: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: 'bold',
  },
  scanBtn: {
    marginBottom: 20,
  },
  libraryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  libraryBtnText: {
    color: COLORS.primaryLight,
    fontWeight: 'bold',
    fontSize: 14,
  },
});
