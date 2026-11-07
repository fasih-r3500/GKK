import { Edit } from 'lucide-react-native';
import React, { memo, useCallback } from 'react';
import { Switch, Text, TouchableOpacity, View } from 'react-native';

import { resolveStorageImageUrl } from '../../services/storage';
import { RemoteImage } from '../ui/RemoteImage';
import type { ChefDish } from './types';

type DishCardProps = {
  dish: ChefDish;
  onEdit: (dish: ChefDish) => void;
  onDelete: (dishId: string) => void;
  onToggleAvailability: (dishId: string, currentStatus: boolean) => void;
};

const AVAILABILITY_SWITCH_TRACK = { false: '#767577', true: '#76AB85' };

const DISH_IMAGE_SIZE = 80;

function DishCardBase({ dish, onEdit, onDelete, onToggleAvailability }: DishCardProps) {
  const dishImageUrl = resolveStorageImageUrl(dish.image_url);

  const handleEdit = useCallback(() => onEdit(dish), [dish, onEdit]);
  const handleDelete = useCallback(() => onDelete(dish.id), [dish.id, onDelete]);
  const handleToggle = useCallback(
    () => onToggleAvailability(dish.id, dish.is_available),
    [dish.id, dish.is_available, onToggleAvailability]
  );

  return (
    <View className="bg-gray-50 rounded-2xl mb-4 mx-5 p-4 flex-row">
      {dishImageUrl && (
        <RemoteImage
          uri={dishImageUrl}
          width={DISH_IMAGE_SIZE}
          height={DISH_IMAGE_SIZE}
          className="w-20 h-20 rounded-xl mr-4 overflow-hidden"
          accessibilityLabel={`${dish.name} photo`}
        />
      )}
      <View className="flex-1">
        <View className="flex-row justify-between items-start">
          <View className="flex-1">
            <Text className="text-base font-heavy text-black">{dish.name}</Text>
            <Text className="text-sm text-gray-600 font-book mt-1" numberOfLines={2}>
              {dish.description}
            </Text>
            <Text className="text-lg font-heavy text-[#76AB85] mt-2">Rs. {dish.price}</Text>
          </View>
          <Switch
            value={dish.is_available}
            onValueChange={handleToggle}
            trackColor={AVAILABILITY_SWITCH_TRACK}
          />
        </View>

        <View className="flex-row gap-2 mt-3">
          <TouchableOpacity
            onPress={handleEdit}
            className="flex-1 bg-white border border-gray-300 rounded-lg py-2 flex-row justify-center items-center"
          >
            <Edit size={16} color="#666" />
            <Text className="text-gray-700 font-semibold ml-2">Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleDelete}
            className="flex-1 bg-red-50 border border-red-300 rounded-lg py-2 flex-row justify-center items-center"
          >
            <Text className="text-red-600 font-semibold">Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

/** A dish row. Memoised so form typing or another dish's switch does not rebuild it. */
export const DishCard = memo(DishCardBase);
