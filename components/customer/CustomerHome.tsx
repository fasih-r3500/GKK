import { useRouter } from "expo-router";
import { ChevronDown, Heart, Home, MapPin, ShoppingBag, Star, User } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Image, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ProfileScreen from "../../app/profile";
import { LocationService, UserLocation } from "../../services/locationService";
import { supabase } from "../../supabase";

export default function CustomerHome() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("Home");
  const [chefs, setChefs] = useState<any[]>([]);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [radiusFilter, setRadiusFilter] = useState<number | null>(10);
  const [sortBy, setSortBy] = useState<'distance' | 'rating' | 'name'>('distance');
  const [showRadiusDropdown, setShowRadiusDropdown] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  useEffect(() => {
    fetchChefs();
    loadUserLocation();
  }, []);

  const loadUserLocation = async () => {
    setLocationLoading(true);
    const location = await LocationService.getCurrentLocation();
    if (location) {
      setUserLocation(location);
      await saveUserLocation(location);
    }
    setLocationLoading(false);
  };

  const saveUserLocation = async (location: UserLocation) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('profiles')
        .update({
          latitude: location.latitude,
          longitude: location.longitude,
          address: location.address,
          city: location.city,
        })
        .eq('id', user.id);

      if (error) {
        console.error('Error saving location:', error);
      }
    } catch (error) {
      console.error('Error saving location:', error);
    }
  };

  const fetchChefs = async () => {
    const { data, error } = await supabase
      .from("chef_profiles")
      .select(`
        id,
        kitchen_name,
        cuisine_types,
        food_hygiene_rating,
        kitchen_image,
        latitude,
        longitude,
        kitchen_address
      `)
      .eq("is_active", true)
      .eq("is_accepting_orders", true);

    if (error) {
      console.error("Error fetching chefs:", error);
      return;
    }

    if (data) {
      const chefsWithImages = data.map((chef) => ({
        ...chef,
        kitchen_image_url: chef.kitchen_image
          ? supabase.storage.from("avatars").getPublicUrl(chef.kitchen_image).data.publicUrl
          : "https://via.placeholder.com/80",
      }));
      
      setChefs(chefsWithImages);
    }
  };

  const getSortedChefs = () => {
    let filteredChefs = chefs;
    
    if (userLocation && radiusFilter !== null) {
      filteredChefs = LocationService.filterChefsByRadius(
        chefs,
        userLocation.latitude,
        userLocation.longitude,
        radiusFilter
      );
    }
    
    if (userLocation) {
      filteredChefs = filteredChefs.map(chef => ({
        ...chef,
        distance: chef.latitude && chef.longitude
          ? LocationService.calculateDistance(
              userLocation.latitude,
              userLocation.longitude,
              chef.latitude,
              chef.longitude
            )
          : null,
      }));
    }
    
    switch (sortBy) {
      case 'distance':
        return filteredChefs.sort((a, b) => {
          if (a.distance === null) return 1;
          if (b.distance === null) return -1;
          return a.distance - b.distance;
        });
      case 'rating':
        return filteredChefs.sort((a, b) => {
          const ratingA = a.food_hygiene_rating ?? 0;
          const ratingB = b.food_hygiene_rating ?? 0;
          return ratingB - ratingA;
        });
      case 'name':
        return filteredChefs.sort((a, b) => 
          a.kitchen_name.localeCompare(b.kitchen_name)
        );
      default:
        return filteredChefs;
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case "Home":
        const sortedChefs = getSortedChefs();
        
        return (
          <FlatList
            data={sortedChefs}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 20 }}
            ListEmptyComponent={
              <View className="flex-1 justify-center items-center py-20">
                <Text className="text-gray-500 text-center">
                  {userLocation 
                    ? "No kitchens found in your area. Try increasing the search radius."
                    : "Enable location to find nearby kitchens"}
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <View className="flex-row items-center bg-gray-50 rounded-2xl mb-4 p-3 shadow-sm">
                <Image
                  source={{ uri: item.kitchen_image_url }}
                  className="w-20 h-20 rounded-xl mr-4"
                />

                <View className="flex-1">
                  <Text className="text-lg font-heavy text-gray-800">{item.kitchen_name}</Text>
                  <View className="flex-row items-center mt-1">
                    <Star size={16} color="#facc15" fill="#facc15" />
                    <Text className="ml-1 text-sm font-regular text-gray-600">
                      {item.cuisine_types?.join(", ") || "Cuisine"} · {item.food_hygiene_rating ?? "N/A"}★
                    </Text>
                  </View>
                  
                  {item.distance && (
                    <Text className="text-xs text-gray-500 mt-1">
                      📍 {item.distance} km away
                    </Text>
                  )}
                  
                  <TouchableOpacity
                    className="bg-green-600 mt-3 rounded-full py-1.5 px-4 self-start"
                    onPress={() =>
                      router.push({
                        pathname: '/kitchen/[chefid]',
                        params: { chefid: item.id },
                      })
                    }
                  >
                    <Text className="font-book text-white text-sm">View Kitchen</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          />
        );
      case "Profile":
        return <ProfileScreen />;
      case "Orders":
        return (
          <View className="flex-1 justify-center items-center">
            <Text className="text-gray-500">Orders tab content here</Text>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
      {activeTab === "Home" && (
        <View className="w-full my-2 px-5">
          <View className="flex-row justify-between items-center">
            <View className="flex-1">
              <Text className="font-book text-green-600 text-sm">Deliver To</Text>
              <TouchableOpacity 
                className="flex-row items-center gap-x-1 mt-0.5"
                onPress={loadUserLocation}
              >
                {locationLoading ? (
                  <ActivityIndicator size="small" color="#16a34a" />
                ) : (
                  <>
                    <MapPin size={16} color="#16a34a" />
                    <Text className="font-regular text-gray-800 text-sm flex-1" numberOfLines={1}>
                      {userLocation?.address || "Set your location"}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            <TouchableOpacity className="flex-row items-center gap-x-1 ml-2">
              <ShoppingBag color="#16a34a" size={18} />
              <Text className="font-regular text-green-600">Cart</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Search Bar with Filters */}
      {activeTab === "Home" && (
        <View className="mx-5 my-3">
          <View className="flex-row items-center bg-gray-100 rounded-full px-4 py-2 mb-3">
            <TextInput
              placeholder="Search for food or kitchens"
              className="flex-1 ml-2 text-base"
              placeholderTextColor="#888"
            />
          </View>

          <View className="flex-row gap-x-3">
            {/* Radius Filter */}
            <View className="flex-1">
              <TouchableOpacity
                className="flex-row items-center justify-between bg-gray-100 rounded-xl px-4 py-2.5"
                onPress={() => {
                  setShowRadiusDropdown(!showRadiusDropdown);
                  setShowSortDropdown(false);
                }}
              >
                <Text className="text-sm text-gray-700">
                  Within: {radiusFilter ? `${radiusFilter}km` : 'All'}
                </Text>
                <ChevronDown size={16} color="#666" />
              </TouchableOpacity>

              {showRadiusDropdown && (
                <View className="absolute top-12 left-0 right-0 bg-white rounded-xl shadow-lg border border-gray-200 z-50">
                  {[5, 10, 20, null].map((radius) => (
                    <TouchableOpacity
                      key={radius ?? 'all'}
                      className={`px-4 py-3 border-b border-gray-100 ${
                        radiusFilter === radius ? 'bg-green-50' : ''
                      }`}
                      onPress={() => {
                        setRadiusFilter(radius);
                        setShowRadiusDropdown(false);
                      }}
                    >
                      <Text className={`text-sm ${
                        radiusFilter === radius
                          ? 'text-green-600 font-heavy'
                          : 'text-gray-700'
                      }`}>
                        {radius ? `${radius}km` : 'All'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Sort Filter */}
            <View className="flex-1">
              <TouchableOpacity
                className="flex-row items-center justify-between bg-gray-100 rounded-xl px-4 py-2.5"
                onPress={() => {
                  setShowSortDropdown(!showSortDropdown);
                  setShowRadiusDropdown(false);
                }}
              >
                <Text className="text-sm text-gray-700">
                  Sort: {sortBy === 'distance' ? 'Distance' : sortBy === 'rating' ? 'Rating' : 'Name'}
                </Text>
                <ChevronDown size={16} color="#666" />
              </TouchableOpacity>

              {showSortDropdown && (
                <View className="absolute top-12 left-0 right-0 bg-white rounded-xl shadow-lg border border-gray-200 z-50">
                  {[
                    { value: 'distance', label: 'Distance' },
                    { value: 'rating', label: 'Rating' },
                    { value: 'name', label: 'Name (A-Z)' }
                  ].map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      className={`px-4 py-3 border-b border-gray-100 ${
                        sortBy === option.value ? 'bg-green-50' : ''
                      }`}
                      onPress={() => {
                        setSortBy(option.value as 'distance' | 'rating' | 'name');
                        setShowSortDropdown(false);
                      }}
                    >
                      <Text className={`text-sm ${
                        sortBy === option.value
                          ? 'text-green-600 font-heavy'
                          : 'text-gray-700'
                      }`}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </View>
        </View>
      )}

      {/* Content */}
      {renderContent()}

      {/* Bottom Navbar */}
      <View className="flex-row justify-around items-center bg-white shadow-inner py-3 border-t border-gray-200">
        <TouchableOpacity className="flex-col items-center" onPress={() => setActiveTab("Home")}>
          <Home size={24} color={activeTab === "Home" ? "#16a34a" : "#999"} />
          <Text className={`text-xs ${activeTab === "Home" ? "text-green-600 font-heavy" : "text-gray-400"}`}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity className="flex-col items-center" onPress={() => setActiveTab("Orders")}>
          <Heart size={24} color={activeTab === "Orders" ? "#16a34a" : "#999"} />
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