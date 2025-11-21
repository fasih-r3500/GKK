// app/kitchen/[chefid].tsx
import { useLocalSearchParams } from "expo-router";
import { Star } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { Alert, FlatList, Image, Linking, Platform, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { supabase } from "../../supabase";

interface ChefProfile {
  id: string;
  kitchen_name: string;
  bio: string | null;
  kitchen_address: string;
  postcode: string | null;
  cuisine_types: string[];
  food_hygiene_rating: number | null;
  is_verified: boolean;
  is_accepting_orders: boolean;
  average_preparation_time: number;
  kitchen_image: string | null;
  social_media: any;
  phone_number: string | null;
  latitude: number | null;
  longitude: number | null;
}

interface Dish {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  category: string | null;
  cuisine_type: string | null;
  dietary_info: string[];
  spice_level: number | null;
  is_available: boolean;
}

export default function KitchenPage() {
  const { chefid } = useLocalSearchParams();
  
  if (!chefid) return (
    <View className="flex-1 justify-center items-center">
      <Text>Chef ID missing</Text>
    </View>
  );

  const [chef, setChef] = useState<ChefProfile | null>(null);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!chefid) return;
    fetchChefAndDishes(chefid as string);
  }, [chefid]);

  const fetchChefAndDishes = async (id: string) => {
    setLoading(true);

    // Fetch chef profile with phone number from profiles table
    const { data: chefData, error: chefError } = await supabase
      .from("chef_profiles")
      .select(`
        *,
        profiles!inner(phone_number)
      `)
      .eq("id", id)
      .single();

    if (chefError) {
      console.error("Error fetching chef:", chefError.message);
      setLoading(false);
      return;
    }

    // Fetch dishes
    const { data: dishesData, error: dishesError } = await supabase
      .from("dishes")
      .select("*")
      .eq("chef_id", id)
      .eq("is_available", true);

    if (dishesError) {
      console.error("Error fetching dishes:", dishesError.message);
    }

    // Flatten the phone_number from profiles and get kitchen image URL
    const chefWithPhone = {
      ...chefData,
      phone_number: chefData?.profiles?.phone_number || null,
      kitchen_image: chefData.kitchen_image
        ? supabase.storage.from("avatars").getPublicUrl(chefData.kitchen_image).data.publicUrl
        : null
    };

    // Get dish image URLs
    const dishesWithImages = dishesData?.map(dish => ({
      ...dish,
      image_url: dish.image_url
        ? supabase.storage.from("avatars").getPublicUrl(dish.image_url).data.publicUrl
        : null
    })) || [];

    setChef(chefWithPhone);
    setDishes(dishesWithImages);
    setLoading(false);
  };

  const handleOrderNow = () => {
    if (!chef?.phone_number) {
      Alert.alert("No Phone Number", "This kitchen doesn't have a phone number listed.");
      return;
    }

    const phoneNumber = chef.phone_number.replace(/[^0-9+]/g, ''); // Clean phone number
    const url = `tel:${phoneNumber}`;

    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          return Linking.openURL(url);
        } else {
          Alert.alert("Error", "Phone dialer is not available on this device.");
        }
      })
      .catch((err) => console.error("Error opening dialer:", err));
  };

  const handleOpenInMaps = () => {
    if (!chef?.latitude || !chef?.longitude) {
      Alert.alert("Location Unavailable", "This kitchen's location is not available.");
      return;
    }

    // Create URL for both iOS (Apple Maps) and Android (Google Maps)
    const scheme = Platform.OS === 'ios' ? 'maps:' : 'geo:';
    const latLng = `${chef.latitude},${chef.longitude}`;
    const label = encodeURIComponent(chef.kitchen_name);
    
    // iOS: maps:0,0?q=<lat>,<lng>(label)
    // Android: geo:0,0?q=<lat>,<lng>(label)
    const url = Platform.OS === 'ios'
      ? `${scheme}0,0?q=${latLng}(${label})`
      : `${scheme}0,0?q=${latLng}(${label})`;

    // Alternative: Open in Google Maps specifically on both platforms
    // const url = `https://www.google.com/maps/search/?api=1&query=${latLng}`;

    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          return Linking.openURL(url);
        } else {
          // Fallback to Google Maps web
          const webUrl = `https://www.google.com/maps/search/?api=1&query=${latLng}`;
          return Linking.openURL(webUrl);
        }
      })
      .catch((err) => console.error("Error opening maps:", err));
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center">
        <Text>Loading...</Text>
      </View>
    );
  }

  if (!chef) {
    return (
      <View className="flex-1 justify-center items-center">
        <Text>Chef not found.</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <ScrollView className="flex-1">
        {/* Chef / Kitchen Info */}
        <View className="p-5 bg-gray-50">
          {chef.kitchen_image && (
            <Image
              source={{ uri: chef.kitchen_image }}
              className="w-full h-48 rounded-xl mb-4"
            />
          )}
          <Text className="text-2xl font-heavy text-gray-800 mb-1">{chef.kitchen_name}</Text>
          <View className="flex-row items-center mb-2">
            <Star size={16} color="#facc15" fill="#facc15" />
            <Text className="ml-2 text-sm text-gray-600">
              {chef.food_hygiene_rating ?? "N/A"}★ · {chef.cuisine_types?.join(", ")}
            </Text>
          </View>
          <Text className="text-gray-700 mb-2">{chef.bio}</Text>
          <Text className="text-gray-600 mb-1">{chef.kitchen_address}</Text>
          <Text className="text-gray-600 mb-1">
            {chef.is_accepting_orders ? "Accepting orders ✅" : "Not accepting orders ❌"}
          </Text>
        </View>

        {/* Dishes */}
        <View className="p-5 pb-24">
          <Text className="text-xl font-heavy text-gray-800 mb-4">Menu</Text>
          {dishes.length === 0 ? (
            <Text className="text-gray-500">No dishes available at the moment.</Text>
          ) : (
            <FlatList
              data={dishes}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              scrollEnabled={false}
              renderItem={({ item }) => (
                <View className="flex-row bg-gray-50 rounded-2xl mb-4 p-3 shadow-sm">
                  {item.image_url && (
                    <Image
                      source={{ uri: item.image_url }}
                      className="w-20 h-20 rounded-xl mr-4"
                    />
                  )}
                  <View className="flex-1">
                    <Text className="text-lg font-heavy text-gray-800">{item.name}</Text>
                    <Text className="text-gray-600 mb-1">{item.description}</Text>
                    <Text className="text-gray-700 font-semibold">PKR {item.price.toFixed(2)}</Text>
                    {item.spice_level !== null && (
                      <Text className="text-gray-500 text-sm mt-1">
                        Spice Level: {item.spice_level}/5
                      </Text>
                    )}
                    {item.dietary_info?.length > 0 && (
                      <Text className="text-gray-500 text-sm mt-1">
                        Dietary: {item.dietary_info.join(", ")}
                      </Text>
                    )}
                  </View>
                </View>
              )}
            />
          )}
        </View>
      </ScrollView>

      {/* Order Now Button - Fixed at bottom */}
      <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg">
        <TouchableOpacity
          className="bg-green-600 rounded-full py-4 items-center"
          onPress={handleOrderNow}
          disabled={!chef.is_accepting_orders}
        >
          <Text className="text-white font-heavy text-lg">
            {chef.is_accepting_orders ? "Order Now - Call Kitchen" : "Not Accepting Orders"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}