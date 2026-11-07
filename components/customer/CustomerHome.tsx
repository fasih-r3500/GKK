import { useRouter } from "expo-router";
import { MapPin, ShoppingBag } from "lucide-react-native";
import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { LocationService, UserLocation } from "../../services/locationService";
import { resolveStorageImageUrl } from "../../services/storage";
import { supabase } from "../../supabase";
import { ChefCard, ChefListItem } from "./ChefCard";
import { ChefFilters, ChefSort } from "./ChefFilters";

const LIST_CONTENT_STYLE = { paddingHorizontal: 20, paddingVertical: 20 };

const keyExtractor = (chef: ChefListItem) => chef.id;

const ChefListEmpty = memo(function ChefListEmpty({ hasLocation }: { hasLocation: boolean }) {
  return (
    <View className="flex-1 justify-center items-center py-20">
      <Text className="text-gray-500 text-center">
        {hasLocation
          ? "No kitchens found in your area. Try increasing the search radius."
          : "Enable location to find nearby kitchens"}
      </Text>
    </View>
  );
});

export default function CustomerHome() {
  const router = useRouter();
  const [chefs, setChefs] = useState<ChefListItem[]>([]);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [radiusFilter, setRadiusFilter] = useState<number | null>(10);
  const [sortBy, setSortBy] = useState<ChefSort>('distance');

  const saveUserLocation = useCallback(async (location: UserLocation) => {
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
  }, []);

  const loadUserLocation = useCallback(async () => {
    setLocationLoading(true);
    const location = await LocationService.getCurrentLocation();
    if (location) {
      setUserLocation(location);
      await saveUserLocation(location);
    }
    setLocationLoading(false);
  }, [saveUserLocation]);

  const fetchChefs = useCallback(async () => {
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
      const chefsWithImages: ChefListItem[] = data.map((chef) => ({
        ...chef,
        kitchen_image_url:
          resolveStorageImageUrl(chef.kitchen_image) ?? "https://via.placeholder.com/80",
      }));

      setChefs(chefsWithImages);
    }
  }, []);

  useEffect(() => {
    fetchChefs();
    loadUserLocation();
  }, [fetchChefs, loadUserLocation]);

  // Filtering and sorting only reruns when an input changes, not on every keystroke or
  // dropdown render. The array is copied before sorting so state is never mutated in place.
  const sortedChefs = useMemo(() => {
    let filteredChefs = chefs;

    if (userLocation && radiusFilter !== null) {
      filteredChefs = LocationService.filterChefsByRadius(
        chefs,
        userLocation.latitude,
        userLocation.longitude,
        radiusFilter
      );
    }

    const withDistance = userLocation
      ? filteredChefs.map((chef) => ({
          ...chef,
          distance:
            chef.latitude && chef.longitude
              ? LocationService.calculateDistance(
                  userLocation.latitude,
                  userLocation.longitude,
                  chef.latitude,
                  chef.longitude
                )
              : null,
        }))
      : filteredChefs;

    const sortable = [...withDistance];

    switch (sortBy) {
      case 'distance':
        return sortable.sort((a, b) => {
          if (a.distance === null || a.distance === undefined) return 1;
          if (b.distance === null || b.distance === undefined) return -1;
          return a.distance - b.distance;
        });
      case 'rating':
        return sortable.sort((a, b) => {
          const ratingA = a.food_hygiene_rating ?? 0;
          const ratingB = b.food_hygiene_rating ?? 0;
          return ratingB - ratingA;
        });
      case 'name':
        return sortable.sort((a, b) => a.kitchen_name.localeCompare(b.kitchen_name));
      default:
        return sortable;
    }
  }, [chefs, radiusFilter, sortBy, userLocation]);

  const openKitchen = useCallback(
    (chefid: string) => {
      router.push({
        pathname: '/kitchen/[chefid]',
        params: { chefid },
      });
    },
    [router]
  );

  const renderChef = useCallback(
    ({ item }: { item: ChefListItem }) => <ChefCard chef={item} onOpen={openKitchen} />,
    [openKitchen]
  );

  const listEmpty = useMemo(
    () => <ChefListEmpty hasLocation={userLocation !== null} />,
    [userLocation]
  );

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top', 'left', 'right']}>
      {/* Header */}
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

      {/* Search Bar with Filters */}
      <View className="mx-5 my-3">
        <View className="flex-row items-center bg-gray-100 rounded-full px-4 py-2 mb-3">
          <TextInput
            placeholder="Search for food or kitchens"
            className="flex-1 ml-2 text-base"
            placeholderTextColor="#888"
          />
        </View>

        <ChefFilters
          radiusFilter={radiusFilter}
          sortBy={sortBy}
          onSelectRadius={setRadiusFilter}
          onSelectSort={setSortBy}
        />
      </View>

      <FlatList
        data={sortedChefs}
        keyExtractor={keyExtractor}
        renderItem={renderChef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={LIST_CONTENT_STYLE}
        ListEmptyComponent={listEmpty}
      />
    </SafeAreaView>
  );
}
