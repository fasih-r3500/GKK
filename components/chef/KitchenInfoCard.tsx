import { Edit2 } from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import { Alert, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { supabase } from '../../supabase';
import type { ChefProfile } from './types';

type KitchenInfoCardProps = {
  kitchen: ChefProfile | null;
  userId: string;
  onSaved: () => Promise<void> | void;
};

/**
 * Kitchen information with inline editing.
 *
 * The edit state lives here rather than on the dashboard, so typing in one field only redraws
 * this card instead of the whole screen and its dish list.
 */
export const KitchenInfoCard = React.memo(function KitchenInfoCard({
  kitchen,
  userId,
  onSaved,
}: KitchenInfoCardProps) {
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const startEdit = useCallback((field: string, currentValue: unknown) => {
    setEditingField(field);
    setEditValue(Array.isArray(currentValue) ? currentValue.join(', ') : String(currentValue ?? ''));
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingField(null);
    setEditValue('');
  }, []);

  const saveEdit = useCallback(
    async (field: string) => {
      try {
        let valueToSave: string | string[] = editValue;

        // Handle array fields
        if (field === 'cuisine_types') {
          valueToSave = editValue.split(',').map((s) => s.trim()).filter((s) => s);
        }

        const { error } = await supabase
          .from('chef_profiles')
          .update({ [field]: valueToSave })
          .eq('id', userId);

        if (error) throw error;

        await onSaved();
        setEditingField(null);
        setEditValue('');
      } catch {
        Alert.alert('Error', 'Failed to update field');
      }
    },
    [editValue, onSaved, userId]
  );

  return (
    <View className="mx-5 mt-4 bg-gray-50 rounded-2xl p-4">
      <Text className="text-lg font-heavy mb-3">Kitchen Information</Text>

      {/* Kitchen Name */}
      <View className="mb-3">
        <View className="flex-row justify-between items-center mb-1">
          <Text className="text-sm font-heavy text-gray-500">Kitchen Name</Text>
          {editingField !== 'kitchen_name' && (
            <TouchableOpacity onPress={() => startEdit('kitchen_name', kitchen?.kitchen_name)}>
              <Edit2 size={16} color="#76AB85" />
            </TouchableOpacity>
          )}
        </View>
        {editingField === 'kitchen_name' ? (
          <View className="flex-row gap-2">
            <TextInput
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2"
              value={editValue}
              onChangeText={setEditValue}
              autoFocus
            />
            <TouchableOpacity onPress={() => saveEdit('kitchen_name')} className="bg-green-600 rounded-lg px-4 justify-center">
              <Text className="text-white font-semibold">Save</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={cancelEdit} className="bg-gray-300 rounded-lg px-4 justify-center">
              <Text className="text-gray-700 font-semibold">Cancel</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Text className="text-base text-gray-800">{kitchen?.kitchen_name}</Text>
        )}
      </View>

      {/* Bio */}
      <View className="mb-3">
        <View className="flex-row justify-between items-center mb-1">
          <Text className="text-sm font-heavy text-gray-500">Bio</Text>
          {editingField !== 'bio' && (
            <TouchableOpacity onPress={() => startEdit('bio', kitchen?.bio)}>
              <Edit2 size={16} color="#76AB85" />
            </TouchableOpacity>
          )}
        </View>
        {editingField === 'bio' ? (
          <View>
            <TextInput
              className="border border-gray-300 rounded-lg px-3 py-2 mb-2"
              value={editValue}
              onChangeText={setEditValue}
              multiline
              numberOfLines={3}
              autoFocus
            />
            <View className="flex-row gap-2">
              <TouchableOpacity onPress={() => saveEdit('bio')} className="flex-1 bg-green-600 rounded-lg py-2 items-center">
                <Text className="text-white font-semibold">Save</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={cancelEdit} className="flex-1 bg-gray-300 rounded-lg py-2 items-center">
                <Text className="text-gray-700 font-semibold">Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <Text className="text-sm text-gray-600">{kitchen?.bio || 'No bio added'}</Text>
        )}
      </View>

      {/* Address */}
      <View className="mb-3">
        <View className="flex-row justify-between items-center mb-1">
          <Text className="text-sm font-heavy text-gray-500">Address</Text>
          {editingField !== 'kitchen_address' && (
            <TouchableOpacity onPress={() => startEdit('kitchen_address', kitchen?.kitchen_address)}>
              <Edit2 size={16} color="#76AB85" />
            </TouchableOpacity>
          )}
        </View>
        {editingField === 'kitchen_address' ? (
          <View>
            <TextInput
              className="border border-gray-300 rounded-lg px-3 py-2 mb-2"
              value={editValue}
              onChangeText={setEditValue}
              autoFocus
            />
            <View className="flex-row gap-2">
              <TouchableOpacity onPress={() => saveEdit('kitchen_address')} className="flex-1 bg-green-600 rounded-lg py-2 items-center">
                <Text className="text-white font-semibold">Save</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={cancelEdit} className="flex-1 bg-gray-300 rounded-lg py-2 items-center">
                <Text className="text-gray-700 font-semibold">Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <Text className="text-sm text-gray-600">📍 {kitchen?.kitchen_address}</Text>
        )}
      </View>

      {/* Cuisine Types */}
      <View className="mb-3">
        <View className="flex-row justify-between items-center mb-1">
          <Text className="text-sm font-heavy text-gray-500">Cuisine Types</Text>
          {editingField !== 'cuisine_types' && (
            <TouchableOpacity onPress={() => startEdit('cuisine_types', kitchen?.cuisine_types)}>
              <Edit2 size={16} color="#76AB85" />
            </TouchableOpacity>
          )}
        </View>
        {editingField === 'cuisine_types' ? (
          <View>
            <TextInput
              className="border border-gray-300 rounded-lg px-3 py-2 mb-1"
              value={editValue}
              onChangeText={setEditValue}
              placeholder="e.g., Italian, Chinese, Indian"
              autoFocus
            />
            <Text className="text-xs text-gray-500 mb-2">Separate with commas</Text>
            <View className="flex-row gap-2">
              <TouchableOpacity onPress={() => saveEdit('cuisine_types')} className="flex-1 bg-green-600 rounded-lg py-2 items-center">
                <Text className="text-white font-semibold">Save</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={cancelEdit} className="flex-1 bg-gray-300 rounded-lg py-2 items-center">
                <Text className="text-gray-700 font-semibold">Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View className="flex-row flex-wrap gap-2">
            {kitchen?.cuisine_types?.map((cuisine: string) => (
              <View key={cuisine} className="bg-[#76AB85] rounded-full px-3 py-1">
                <Text className="text-xs text-white font-book">{cuisine}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
});
