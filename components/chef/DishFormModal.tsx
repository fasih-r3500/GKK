import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Camera, X } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  STORAGE_BUCKET,
  base64ToBytes,
  buildDishImagePath,
  describeError,
  imageContentType,
  resolveStorageImageUrl,
} from '../../services/storage';
import { supabase } from '../../supabase';
import type { ChefDish } from './types';

interface DishFormData {
  id?: string;
  name: string;
  description: string;
  price: string;
  category: string;
  cuisine_type: string;
  dietary_info: string[];
  spice_level: number;
  preparation_time: string;
  serving_size: string;
  ingredients: string;
  image_url?: string;
}

type DishFormModalProps = {
  visible: boolean;
  userId: string;
  dish: ChefDish | null;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
};

const CATEGORIES = ['Starter', 'Main', 'Dessert', 'Side', 'Drink'];
const DIETARY_OPTIONS = ['Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free', 'Nut-Free', 'Halal'];
const CUISINE_TYPES = ['Indian', 'Chinese', 'Italian', 'Mexican', 'Thai', 'Japanese', 'Mediterranean', 'British', 'Other'];
const SPICE_LEVELS = [0, 1, 2, 3, 4, 5];
const FULL_IMAGE_STYLE = { width: '100%' as const, height: '100%' as const };

function emptyForm(): DishFormData {
  return {
    name: '',
    description: '',
    price: '',
    category: 'Main',
    cuisine_type: '',
    dietary_info: [],
    spice_level: 0,
    preparation_time: '30',
    serving_size: '',
    ingredients: '',
  };
}

function formFromDish(dish: ChefDish | null): DishFormData {
  if (!dish) {
    return emptyForm();
  }

  return {
    id: dish.id,
    name: dish.name,
    description: dish.description || '',
    price: dish.price.toString(),
    category: dish.category || 'Main',
    cuisine_type: dish.cuisine_type || '',
    dietary_info: dish.dietary_info || [],
    spice_level: dish.spice_level || 0,
    preparation_time: dish.preparation_time?.toString() || '30',
    serving_size: dish.serving_size || '',
    ingredients: dish.ingredients?.join(', ') || '',
    image_url: dish.image_url ?? undefined,
  };
}

/**
 * Add or edit a dish.
 *
 * The form owns its own state so a keystroke here does not re-render the dashboard behind the
 * sheet. The parent remounts this component with a new key on each open, which also resets the
 * form without an effect.
 */
export function DishFormModal({
  visible,
  userId,
  dish,
  onClose,
  onSaved,
}: DishFormModalProps) {
  const [dishForm, setDishForm] = useState<DishFormData>(() => formFromDish(dish));
  const [uploadingImage, setUploadingImage] = useState(false);

  const dishFormImageUrl = resolveStorageImageUrl(dishForm.image_url);

  const uploadDishImage = async (asset: ImagePicker.ImagePickerAsset) => {
    setUploadingImage(true);
    try {
      if (!asset.base64) {
        throw new Error(
          'The selected photo could not be read from this device. Please choose it again.'
        );
      }

      const sourceName = asset.fileName ?? asset.uri;
      const filePath = buildDishImagePath(userId, asset.mimeType, sourceName);
      const contentType = imageContentType(asset.mimeType, sourceName);

      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(filePath, base64ToBytes(asset.base64), { contentType, upsert: false });

      if (uploadError) throw uploadError;

      // Store the bare object path: it matches chef_profiles.kitchen_image and survives a
      // bucket or project move. Rendering resolves it with resolveStorageImageUrl.
      setDishForm((current) => ({ ...current, image_url: filePath }));
    } catch (error) {
      Alert.alert('Dish photo upload failed', describeError(error));
    } finally {
      setUploadingImage(false);
    }
  };

  const pickDishImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          'Photo access needed',
          'Allow photo access for GharKaKhana in your phone settings, then try adding the dish photo again.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadDishImage(result.assets[0]);
      }
    } catch (error) {
      Alert.alert('Could not open your photos', describeError(error));
    }
  };

  const toggleDietaryOption = (option: string) => {
    setDishForm((current) => {
      const selected = current.dietary_info.includes(option);
      return {
        ...current,
        dietary_info: selected
          ? current.dietary_info.filter((item) => item !== option)
          : [...current.dietary_info, option],
      };
    });
  };

  const saveDish = async () => {
    if (!dishForm.name || !dishForm.price) {
      Alert.alert('Error', 'Please fill in name and price');
      return;
    }

    try {
      const dishData = {
        chef_id: userId,
        name: dishForm.name,
        description: dishForm.description,
        price: parseFloat(dishForm.price),
        category: dishForm.category.toLowerCase(),
        cuisine_type: dishForm.cuisine_type,
        dietary_info: dishForm.dietary_info,
        spice_level: dishForm.spice_level,
        preparation_time: parseInt(dishForm.preparation_time) || 30,
        serving_size: dishForm.serving_size,
        ingredients: dishForm.ingredients.split(',').map((s) => s.trim()).filter((s) => s),
        image_url: dishForm.image_url,
      };

      if (dishForm.id) {
        const { error } = await supabase
          .from('dishes')
          .update(dishData)
          .eq('id', dishForm.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('dishes')
          .insert([dishData]);
        if (error) throw error;
      }

      await onSaved();
    } catch (error) {
      Alert.alert('Could not save dish', describeError(error));
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/50 justify-end">
        <View className="bg-white rounded-t-3xl max-h-[90%]">
          <View className="flex-row justify-between items-center px-5 py-4 border-b border-gray-200">
            <Text className="text-xl font-heavy">
              {dishForm.id ? 'Edit Dish' : 'Add New Dish'}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView className="px-5 py-4" showsVerticalScrollIndicator={false}>
            {/* Image Upload */}
            <TouchableOpacity
              onPress={pickDishImage}
              className="bg-gray-100 rounded-xl h-40 justify-center items-center mb-4 overflow-hidden"
            >
              {uploadingImage ? (
                <ActivityIndicator size="large" color="#76AB85" />
              ) : dishFormImageUrl ? (
                <Image source={dishFormImageUrl} style={FULL_IMAGE_STYLE} contentFit="cover" />
              ) : (
                <View className="items-center">
                  <Camera size={40} color="#ccc" />
                  <Text className="text-gray-500 mt-2">Add Photo</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Name */}
            <View className="mb-4">
              <Text className="text-sm font-heavy text-gray-700 mb-2">Dish Name *</Text>
              <TextInput
                className="border border-gray-300 rounded-xl px-4 py-3"
                value={dishForm.name}
                onChangeText={(text) => setDishForm((current) => ({ ...current, name: text }))}
                placeholder="e.g., Chicken Tikka Masala"
              />
            </View>

            {/* Description */}
            <View className="mb-4">
              <Text className="text-sm font-heavy text-gray-700 mb-2">Description</Text>
              <TextInput
                className="border border-gray-300 rounded-xl px-4 py-3"
                value={dishForm.description}
                onChangeText={(text) => setDishForm((current) => ({ ...current, description: text }))}
                placeholder="Describe your dish..."
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Price and Category */}
            <View className="flex-row gap-3 mb-4">
              <View className="flex-1">
                <Text className="text-sm font-heavy text-gray-700 mb-2">Price (Rs.) *</Text>
                <TextInput
                  className="border border-gray-300 rounded-xl px-4 py-3"
                  value={dishForm.price}
                  onChangeText={(text) => setDishForm((current) => ({ ...current, price: text }))}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-heavy text-gray-700 mb-2">Category</Text>
                <View className="border border-gray-300 rounded-xl">
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-2 py-3">
                    {CATEGORIES.map((cat) => (
                      <TouchableOpacity
                        key={cat}
                        onPress={() => setDishForm((current) => ({ ...current, category: cat }))}
                        className={`px-3 py-1 rounded-full mr-2 ${
                          dishForm.category === cat ? 'bg-[#76AB85]' : 'bg-gray-200'
                        }`}
                      >
                        <Text className={`text-xs ${
                          dishForm.category === cat ? 'text-white font-heavy' : 'text-gray-700'
                        }`}>
                          {cat}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>
            </View>

            {/* Cuisine Type */}
            <View className="mb-4">
              <Text className="text-sm font-heavy text-gray-700 mb-2">Cuisine Type</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {CUISINE_TYPES.map((cuisine) => (
                  <TouchableOpacity
                    key={cuisine}
                    onPress={() => setDishForm((current) => ({ ...current, cuisine_type: cuisine }))}
                    className={`px-4 py-2 rounded-full mr-2 ${
                      dishForm.cuisine_type === cuisine ? 'bg-[#76AB85]' : 'bg-gray-200'
                    }`}
                  >
                    <Text className={`text-sm ${
                      dishForm.cuisine_type === cuisine ? 'text-white font-heavy' : 'text-gray-700'
                    }`}>
                      {cuisine}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Dietary Info */}
            <View className="mb-4">
              <Text className="text-sm font-heavy text-gray-700 mb-2">Dietary Information</Text>
              <View className="flex-row flex-wrap gap-2">
                {DIETARY_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option}
                    onPress={() => toggleDietaryOption(option)}
                    className={`px-3 py-2 rounded-full ${
                      dishForm.dietary_info.includes(option) ? 'bg-[#76AB85]' : 'bg-gray-200'
                    }`}
                  >
                    <Text className={`text-xs ${
                      dishForm.dietary_info.includes(option) ? 'text-white font-heavy' : 'text-gray-700'
                    }`}>
                      {option}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Spice Level */}
            <View className="mb-4">
              <Text className="text-sm font-heavy text-gray-700 mb-2">
                Spice Level: {dishForm.spice_level}/5
              </Text>
              <View className="flex-row gap-2">
                {SPICE_LEVELS.map((level) => (
                  <TouchableOpacity
                    key={level}
                    onPress={() => setDishForm((current) => ({ ...current, spice_level: level }))}
                    className={`flex-1 py-3 rounded-lg ${
                      dishForm.spice_level === level ? 'bg-red-500' : 'bg-gray-200'
                    }`}
                  >
                    <Text className={`text-center font-heavy ${
                      dishForm.spice_level === level ? 'text-white' : 'text-gray-700'
                    }`}>
                      {level}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Prep Time and Serving Size */}
            <View className="flex-row gap-3 mb-4">
              <View className="flex-1">
                <Text className="text-sm font-heavy text-gray-700 mb-2">Prep Time (min)</Text>
                <TextInput
                  className="border border-gray-300 rounded-xl px-4 py-3"
                  value={dishForm.preparation_time}
                  onChangeText={(text) => setDishForm((current) => ({ ...current, preparation_time: text }))}
                  placeholder="30"
                  keyboardType="number-pad"
                />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-heavy text-gray-700 mb-2">Serving Size</Text>
                <TextInput
                  className="border border-gray-300 rounded-xl px-4 py-3"
                  value={dishForm.serving_size}
                  onChangeText={(text) => setDishForm((current) => ({ ...current, serving_size: text }))}
                  placeholder="e.g., 1 person"
                />
              </View>
            </View>

            {/* Ingredients */}
            <View className="mb-4">
              <Text className="text-sm font-heavy text-gray-700 mb-2">Ingredients</Text>
              <TextInput
                className="border border-gray-300 rounded-xl px-4 py-3"
                value={dishForm.ingredients}
                onChangeText={(text) => setDishForm((current) => ({ ...current, ingredients: text }))}
                placeholder="Separate with commas"
                multiline
                numberOfLines={3}
              />
              <Text className="text-xs text-gray-500 mt-1">e.g., Chicken, Tomatoes, Spices</Text>
            </View>

            {/* Save Button */}
            <TouchableOpacity
              onPress={saveDish}
              className="bg-[#76AB85] rounded-xl py-4 items-center mb-6"
            >
              <Text className="text-white font-heavy text-base">
                {dishForm.id ? 'Update Dish' : 'Add Dish'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
