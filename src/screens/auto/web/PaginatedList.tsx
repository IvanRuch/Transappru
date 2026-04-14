import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

interface PaginatedListProps {
  data: any[];
  renderItem: (item: any, index: number) => React.ReactNode;
  initialCount?: number;
  step?: number;
}

export function PaginatedList({ data, renderItem, initialCount = 5, step = 20 }: PaginatedListProps) {
  const [visibleCount, setVisibleCount] = useState(initialCount);

  if (!data || data.length === 0) return null;

  const visibleData = data.slice(0, visibleCount);

  return (
    <View>
      {visibleData.map((item, index) => renderItem(item, index))}

      {visibleCount < data.length && (
        <TouchableOpacity
          onPress={() => setVisibleCount(prev => prev + step)}
          style={{
            padding: 15,
            alignItems: 'center',
            backgroundColor: '#F0F0F0',
            marginHorizontal: 20,
            marginBottom: 10,
            borderRadius: 8,
          }}
        >
          <Text style={{ color: '#3A3A3A', fontWeight: 'bold' }}>
            Показать ещё {Math.min(step, data.length - visibleCount)} (осталось {data.length - visibleCount})
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
