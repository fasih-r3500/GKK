import { Plus } from 'lucide-react-native';
import React from 'react';
import { Switch, Text, TouchableOpacity, View } from 'react-native';

import { KitchenInfoCard } from './KitchenInfoCard';
import type { ChefProfile } from './types';

type ChefOverviewHeaderProps = {
  kitchen: ChefProfile | null;
  userId: string;
  dishCount: number;
  isAcceptingOrders: boolean;
  onToggleAcceptingOrders: (value: boolean) => void;
  onKitchenSaved: () => Promise<void> | void;
  onAddDish: () => void;
};

const ORDER_SWITCH_TRACK = { false: '#767577', true: '#4ade80' };

/** Header plus kitchen card above the dish list. Kept separate so list rows stay untouched. */
export const ChefOverviewHeader = React.memo(function ChefOverviewHeader({
  kitchen,
  userId,
  dishCount,
  isAcceptingOrders,
  onToggleAcceptingOrders,
  onKitchenSaved,
  onAddDish,
}: ChefOverviewHeaderProps) {
  return (
    <>
      {/* Header */}
      <View className="px-5 py-4 bg-[#76AB85]">
        <View className="flex-row justify-between items-center">
          <View className="flex-1">
            <Text className="text-2xl font-heavy text-white">{kitchen?.kitchen_name}</Text>
            <Text className="text-sm text-white/80 mt-1">Chef Dashboard</Text>
          </View>
        </View>

        {/* Order Toggle */}
        <View className="flex-row justify-between items-center mt-4 bg-white/10 rounded-xl p-4">
          <View>
            <Text className="text-white font-heavy">Accepting Orders</Text>
            <Text className="text-white/70 text-xs">
              {isAcceptingOrders ? 'Customers can order' : 'Orders paused'}
            </Text>
          </View>
          <Switch
            value={isAcceptingOrders}
            onValueChange={onToggleAcceptingOrders}
            trackColor={ORDER_SWITCH_TRACK}
            thumbColor={isAcceptingOrders ? '#fff' : '#f4f3f4'}
          />
        </View>
      </View>

      {/* Kitchen Info Card with Inline Editing */}
      <KitchenInfoCard kitchen={kitchen} userId={userId} onSaved={onKitchenSaved} />

      {/* Menu Management */}
      <View className="px-5 mt-6">
        <View className="flex-row justify-between items-center mb-4">
          <View>
            <Text className="text-2xl font-heavy text-black">Your Menu</Text>
            <Text className="text-sm text-gray-600 font-book">
              {dishCount} {dishCount === 1 ? 'dish' : 'dishes'}
            </Text>
          </View>
          <TouchableOpacity
            onPress={onAddDish}
            className="bg-[#76AB85] rounded-full px-4 py-3 flex-row items-center"
          >
            <Plus size={20} color="#FFF" />
            <Text className="text-white font-semibold ml-2">Add Dish</Text>
          </TouchableOpacity>
        </View>
      </View>
    </>
  );
});
