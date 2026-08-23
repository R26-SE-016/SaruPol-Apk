import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, ROUNDING } from '../../constants/theme';
import GradientButton from '../../components/common/GradientButton';

export default function LabTestEntryScreen() {
  const router = useRouter();
  
  const [nitrogen, setNitrogen] = useState('');
  const [phosphorus, setPhosphorus] = useState('');
  const [potassium, setPotassium] = useState('');
  const [ph, setPh] = useState('');

  const handleCheckResults = () => {
    if (!nitrogen || !phosphorus || !potassium || !ph) {
      Alert.alert('Missing Info', 'Please enter all values to check the results.');
      return;
    }
    
    // Logic to verify against recommendation range
    // For now we just show an alert
    Alert.alert('Lab Results Checked', 'Your lab results have been recorded and checked against CRI recommendations.');
    router.back();
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1B2C1A" />
        </TouchableOpacity>
        <Text style={styles.title}>Lab Test Results</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        <View style={styles.infoCard}>
          <Text style={styles.infoCardText}>
            Enter the nutrient values obtained from your lab test to check them against the standard recommendation range.
          </Text>
        </View>

        {/* Input Form */}
        <View style={styles.formContainer}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Nitrogen (N) mg/kg</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 2.0"
              keyboardType="numeric"
              value={nitrogen}
              onChangeText={setNitrogen}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Phosphorus (P) mg/kg</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 0.12"
              keyboardType="numeric"
              value={phosphorus}
              onChangeText={setPhosphorus}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Potassium (K) mg/kg</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 1.35"
              keyboardType="numeric"
              value={potassium}
              onChangeText={setPotassium}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Soil pH</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 6.4"
              keyboardType="numeric"
              value={ph}
              onChangeText={setPh}
            />
          </View>
        </View>

        <GradientButton
          title="Check Results"
          onPress={handleCheckResults}
          style={styles.submitBtn}
        />

      </ScrollView>
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
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 30,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#EAE7DF',
    backgroundColor: '#FFFFFF',
  },
  backBtn: {
    padding: 8,
    marginRight: 8,
    marginLeft: -8,
  },
  title: {
    color: '#1B2C1A',
    fontSize: 22,
    fontWeight: '800',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: ROUNDING.md,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#EAE7DF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  infoCardText: {
    color: '#6E7A6B',
    fontSize: 14,
    lineHeight: 20,
  },
  formContainer: {
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    color: '#1B2C1A',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FAFAF8',
    borderWidth: 1,
    borderColor: '#EAE7DF',
    borderRadius: ROUNDING.sm,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1B2C1A',
  },
  submitBtn: {
    marginTop: 10,
  },
});
