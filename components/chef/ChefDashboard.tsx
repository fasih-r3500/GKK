import { UtensilsCrossed } from 'lucide-react-native';
import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { supabase } from '../../supabase';
import { ChefOverviewHeader } from './ChefOverviewHeader';
import { DishCard } from './DishCard';
import { DishFormModal } from './DishFormModal';
import type { ChefDish, ChefProfile } from './types';

const DISH_LIST_CONTENT_STYLE = { paddingBottom: 32 };

const keyExtractor = (dish: ChefDish) => dish.id;

const EmptyMenu = memo(function EmptyMenu({ onAdd }: { onAdd: () => void }) {
  return (
    <View className="bg-gray-50 rounded-2xl p-8 items-center justify-center mx-5">
      <UtensilsCrossed size={48} color="#ccc" />
      <Text className="text-gray-500 mt-4 text-center font-book">
        No dishes yet. Add your first dish to start receiving orders!
      </Text>
      <TouchableOpacity
        onPress={onAdd}
        className="bg-[#76AB85] rounded-full px-6 py-3 mt-4"
      >
        <Text className="text-white font-semibold">Add First Dish</Text>
      </TouchableOpacity>
    </View>
  );
});

export default function ChefDashboard() {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [kitchen, setKitchen] = useState<ChefProfile | null>(null);
  const [dishes, setDishes] = useState<ChefDish[]>([]);
  const [isAcceptingOrders, setIsAcceptingOrders] = useState(true);

  // Dish modal state
  const [dishModalVisible, setDishModalVisible] = useState(false);
  const [dishModalKey, setDishModalKey] = useState(0);
  const [editingDish, setEditingDish] = useState<ChefDish | null>(null);

  const fetchKitchenData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return;
      }

      setUserId(user.id);

      const { data: kitchenData, error: kitchenError } = await supabase
        .from('chef_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (kitchenError) throw kitchenError;
      setKitchen(kitchenData as ChefProfile);
      setIsAcceptingOrders(kitchenData.is_accepting_orders);

      const { data: dishesData, error: dishesError } = await supabase
        .from('dishes')
        .select('*')
        .eq('chef_id', user.id)
        .order('created_at', { ascending: false });

      if (dishesError) throw dishesError;
      setDishes((dishesData as ChefDish[] | null) || []);
    } catch (error) {
      console.error('Error fetching kitchen data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKitchenData();
  }, [fetchKitchenData]);

  const toggleAcceptingOrders = useCallback(
    async (value: boolean) => {
      setIsAcceptingOrders(value);
      if (!userId) return;

      const { error } = await supabase
        .from('chef_profiles')
        .update({ is_accepting_orders: value })
        .eq('id', userId);

      if (error) {
        Alert.alert('Error', 'Failed to update order status');
        setIsAcceptingOrders(!value);
      }
    },
    [userId]
  );

  const openDishModal = useCallback((dish?: ChefDish) => {
    setEditingDish(dish ?? null);
    setDishModalKey((key) => key + 1);
    setDishModalVisible(true);
  }, []);

  const closeDishModal = useCallback(() => {
    setDishModalVisible(false);
  }, []);

  const handleAddDish = useCallback(() => {
    openDishModal();
  }, [openDishModal]);

  const handleDishSaved = useCallback(async () => {
    await fetchKitchenData();
    setDishModalVisible(false);
  }, [fetchKitchenData]);

  // Only the changed row is updated, so a switch does not refetch and rebuild the whole menu.
  const toggleDishAvailability = useCallback(
    async (dishId: string, currentStatus: boolean) => {
      setDishes((current) =>
        current.map((dish) =>
          dish.id === dishId ? { ...dish, is_available: !currentStatus } : dish
        )
      );

      const { error } = await supabase
        .from('dishes')
        .update({ is_available: !currentStatus })
        .eq('id', dishId);

      if (error) {
        Alert.alert('Error', 'Failed to update dish');
        setDishes((current) =>
          current.map((dish) =>
            dish.id === dishId ? { ...dish, is_available: currentStatus } : dish
          )
        );
      }
    },
    []
  );

  const deleteDish = useCallback((dishId: string) => {
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
              setDishes((current) => current.filter((dish) => dish.id !== dishId));
            }
          },
        },
      ]
    );
  }, []);

  const renderDish = useCallback(
    ({ item }: { item: ChefDish }) => (
      <DishCard
        dish={item}
        onEdit={openDishModal}
        onDelete={deleteDish}
        onToggleAvailability={toggleDishAvailability}
      />
    ),
    [deleteDish, openDishModal, toggleDishAvailability]
  );

  const listHeader = useMemo(
    () => (
      <ChefOverviewHeader
        kitchen={kitchen}
        userId={userId ?? ''}
        dishCount={dishes.length}
        isAcceptingOrders={isAcceptingOrders}
        onToggleAcceptingOrders={toggleAcceptingOrders}
        onKitchenSaved={fetchKitchenData}
        onAddDish={handleAddDish}
      />
    ),
    [dishes.length, fetchKitchenData, handleAddDish, isAcceptingOrders, kitchen, toggleAcceptingOrders, userId]
  );

  const listEmpty = useMemo(() => <EmptyMenu onAdd={handleAddDish} />, [handleAddDish]);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator size="large" color="#76AB85" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top', 'left', 'right']}>
      <FlatList
        data={dishes}
        keyExtractor={keyExtractor}
        renderItem={renderDish}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={DISH_LIST_CONTENT_STYLE}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={listEmpty}
      />

      <DishFormModal
        key={dishModalKey}
        visible={dishModalVisible}
        userId={userId ?? ''}
        dish={editingDish}
        onClose={closeDishModal}
        onSaved={handleDishSaved}
      />
    </SafeAreaView>
  );
}
