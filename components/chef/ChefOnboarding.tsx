import * as ImagePicker from 'expo-image-picker';
import { Camera, ChevronRight, MapPin } from 'lucide-react-native';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LocationService } from '../../services/locationService';
import { supabase } from '../../supabase';

interface ChefOnboardingProps {
  userId: string;
  onComplete: () => void;
}

export default function ChefOnboarding({ userId, onComplete }: ChefOnboardingProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);

  // Kitchen Info
  const [kitchenName, setKitchenName] = useState('');
  const [bio, setBio] = useState('');
  const [kitchenAddress, setKitchenAddress] = useState('');
  const [postcode, setPostcode] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [cuisineTypes, setCuisineTypes] = useState<string[]>([]);
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>([]);
  const [kitchenImage, setKitchenImage] = useState<string | null>(null);

  const cuisineOptions = [
    'Pakistani', 'Indian', 'Chinese', 'Italian', 'Thai',
    'Mexican', 'Japanese', 'Mediterranean', 'American', 'Arabic'
  ];

  const getCurrentLocation = async () => {
    setLocationLoading(true);
    const location = await LocationService.getCurrentLocation();
    if (location) {
      setKitchenAddress(location.address || '');
      setLatitude(location.latitude);
      setLongitude(location.longitude);
    } else {
      Alert.alert('Error', 'Could not get your location. Please enter manually.');
    }
    setLocationLoading(false);
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photos');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setKitchenImage(result.assets[0].uri);
    }
  };

  const toggleCuisine = (cuisine: string) => {
    if (selectedCuisines.includes(cuisine)) {
      setSelectedCuisines(selectedCuisines.filter(c => c !== cuisine));
    } else {
      setSelectedCuisines([...selectedCuisines, cuisine]);
    }
  };

  const uploadImage = async (uri: string): Promise<string | null> => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const fileExt = uri.split('.').pop();
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, blob);

      if (uploadError) throw uploadError;

      return filePath;
    } catch (error) {
      console.error('Error uploading image:', error);
      return null;
    }
  };

  const handleComplete = async () => {
    if (!kitchenName || !kitchenAddress || selectedCuisines.length === 0) {
      Alert.alert('Missing Information', 'Please fill in all required fields');
      return;
    }

    setLoading(true);

    try {
      let imagePath = null;
      if (kitchenImage) {
        imagePath = await uploadImage(kitchenImage);
      }

      const { error } = await supabase
        .from('chef_profiles')
        .update({
          kitchen_name: kitchenName,
          bio: bio,
          kitchen_address: kitchenAddress,
          postcode: postcode,
          latitude: latitude,
          longitude: longitude,
          cuisine_types: selectedCuisines,
          kitchen_image: imagePath,
          is_active: true,
          is_accepting_orders: true,
        })
        .eq('id', userId);

      if (error) throw error;

      Alert.alert('Success!', 'Your kitchen has been set up successfully', [
        { text: 'OK', onPress: onComplete }
      ]);
    } catch (error) {
      console.error('Error saving kitchen:', error);
      Alert.alert('Error', 'Failed to save kitchen information');
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <ScrollView className="flex-1 px-6 py-4">
      <Text className="text-3xl font-heavy text-black mb-2">
        Welcome, Chef! 👨‍🍳
      </Text>
      <Text className="text-base font-book text-gray-600 mb-6">
        Let's set up your kitchen so customers can find and order from you.
      </Text>

      {/* Kitchen Name */}
      <View className="mb-5">
        <Text className="text-sm font-heavy text-black mb-2">
          Kitchen Name <Text className="text-red-500">*</Text>
        </Text>
        <TextInput
          className="h-12 bg-gray-50 border border-gray-200 rounded-xl px-4 text-base text-black font-book"
          placeholder="e.g., Mama's Kitchen"
          value={kitchenName}
          onChangeText={setKitchenName}
        />
      </View>

      {/* Bio */}
      <View className="mb-5">
        <Text className="text-sm font-heavy text-black mb-2">
          Bio / Description
        </Text>
        <TextInput
          className="h-24 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-base text-black font-book"
          placeholder="Tell customers about your kitchen..."
          value={bio}
          onChangeText={setBio}
          multiline
          textAlignVertical="top"
        />
      </View>

      {/* Kitchen Image */}
      <View className="mb-5">
        <Text className="text-sm font-heavy text-black mb-2">
          Kitchen Photo (Optional)
        </Text>
        <TouchableOpacity
          onPress={pickImage}
          className="h-32 bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl items-center justify-center"
        >
          {kitchenImage ? (
            <Image source={{ uri: kitchenImage }} className="w-full h-full rounded-xl" />
          ) : (
            <>
              <Camera size={32} color="#999" />
              <Text className="text-gray-500 mt-2 font-book">Tap to add photo</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        className="bg-[#76AB85] h-12 rounded-xl justify-center items-center mt-4"
        onPress={() => setStep(2)}
        disabled={!kitchenName}
      >
        <View className="flex-row items-center">
          <Text className="text-white text-base font-semibold mr-2">Next</Text>
          <ChevronRight size={20} color="#FFF" />
        </View>
      </TouchableOpacity>
    </ScrollView>
  );

  const renderStep2 = () => (
    <ScrollView className="flex-1 px-6 py-4">
      <Text className="text-3xl font-heavy text-black mb-2">
        Kitchen Location 📍
      </Text>
      <Text className="text-base font-book text-gray-600 mb-6">
        This helps customers find you and estimate collection times.
      </Text>

      {/* Address */}
      <View className="mb-5">
        <Text className="text-sm font-heavy text-black mb-2">
          Kitchen Address <Text className="text-red-500">*</Text>
        </Text>
        <TouchableOpacity
          onPress={getCurrentLocation}
          className="flex-row items-center mb-3 bg-[#76AB85] rounded-lg px-4 py-3"
          disabled={locationLoading}
        >
          {locationLoading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <MapPin size={20} color="#FFF" />
              <Text className="text-white font-semibold ml-2">Use Current Location</Text>
            </>
          )}
        </TouchableOpacity>

        <TextInput
          className="h-20 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-base text-black font-book"
          placeholder="Or enter manually..."
          value={kitchenAddress}
          onChangeText={setKitchenAddress}
          multiline
          textAlignVertical="top"
        />
      </View>

      {/* Postcode */}
      <View className="mb-5">
        <Text className="text-sm font-heavy text-black mb-2">
          Postcode
        </Text>
        <TextInput
          className="h-12 bg-gray-50 border border-gray-200 rounded-xl px-4 text-base text-black font-book"
          placeholder="e.g., 75600"
          value={postcode}
          onChangeText={setPostcode}
        />
      </View>

      <View className="flex-row gap-3">
        <TouchableOpacity
          className="flex-1 h-12 border-2 border-[#76AB85] rounded-xl justify-center items-center"
          onPress={() => setStep(1)}
        >
          <Text className="text-[#76AB85] text-base font-semibold">Back</Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="flex-1 bg-[#76AB85] h-12 rounded-xl justify-center items-center"
          onPress={() => setStep(3)}
          disabled={!kitchenAddress}
        >
          <View className="flex-row items-center">
            <Text className="text-white text-base font-semibold mr-2">Next</Text>
            <ChevronRight size={20} color="#FFF" />
          </View>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderStep3 = () => (
    <ScrollView className="flex-1 px-6 py-4">
      <Text className="text-3xl font-heavy text-black mb-2">
        Cuisine Types 🍽️
      </Text>
      <Text className="text-base font-book text-gray-600 mb-6">
        Select all that apply <Text className="text-red-500">*</Text>
      </Text>

      <View className="flex-row flex-wrap gap-3 mb-6">
        {cuisineOptions.map((cuisine) => (
          <TouchableOpacity
            key={cuisine}
            onPress={() => toggleCuisine(cuisine)}
            className={`px-4 py-3 rounded-full border-2 ${
              selectedCuisines.includes(cuisine)
                ? 'bg-[#76AB85] border-[#76AB85]'
                : 'bg-white border-gray-300'
            }`}
          >
            <Text
              className={`font-semibold ${
                selectedCuisines.includes(cuisine) ? 'text-white' : 'text-gray-700'
              }`}
            >
              {cuisine}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View className="flex-row gap-3">
        <TouchableOpacity
          className="flex-1 h-12 border-2 border-[#76AB85] rounded-xl justify-center items-center"
          onPress={() => setStep(2)}
        >
          <Text className="text-[#76AB85] text-base font-semibold">Back</Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="flex-1 bg-[#76AB85] h-12 rounded-xl justify-center items-center"
          onPress={handleComplete}
          disabled={loading || selectedCuisines.length === 0}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text className="text-white text-base font-semibold">Complete Setup</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      {/* Progress Indicator */}
      <View className="flex-row px-6 py-4">
        {[1, 2, 3].map((s) => (
          <View
            key={s}
            className={`flex-1 h-2 rounded-full mx-1 ${
              s <= step ? 'bg-[#76AB85]' : 'bg-gray-200'
            }`}
          />
        ))}
      </View>

      {step === 1 && renderStep1()}
      {step === 2 && renderStep2()}
      {step === 3 && renderStep3()}
    </SafeAreaView>
  );
}