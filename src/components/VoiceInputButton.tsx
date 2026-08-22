import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Alert,
  Platform,
} from 'react-native';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, ROUNDING } from '../constants/theme';
import { transcribeAudio } from '../services/advisoryService';

export type VoiceState = 'IDLE' | 'RECORDING' | 'PROCESSING' | 'ERROR';

interface VoiceInputButtonProps {
  language?: string; // 'en', 'si', 'ta', 'auto'
  onTranscriptionComplete: (text: string, detectedLanguage?: string) => void;
  onError?: (error: string) => void;
  onRecordingStateChange?: (state: VoiceState) => void;
  disabled?: boolean;
  size?: number;
}

const RECORDING_OPTIONS: Audio.RecordingOptions = {
  isMeteringEnabled: true,
  android: {
    extension: '.m4a',
    outputFormat: Audio.AndroidOutputFormat.MPEG_4,
    audioEncoder: Audio.AndroidAudioEncoder.AAC,
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 64000,
  },
  ios: {
    extension: '.m4a',
    audioQuality: Audio.IOSAudioQuality.HIGH,
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 64000,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: {
    mimeType: 'audio/webm',
    bitsPerSecond: 64000,
  },
};

export default function VoiceInputButton({
  language = 'auto',
  onTranscriptionComplete,
  onError,
  onRecordingStateChange,
  disabled = false,
  size = 36,
}: VoiceInputButtonProps) {
  const [state, setState] = useState<VoiceState>('IDLE');
  const [durationSeconds, setDurationSeconds] = useState(0);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const timerRef = useRef<any>(null);
  const silenceTimerRef = useRef<any>(null);
  const hasSpokenRef = useRef(false);
  const isProcessingRef = useRef(false);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseLoop = useRef<Animated.CompositeAnimation | null>(null);

  // Notify parent of state changes
  const updateState = (newState: VoiceState) => {
    setState(newState);
    onRecordingStateChange?.(newState);
  };

  // Start pulsing animation when recording
  useEffect(() => {
    if (state === 'RECORDING') {
      pulseLoop.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.3,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1.0,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      );
      pulseLoop.current.start();
    } else {
      if (pulseLoop.current) {
        pulseLoop.current.stop();
        pulseLoop.current = null;
      }
      pulseAnim.setValue(1);
    }

    return () => {
      if (pulseLoop.current) {
        pulseLoop.current.stop();
      }
    };
  }, [state]);

  // Clean up timers and recording on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(() => {});
      }
    };
  }, []);

  const getPermissionAlertMessage = () => {
    if (language === 'si') {
      return 'හඬ ආදානය සඳහා මයික්‍රෆෝනයට ප්‍රවේශය අවශ්‍යයි. කරුණාකර සැකසුම් වෙත ගොස් අවසර දෙන්න.';
    }
    if (language === 'ta') {
      return 'குரல் உள்ளீட்டைப் பயன்படுத்த மைக்ரோஃபோன் அனுமதி தேவை. தயவுசெய்து அமைப்புகளில் அனுமதி வழங்கவும்.';
    }
    return 'Microphone access is needed for voice input. Please grant microphone permission.';
  };

  const getErrorMessage = (err: any) => {
    if (language === 'si') {
      return 'හඬ හඳුනාගැනීම අසාර්ථක විය. කරුණාකර නැවත උත්සාහ කරන්න.';
    }
    if (language === 'ta') {
      return 'குரல் உள்ளீடு தோல்வியடைந்தது. மீண்டும் முயற்சிக்கவும்.';
    }
    return err?.response?.data?.detail || err?.message || 'Failed to transcribe audio. Please try again.';
  };

  const getListeningText = () => {
    if (language === 'si') return 'අහගෙන ඉන්නේ...';
    if (language === 'ta') return 'கேட்கிறது...';
    return 'Listening...';
  };

  const onRecordingStatusUpdate = (status: Audio.RecordingStatus) => {
    if (!status.isRecording || isProcessingRef.current) return;

    const metering = status.metering;
    if (metering !== undefined) {
      // Speech detected threshold (typically -38 dB to -10 dB)
      if (metering > -38) {
        hasSpokenRef.current = true;
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }
      } else if (hasSpokenRef.current && metering <= -40) {
        // User has spoken and is now silent: auto-stop after 1.2 seconds of silence!
        if (!silenceTimerRef.current) {
          silenceTimerRef.current = setTimeout(() => {
            if (!isProcessingRef.current && recordingRef.current) {
              void stopRecordingAndTranscribe();
            }
          }, 1200);
        }
      }
    }

    // Safety timeout: auto-stop after 15 seconds of speaking
    if (hasSpokenRef.current && status.durationMillis > 15000) {
      void stopRecordingAndTranscribe();
    }
  };

  const startRecording = async () => {
    try {
      // 1. Check & Request Permissions
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          language === 'si' ? 'අවසර අවශ්‍යයි' : language === 'ta' ? 'அனுமதி தேவை' : 'Permission Required',
          getPermissionAlertMessage()
        );
        return;
      }

      // 2. Trigger Haptic Feedback
      if (Platform.OS !== 'web') {
        try {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        } catch (_) {}
      }

      // 3. Configure Audio Mode for Recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        playThroughEarpieceAndroid: false,
      });

      // 4. Create and Prepare Recording with Metering & Status Updates
      hasSpokenRef.current = false;
      isProcessingRef.current = false;
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(RECORDING_OPTIONS);
      recording.setProgressUpdateInterval(100);
      recording.setOnRecordingStatusUpdate(onRecordingStatusUpdate);
      await recording.startAsync();

      recordingRef.current = recording;

      // 5. Start Duration Timer
      setDurationSeconds(0);
      timerRef.current = setInterval(() => {
        setDurationSeconds((prev) => prev + 1);
      }, 1000);

      updateState('RECORDING');
    } catch (err: any) {
      console.error('Failed to start recording:', err);
      updateState('ERROR');
      onError?.(err?.message || 'Failed to start recording');
      setTimeout(() => updateState('IDLE'), 2000);
    }
  };

  const stopRecordingAndTranscribe = async () => {
    if (!recordingRef.current || isProcessingRef.current) return;
    isProcessingRef.current = true;

    try {
      // 1. Clear Duration & Silence Timers
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }

      // 2. Trigger Haptic Feedback
      if (Platform.OS !== 'web') {
        try {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch (_) {}
      }

      // 3. Stop and Unload Recording
      updateState('PROCESSING');
      const recording = recordingRef.current;
      await recording.stopAndUnloadAsync();

      // Reset audio mode to playback only
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });

      const uri = recording.getURI();
      recordingRef.current = null;

      if (!uri) {
        throw new Error('No audio file URI available');
      }

      // Check if recording was too short (< 0.5s)
      if (durationSeconds < 1 && !hasSpokenRef.current) {
        console.log('Recording too short, discarding');
        isProcessingRef.current = false;
        updateState('IDLE');
        return;
      }

      // 4. Send to Backend STT /transcribe endpoint
      const result = await transcribeAudio(uri, language);

      if (result.success && result.transcribed_text) {
        onTranscriptionComplete(result.transcribed_text.trim(), result.detected_language);
        updateState('IDLE');
      } else {
        throw new Error(result.error || 'Empty transcription result');
      }
    } catch (err: any) {
      console.warn('Transcription failed:', err);
      updateState('ERROR');
      const friendlyErr = getErrorMessage(err);
      onError?.(friendlyErr);

      // Revert to IDLE after 2.5 seconds
      setTimeout(() => {
        updateState('IDLE');
      }, 2500);
    } finally {
      isProcessingRef.current = false;
    }
  };

  const handlePress = () => {
    if (disabled || state === 'PROCESSING') return;

    if (state === 'RECORDING') {
      stopRecordingAndTranscribe();
    } else {
      startRecording();
    }
  };

  return (
    <View style={styles.wrapper}>
      {/* Listening indicator when recording */}
      {state === 'RECORDING' && (
        <View style={styles.listeningBadge}>
          <View style={styles.recordingDot} />
          <Text style={styles.listeningText}>{getListeningText()}</Text>
        </View>
      )}

      {/* Processing indicator text */}
      {state === 'PROCESSING' && (
        <View style={styles.processingBadge}>
          <Text style={styles.processingText}>
            {language === 'si' ? 'හඳුනාගනිමින්...' : language === 'ta' ? 'உரையாக்குகிறது...' : 'Transcribing...'}
          </Text>
        </View>
      )}

      {/* Button with animated pulse when recording */}
      <TouchableOpacity
        onPress={handlePress}
        disabled={disabled || state === 'PROCESSING'}
        activeOpacity={0.8}
        style={[
          styles.button,
          { width: size, height: size, borderRadius: size / 2 },
          state === 'RECORDING' && styles.buttonRecording,
          state === 'PROCESSING' && styles.buttonProcessing,
          state === 'ERROR' && styles.buttonError,
        ]}
      >
        {state === 'RECORDING' && (
          <Animated.View
            style={[
              styles.pulseRing,
              {
                width: size + 10,
                height: size + 10,
                borderRadius: (size + 10) / 2,
                transform: [{ scale: pulseAnim }],
              },
            ]}
          />
        )}

        {state === 'IDLE' && (
          <Ionicons name="mic" size={size * 0.52} color={COLORS.textPrimary} />
        )}

        {state === 'RECORDING' && (
          <Ionicons name="mic" size={size * 0.54} color={COLORS.textPrimary} />
        )}

        {state === 'PROCESSING' && (
          <ActivityIndicator size="small" color={COLORS.primaryLight} />
        )}

        {state === 'ERROR' && (
          <Ionicons name="alert-circle" size={size * 0.52} color="#EF5350" />
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    backgroundColor: 'rgba(76, 175, 80, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonRecording: {
    backgroundColor: 'rgba(76, 175, 80, 0.45)',
    borderColor: COLORS.primaryLight,
  },
  buttonProcessing: {
    backgroundColor: 'rgba(27, 94, 32, 0.4)',
    borderColor: COLORS.primaryLight,
  },
  buttonError: {
    backgroundColor: 'rgba(239, 83, 80, 0.25)',
    borderColor: 'rgba(239, 83, 80, 0.5)',
  },
  pulseRing: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: 'rgba(76, 175, 80, 0.6)',
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
  },
  listeningBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.4)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: ROUNDING.full,
    marginRight: 6,
    gap: 6,
  },
  recordingDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: COLORS.healthy,
  },
  listeningText: {
    color: COLORS.textPrimary,
    fontSize: 11,
    fontWeight: '700',
  },
  processingBadge: {
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: ROUNDING.full,
    marginRight: 6,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
  processingText: {
    color: COLORS.primaryLight,
    fontSize: 11,
    fontWeight: '600',
  },
});
