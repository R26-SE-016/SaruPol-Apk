import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Calendar, ChevronRight } from 'lucide-react-native';

interface Props {
  date: string;
  setDate: (d: string) => void;
}

export function DatePickerField({ date, setDate }: Props) {
  const [show, setShow] = useState(false);
  return (
    <View>
      <TouchableOpacity onPress={() => setShow(true)} className="flex-row items-center bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm">
         <Calendar size={18} color="#94a3b8" className="mr-3" />
         <Text className={`flex-1 text-sm font-bold ${date ? 'text-slate-800' : 'text-slate-400'}`}>
           {date || "YYYY-MM-DD"}
         </Text>
         <ChevronRight size={18} color="#94a3b8" />
      </TouchableOpacity>
      {show && (
        <DateTimePicker
          value={date ? new Date(date) : new Date()}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShow(false);
            if (selectedDate) setDate(selectedDate.toISOString().slice(0, 10));
          }}
        />
      )}
    </View>
  );
}
