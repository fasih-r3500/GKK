import { Star } from 'lucide-react-native';
import React, { memo, useCallback } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import { RemoteImage } from '../ui/RemoteImage';

export type ChefListItem = {
  id: string;
  kitchen_name: string;
  cuisine_types: string[] | null;
  food_hygiene_rating: number | null;
  kitchen_image_url: string | null;
  latitude: number | null;
  longitude: number | null;
  kitchen_address: string | null;
  distance?: number | null;
};

type ChefCardProps = {
  chef: ChefListItem;
  onOpen: (chefId: string) => void;
};

const CARD_IMAGE_SIZE = 80;

function ChefCardBase({ chef, onOpen }: ChefCardProps) {
  const handleOpen = useCallback(() => onOpen(chef.id), [chef.id, onOpen]);

  return (
    <View className="flex-row items-center bg-gray-50 rounded-2xl mb-4 p-3 shadow-sm">
      <RemoteImage
        uri={chef.kitchen_image_url}
        width={CARD_IMAGE_SIZE}
        height={CARD_IMAGE_SIZE}
        className="w-20 h-20 rounded-xl mr-4 overflow-hidden"
        accessibilityLabel={`${chef.kitchen_name} kitchen photo`}
      />

      <View className="flex-1">
        <Text className="text-lg font-heavy text-gray-800">{chef.kitchen_name}</Text>
        <View className="flex-row items-center mt-1">
          <Star size={16} color="#facc15" fill="#facc15" />
          <Text className="ml-1 text-sm font-regular text-gray-600">
            {chef.cuisine_types?.join(', ') || 'Cuisine'} · {chef.food_hygiene_rating ?? 'N/A'}★
          </Text>
        </View>

        {chef.distance ? (
          <Text className="text-xs text-gray-500 mt-1">📍 {chef.distance} km away</Text>
        ) : null}

        <TouchableOpacity
          className="bg-green-600 mt-3 rounded-full py-1.5 px-4 self-start"
          onPress={handleOpen}
        >
          <Text className="font-book text-white text-sm">View Kitchen</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/** A kitchen row. Memoised so scrolling and header changes do not rebuild every card. */
export const ChefCard = memo(ChefCardBase);
