import React from 'react';
import { Text, View } from 'react-native';

/** Placeholder for the Orders tab on both surfaces until ordering ships. */
export function OrdersPlaceholder() {
  return (
    <View className="flex-1 bg-white justify-center items-center">
      <Text className="text-gray-500">Orders tab content here</Text>
    </View>
  );
}
