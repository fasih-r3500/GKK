import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import { ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ChefDashboard from "../components/chef/ChefDashboard";
import ChefOnboarding from "../components/chef/ChefOnboarding";
import CustomerHome from "../components/customer/CustomerHome";
import { supabase } from "../supabase";

export default function Index() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userType, setUserType] = useState<'customer' | 'chef' | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isChefSetupComplete, setIsChefSetupComplete] = useState(false);

  useEffect(() => {
    checkUserProfile();
  }, []);

  const checkUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
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
      setLoading(false);
    }
  };

  const handleOnboardingComplete = () => {
    setIsChefSetupComplete(true);
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator size="large" color="#76AB85" />
      </SafeAreaView>
    );
  }

  // Render based on user type and setup status
  if (userType === 'chef') {
    if (!isChefSetupComplete) {
      return (
        <>
          <StatusBar style="dark" />
          <ChefOnboarding userId={userId!} onComplete={handleOnboardingComplete} />
        </>
      );
    } else {
      return (
        <>
          <StatusBar style="light" />
          <ChefDashboard userId={userId!} />
        </>
      );
    }
  }

  // Default: Customer view
  return (
    <>
      <StatusBar style="dark" />
      <CustomerHome />
    </>
  );
}