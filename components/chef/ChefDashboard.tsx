import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { Camera, Edit, Edit2, Home, Plus, ShoppingBag, User, UtensilsCrossed, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Modal,
    ScrollView,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ProfileScreen from '../../app/profile';
import { supabase } from '../../supabase';

interface ChefDashboardProps {
  userId: string;
}

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

const CATEGORIES = ['Starter', 'Main', 'Dessert', 'Side', 'Drink'];
const DIETARY_OPTIONS = ['Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free', 'Nut-Free', 'Halal'];
const CUISINE_TYPES = ['Indian', 'Chinese', 'Italian', 'Mexican', 'Thai', 'Japanese', 'Mediterranean', 'British', 'Other'];

export default function ChefDashboard({ userId }: ChefDashboardProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [kitchen, setKitchen] = useState<any>(null);
  const [dishes, setDishes] = useState<any[]>([]);
  const [isAcceptingOrders, setIsAcceptingOrders] = useState(true);
  const [activeTab, setActiveTab] = useState("Home");
  
  // Edit states
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  
  // Dish modal states
  const [dishModalVisible, setDishModalVisible] = useState(false);
  const [editingDish, setEditingDish] = useState<DishFormData | null>(null);
  const [dishForm, setDishForm] = useState<DishFormData>({
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
  });
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    fetchKitchenData();
  }, []);

  const fetchKitchenData = async () => {
    try {
      const { data: kitchenData, error: kitchenError } = await supabase
        .from('chef_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (kitchenError) throw kitchenError;
      setKitchen(kitchenData);
      setIsAcceptingOrders(kitchenData.is_accepting_orders);

      const { data: dishesData, error: dishesError } = await supabase
        .from('dishes')
        .select('*')
        .eq('chef_id', userId)
        .order('created_at', { ascending: false });

      if (dishesError) throw dishesError;
      setDishes(dishesData || []);
    } catch (error) {
      console.error('Error fetching kitchen data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleAcceptingOrders = async (value: boolean) => {
    setIsAcceptingOrders(value);
    const { error } = await supabase
      .from('chef_profiles')
      .update({ is_accepting_orders: value })
      .eq('id', userId);

    if (error) {
      Alert.alert('Error', 'Failed to update order status');
      setIsAcceptingOrders(!value);
    }
  };

  const startEdit = (field: string, currentValue: any) => {
    setEditingField(field);
    setEditValue(Array.isArray(currentValue) ? currentValue.join(', ') : currentValue || '');
  };

  const saveEdit = async (field: string) => {
    try {
      let valueToSave: string | string[] = editValue;
      
      // Handle array fields
      if (field === 'cuisine_types') {
        valueToSave = editValue.split(',').map(s => s.trim()).filter(s => s);
      }

      const { error } = await supabase
        .from('chef_profiles')
        .update({ [field]: valueToSave })
        .eq('id', userId);

      if (error) throw error;
      
      await fetchKitchenData();
      setEditingField(null);
      setEditValue('');
    } catch (error) {
      Alert.alert('Error', 'Failed to update field');
    }
  };

  const cancelEdit = () => {
    setEditingField(null);
    setEditValue('');
  };

  const openDishModal = (dish?: any) => {
    if (dish) {
      setEditingDish(dish);
      setDishForm({
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
        image_url: dish.image_url,
      });
    } else {
      setEditingDish(null);
      setDishForm({
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
      });
    }
    setDishModalVisible(true);
  };

  const pickDishImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      await uploadDishImage(result.assets[0].uri);
    }
  };

  const uploadDishImage = async (uri: string) => {
    setUploadingImage(true);
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const fileExt = uri.split('.').pop();
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const filePath = `dish-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, blob);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setDishForm({ ...dishForm, image_url: publicUrl });
    } catch (error) {
      Alert.alert('Error', 'Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  const toggleDietaryOption = (option: string) => {
    const current = dishForm.dietary_info;
    if (current.includes(option)) {
      setDishForm({ ...dishForm, dietary_info: current.filter(o => o !== option) });
    } else {
      setDishForm({ ...dishForm, dietary_info: [...current, option] });
    }
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
        ingredients: dishForm.ingredients.split(',').map(s => s.trim()).filter(s => s),
        image_url: dishForm.image_url,
      };

      if (editingDish?.id) {
        const { error } = await supabase
          .from('dishes')
          .update(dishData)
          .eq('id', editingDish.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('dishes')
          .insert([dishData]);
        if (error) throw error;
      }

      await fetchKitchenData();
      setDishModalVisible(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to save dish');
    }
  };

  const toggleDishAvailability = async (dishId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('dishes')
      .update({ is_available: !currentStatus })
      .eq('id', dishId);

    if (error) {
      Alert.alert('Error', 'Failed to update dish');
    } else {
      fetchKitchenData();
    }
  };

  const deleteDish = async (dishId: string) => {
    Alert.alert(
      'Delete Dish',
      'Are you sure you want to delete this dish?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase
              .from('dishes')
              .delete()
              .eq('id', dishId);

            if (error) {
              Alert.alert('Error', 'Failed to delete dish');
            } else {
              fetchKitchenData();
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator size="large" color="#76AB85" />
      </SafeAreaView>
    );
  }

  const kitchenImageUrl = kitchen?.kitchen_image
    ? supabase.storage.from('avatars').getPublicUrl(kitchen.kitchen_image).data.publicUrl
    : null;

  const renderContent = () => {
    switch (activeTab) {
      case "Home":
        return (
          <ScrollView className="flex-1">
            {/* Header */}
            <View className="px-5 py-4 bg-[#76AB85]">
              <View className="flex-row justify-between items-center">
                <View className="flex-1">
                  <Text className="text-2xl font-heavy text-white">
                    {kitchen?.kitchen_name}
                  </Text>
                  <Text className="text-sm text-white/80 mt-1">
                    Chef Dashboard
                  </Text>
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
                  onValueChange={toggleAcceptingOrders}
                  trackColor={{ false: '#767577', true: '#4ade80' }}
                  thumbColor={isAcceptingOrders ? '#fff' : '#f4f3f4'}
                />
              </View>
            </View>

            {/* Kitchen Info Card with Inline Editing */}
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

            {/* Menu Management */}
            <View className="px-5 mt-6">
              <View className="flex-row justify-between items-center mb-4">
                <View>
                  <Text className="text-2xl font-heavy text-black">Your Menu</Text>
                  <Text className="text-sm text-gray-600 font-book">
                    {dishes.length} {dishes.length === 1 ? 'dish' : 'dishes'}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => openDishModal()}
                  className="bg-[#76AB85] rounded-full px-4 py-3 flex-row items-center"
                >
                  <Plus size={20} color="#FFF" />
                  <Text className="text-white font-semibold ml-2">Add Dish</Text>
                </TouchableOpacity>
              </View>

              {/* Dishes List */}
              {dishes.length === 0 ? (
                <View className="bg-gray-50 rounded-2xl p-8 items-center justify-center">
                  <UtensilsCrossed size={48} color="#ccc" />
                  <Text className="text-gray-500 mt-4 text-center font-book">
                    No dishes yet. Add your first dish to start receiving orders!
                  </Text>
                  <TouchableOpacity
                    onPress={() => openDishModal()}
                    className="bg-[#76AB85] rounded-full px-6 py-3 mt-4"
                  >
                    <Text className="text-white font-semibold">Add First Dish</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View>
                  {dishes.map((dish) => (
                    <View
                      key={dish.id}
                      className="bg-gray-50 rounded-2xl mb-4 p-4 flex-row"
                    >
                      {dish.image_url && (
                        <Image
                          source={{ uri: dish.image_url }}
                          className="w-20 h-20 rounded-xl mr-4"
                        />
                      )}
                      <View className="flex-1">
                        <View className="flex-row justify-between items-start">
                          <View className="flex-1">
                            <Text className="text-base font-heavy text-black">
                              {dish.name}
                            </Text>
                            <Text className="text-sm text-gray-600 font-book mt-1" numberOfLines={2}>
                              {dish.description}
                            </Text>
                            <Text className="text-lg font-heavy text-[#76AB85] mt-2">
                              Rs. {dish.price}
                            </Text>
                          </View>
                          <Switch
                            value={dish.is_available}
                            onValueChange={() => toggleDishAvailability(dish.id, dish.is_available)}
                            trackColor={{ false: '#767577', true: '#76AB85' }}
                          />
                        </View>

                        <View className="flex-row gap-2 mt-3">
                          <TouchableOpacity
                            onPress={() => openDishModal(dish)}
                            className="flex-1 bg-white border border-gray-300 rounded-lg py-2 flex-row justify-center items-center"
                          >
                            <Edit size={16} color="#666" />
                            <Text className="text-gray-700 font-semibold ml-2">Edit</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => deleteDish(dish.id)}
                            className="flex-1 bg-red-50 border border-red-300 rounded-lg py-2 flex-row justify-center items-center"
                          >
                            <Text className="text-red-600 font-semibold">Delete</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>

            <View className="h-20" />
          </ScrollView>
        );
      
      case "Orders":
        return (
          <View className="flex-1 justify-center items-center">
            <Text className="text-gray-500">Orders tab content here</Text>
          </View>
        );
      
      case "Profile":
        return <ProfileScreen />;
      
      default:
        return null;
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      {/* Content */}
      {renderContent()}

      {/* Dish Modal */}
      <Modal
        visible={dishModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setDishModalVisible(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl max-h-[90%]">
            <View className="flex-row justify-between items-center px-5 py-4 border-b border-gray-200">
              <Text className="text-xl font-heavy">
                {editingDish ? 'Edit Dish' : 'Add New Dish'}
              </Text>
              <TouchableOpacity onPress={() => setDishModalVisible(false)}>
                <X size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView className="px-5 py-4" showsVerticalScrollIndicator={false}>
              {/* Image Upload */}
              <TouchableOpacity
                onPress={pickDishImage}
                className="bg-gray-100 rounded-xl h-40 justify-center items-center mb-4"
              >
                {uploadingImage ? (
                  <ActivityIndicator size="large" color="#76AB85" />
                ) : dishForm.image_url ? (
                  <Image source={{ uri: dishForm.image_url }} className="w-full h-full rounded-xl" />
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
                  onChangeText={(text) => setDishForm({ ...dishForm, name: text })}
                  placeholder="e.g., Chicken Tikka Masala"
                />
              </View>

              {/* Description */}
              <View className="mb-4">
                <Text className="text-sm font-heavy text-gray-700 mb-2">Description</Text>
                <TextInput
                  className="border border-gray-300 rounded-xl px-4 py-3"
                  value={dishForm.description}
                  onChangeText={(text) => setDishForm({ ...dishForm, description: text })}
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
                    onChangeText={(text) => setDishForm({ ...dishForm, price: text })}
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-heavy text-gray-700 mb-2">Category</Text>
                  <View className="border border-gray-300 rounded-xl">
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-2 py-3">
                      {CATEGORIES.map(cat => (
                        <TouchableOpacity
                          key={cat}
                          onPress={() => setDishForm({ ...dishForm, category: cat })}
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
                  {CUISINE_TYPES.map(cuisine => (
                    <TouchableOpacity
                      key={cuisine}
                      onPress={() => setDishForm({ ...dishForm, cuisine_type: cuisine })}
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
                  {DIETARY_OPTIONS.map(option => (
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
                  {[0, 1, 2, 3, 4, 5].map(level => (
                    <TouchableOpacity
                      key={level}
                      onPress={() => setDishForm({ ...dishForm, spice_level: level })}
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
                    onChangeText={(text) => setDishForm({ ...dishForm, preparation_time: text })}
                    placeholder="30"
                    keyboardType="number-pad"
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-heavy text-gray-700 mb-2">Serving Size</Text>
                  <TextInput
                    className="border border-gray-300 rounded-xl px-4 py-3"
                    value={dishForm.serving_size}
                    onChangeText={(text) => setDishForm({ ...dishForm, serving_size: text })}
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
                  onChangeText={(text) => setDishForm({ ...dishForm, ingredients: text })}
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
                  {editingDish ? 'Update Dish' : 'Add Dish'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Bottom Navbar */}
      <View className="flex-row justify-around items-center bg-white shadow-inner py-3 border-t border-gray-200">
        <TouchableOpacity className="flex-col items-center" onPress={() => setActiveTab("Home")}>
          <Home size={24} color={activeTab === "Home" ? "#16a34a" : "#999"} />
          <Text className={`text-xs ${activeTab === "Home" ? "text-green-600 font-heavy" : "text-gray-400"}`}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity className="flex-col items-center" onPress={() => setActiveTab("Orders")}>
          <ShoppingBag size={24} color={activeTab === "Orders" ? "#16a34a" : "#999"} />
          <Text className={`text-xs ${activeTab === "Orders" ? "text-green-600 font-heavy" : "text-gray-400"}`}>Orders</Text>
        </TouchableOpacity>
        <TouchableOpacity className="flex-col items-center" onPress={() => setActiveTab("Profile")}>
          <User size={24} color={activeTab === "Profile" ? "#16a34a" : "#999"} />
          <Text className={`text-xs ${activeTab === "Profile" ? "text-green-600 font-heavy" : "text-gray-400"}`}>Profile</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}