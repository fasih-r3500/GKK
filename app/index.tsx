import { Redirect, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ChefOnboarding from "../components/chef/ChefOnboarding";
import { supabase } from "../supabase";

export default function Index() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userType, setUserType] = useState<'customer' | 'chef' | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isChefSetupComplete, setIsChefSetupComplete] = useState(false);

  useEffect(() => {
    let active = true;

    const checkUserProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!active) return;
        if (!user) {
          router.replace('/auth/login');
          return;
        }

        setUserId(user.id);

        // Get user profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('user_type')
          .eq('id', user.id)
          .single();

        if (!active) return;

        if (profileError) {
          console.error('Error fetching profile:', profileError);
          router.replace('/auth/login');
          return;
        }

        setUserType(profile.user_type);

        // If chef, check if setup is complete
        if (profile.user_type === 'chef') {
          const { data: chefProfile } = await supabase
            .from('chef_profiles')
            .select('kitchen_name, kitchen_address, cuisine_types')
            .eq('id', user.id)
            .single();

          if (!active) return;

          // Check if essential fields are filled
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
      } catch (error) {
        console.error('Error checking user profile:', error);
      } finally {
        if (active) setLoading(false);
      }
    };

    checkUserProfile();

    return () => {
      active = false;
    };
  }, [router]);

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

  return (
    <SafeAreaView className="flex-1 bg-white justify-center items-center">
      <ActivityIndicator size="large" color="#76AB85" />
    </SafeAreaView>
  );
}
