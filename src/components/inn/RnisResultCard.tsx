import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';

interface RnisResultCardProps {
  loading: boolean;
  /** Response from /check-rnis — shape depends on backend. */
  data: {
    rnis_status?: string;
    rnis_owner?: string;
    rnis_brand?: string;
    rnis_model?: string;
    rnis_year?: string;
  } | null;
}

/**
 * Shows the result of a RNIS registration check. Three states:
 *   - loading: spinner
 *   - no data: "not found" message
 *   - data: formatted list of known fields (skips empty ones)
 */
export default function RnisResultCard({ loading, data }: RnisResultCardProps) {
  if (!loading && !data) return null;

  return (
    <View className="mt-5 p-5 bg-bg-secondary rounded-lg border border-border-primary">
      {loading ? (
        <ActivityIndicator size="large" color="#313131" />
      ) : (
        <>
          <Text className="text-lg font-bold text-text-primary mb-2.5 select-none">
            Результат проверки:
          </Text>
          {data?.rnis_status ? (
            <View>
              <Text className="text-base text-text-primary mb-1.5">Статус: {data.rnis_status}</Text>
              {data.rnis_owner && (
                <Text className="text-base text-text-primary mb-1.5">Владелец: {data.rnis_owner}</Text>
              )}
              {data.rnis_brand && (
                <Text className="text-base text-text-primary mb-1.5">Марка: {data.rnis_brand}</Text>
              )}
              {data.rnis_model && (
                <Text className="text-base text-text-primary mb-1.5">Модель: {data.rnis_model}</Text>
              )}
              {data.rnis_year && (
                <Text className="text-base text-text-primary mb-1.5">Год выпуска: {data.rnis_year}</Text>
              )}
            </View>
          ) : (
            <Text className="text-base text-text-secondary">Данные не найдены</Text>
          )}
        </>
      )}
    </View>
  );
}
