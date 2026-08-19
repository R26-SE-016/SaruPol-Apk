import React from 'react';
import { View } from 'react-native';
import { Calendar } from 'lucide-react-native';

interface Props {
  date: string;
  setDate: (d: string) => void;
}

export function DatePickerField({ date, setDate }: Props) {
  return (
    <View className="flex-row items-center bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm relative">
       <Calendar size={18} color="#94a3b8" className="mr-3" />
       {/* Use a native HTML input for Web since DateTimePicker isn't supported */}
       <input 
         type="date"
         value={date}
         onChange={(e) => setDate(e.target.value)}
         style={{
           flex: 1,
           border: 'none',
           outline: 'none',
           fontSize: '14px',
           fontWeight: 'bold',
           color: date ? '#1e293b' : '#94a3b8',
           backgroundColor: 'transparent'
         }}
       />
    </View>
  );
}
