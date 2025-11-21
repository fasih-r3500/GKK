import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../supabase';

interface ProfileData {
  full_name: string | null;
  phone_number: string | null;
  user_type: 'customer' | 'chef';
  email: string | null;
}

export default function ProfileScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [changingPassword, setChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        router.replace('/auth/login');
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, phone_number, user_type')
        .eq('id', currentUser.id)
        .single();

      if (error) {
        console.error('Error fetching profile:', error.message);
        Alert.alert('Error', 'Could not fetch profile data.');
      } else {
        setProfile({
          ...data,
          email: currentUser.email || null
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill in both password fields.');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long.');
      return;
    }

    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        Alert.alert('Error', error.message);
      } else {
        Alert.alert('Success', 'Password changed successfully!');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'An unexpected error occurred.');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      router.replace('/auth/login');
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#76AB85" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['left', 'right']} className="flex-1 bg-white">
      <ScrollView className="flex-1 px-6" showsVerticalScrollIndicator={false}>
        <Text className="text-3xl font-heavy mb-6 mt-6">Your Profile</Text>
        
        {profile ? (
          <View className="space-y-4">
            {/* Profile Information */}
            <View className="mb-4">
              <Text className="text-sm font-heavy text-gray-500 mb-1">Full Name</Text>
              <Text className="text-lg font-book text-black">{profile.full_name || '-'}</Text>
            </View>

            <View className="mb-4">
              <Text className="text-sm font-heavy text-gray-500 mb-1">Email</Text>
              <Text className="text-lg font-book text-black">{profile.email || '-'}</Text>
            </View>

            <View className="mb-4">
              <Text className="text-sm font-heavy text-gray-500 mb-1">Phone Number</Text>
              <Text className="text-lg font-book text-black">{profile.phone_number || '-'}</Text>
            </View>

            <View className="mb-6">
              <Text className="text-sm font-heavy text-gray-500 mb-1">User Type</Text>
              <Text className="text-lg font-book text-black capitalize">{profile.user_type || '-'}</Text>
            </View>

            {/* Change Password Section */}
            <View className="border-t border-gray-200 pt-6">
              <Text className="text-xl font-heavy mb-4">Change Password</Text>
              
              <View className="mb-4">
                <Text className="text-sm font-heavy text-gray-500 mb-2">New Password</Text>
                <TextInput
                  className="border border-gray-300 rounded-xl px-4 py-3 text-base"
                  placeholder="Enter new password"
                  secureTextEntry
                  value={newPassword}
                  onChangeText={setNewPassword}
                  editable={!changingPassword}
                />
              </View>

              <View className="mb-4">
                <Text className="text-sm font-heavy text-gray-500 mb-2">Confirm Password</Text>
                <TextInput
                  className="border border-gray-300 rounded-xl px-4 py-3 text-base"
                  placeholder="Confirm new password"
                  secureTextEntry
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  editable={!changingPassword}
                />
              </View>

              <TouchableOpacity
                className="bg-[#76AB85] py-3 rounded-xl items-center mb-4"
                onPress={handleChangePassword}
                disabled={changingPassword}
              >
                {changingPassword ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text className="text-white font-heavy text-base">Update Password</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Sign Out Button */}
            <TouchableOpacity
              className="mt-4 mb-8 bg-red-500 py-3 rounded-xl items-center"
              onPress={handleSignOut}
            >
              <Text className="text-white font-heavy text-base">Sign Out</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Text className="text-red-500">Profile data not found.</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}