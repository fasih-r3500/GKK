import { Redirect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ChefOnboarding from "../components/chef/ChefOnboarding";
import { supabase } from "../supabase";

export default function Index() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userType, setUserType] = useState<'customer' | 'chef' | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isChefSetupComplete, setIsChefSetupComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkUserProfile = useCallback(async () => {
    setError(null);
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/auth/login');
        return;
      }

      setUserId(user.id);

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('user_type')
        .eq('id', user.id)
        .single();

      if (profileError) {
        throw profileError;
      }

      setUserType(profile.user_type);

      if (profile.user_type === 'chef') {
        const { data: chefProfile } = await supabase
          .from('chef_profiles')
          .select('kitchen_name, kitchen_address, cuisine_types')
          .eq('id', user.id)
          .single();

        const isSetupComplete =
          chefProfile &&
          chefProfile.kitchen_name &&
          chefProfile.kitchen_name !== 'My Kitchen' &&
          chefProfile.kitchen_address &&
          chefProfile.kitchen_address !== 'Address not set' &&
          chefProfile.cuisine_types &&
          chefProfile.cuisine_types.length > 0;

        setIsChefSetupComplete(isSetupComplete || false);
      }
    } catch (err) {
      console.error('Error checking user profile:', err);
      const message =
        (err as { message?: string } | null)?.message ?? 'Something went wrong.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    checkUserProfile();
  }, [checkUserProfile]);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator size="large" color="#76AB85" />
      </SafeAreaView>
    );
  }

  if (userType === 'chef') {
    if (!isChefSetupComplete) {
      return <ChefOnboarding userId={userId!} onComplete={() => setIsChefSetupComplete(true)} />;
    }
    return <Redirect href="/chef" />;
  }

  if (userType === 'customer') {
    return <Redirect href="/home" />;
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-white justify-center items-center px-6">
        <Text className="text-lg font-semibold text-gray-900 mb-2 text-center">
          Couldn&apos;t load your account
        </Text>
        <Text className="text-sm text-gray-500 mb-6 text-center">{error}</Text>
        <Pressable
          className="bg-[#76AB85] rounded-full px-6 py-3 mb-3"
          onPress={checkUserProfile}
        >
          <Text className="text-white font-semibold">Try again</Text>
        </Pressable>
        <Pressable
          className="px-6 py-3"
          onPress={() => router.replace('/auth/login')}
        >
          <Text className="text-[#76AB85] font-semibold">Log in</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white justify-center items-center">
      <ActivityIndicator size="large" color="#76AB85" />
    </SafeAreaView>
  );
}
