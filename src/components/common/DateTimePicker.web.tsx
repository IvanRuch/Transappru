import React from 'react';

interface DateTimePickerProps {
  value: Date;
  mode?: 'date' | 'time' | 'datetime';
  display?: string;
  onChange?: (event: any, date?: Date) => void;
  minimumDate?: Date;
  maximumDate?: Date;
  locale?: string;
}

export default function DateTimePicker({
  value,
  mode = 'date',
  onChange,
  minimumDate,
  maximumDate,
}: DateTimePickerProps) {
  const formatForInput = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateStr = e.target.value;
    if (dateStr) {
      const newDate = new Date(dateStr + 'T00:00:00');
      onChange?.({ type: 'set', nativeEvent: { timestamp: newDate.getTime() } }, newDate);
    }
  };

  const inputType = mode === 'time' ? 'time' : mode === 'datetime' ? 'datetime-local' : 'date';

  return (
    <input
      type={inputType}
      value={formatForInput(value)}
      onChange={handleChange}
      min={minimumDate ? formatForInput(minimumDate) : undefined}
      max={maximumDate ? formatForInput(maximumDate) : undefined}
      style={{
        fontSize: 16,
        padding: 10,
        borderRadius: 8,
        border: '1px solid #656565',
        backgroundColor: '#FFFFFF',
        color: '#313131',
        width: '100%',
      }}
    />
  );
}
