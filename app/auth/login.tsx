import { Link, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../supabase';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setError(error.message);
        return;
      }

      router.replace("/");
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top', 'left', 'right']}>
        <ScrollView 
          contentContainerClassName="flex-grow"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="flex-1 justify-center px-8 py-10">
            <View className="mb-10">
              <Text className="text-4xl font-heavy text-black mb-2 -tracking-wide">
                Welcome Back
              </Text>
              <Text className="text-base font-book text-gray-500">
                Sign in to continue
              </Text>
            </View>

            {error.length > 0 && (
              <View className="bg-red-50 border-l-4 border-red-500 py-3 px-4 rounded-lg mb-6">
                <Text className="text-red-900 text-sm font-book">{error}</Text>
              </View>
            )}

            <View className="w-full">
              <View className="mb-5">
                <Text className="text-sm font-heavy text-black mb-2">
                  Email
                </Text>
                <TextInput
                  className="h-10 bg-gray-50 border border-gray-200 rounded-xl px-4 text-base text-black font-book"
                  placeholder="Enter your email"
                  placeholderTextColor="#9CA3AF"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
                  editable={!loading}
                  returnKeyType="next"
                />
              </View>

              <View className="mb-5">
                <Text className="text-sm font-heavy text-black mb-2">
                  Password
                </Text>
                <TextInput
                  className="h-10 bg-gray-50 border border-gray-200 rounded-xl px-4 text-base text-black font-book"
                  placeholder="Enter your password"
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                  autoCapitalize="none"
                  autoComplete="password"
                  editable={!loading}
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                />
              </View>

              <TouchableOpacity
                className="bg-[#76AB85] h-10 rounded-xl justify-center items-center mt-2 shadow-lg shadow-[#76AB85]/30"
                onPress={handleLogin}
                activeOpacity={0.8}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text className="text-white text-base font-semibold tracking-wide">
                    Sign In
                  </Text>
                )}
              </TouchableOpacity>

              <View className="flex-row items-center my-8">
                <View className="flex-1 h-px bg-gray-200" />
                <Text className="text-gray-400 px-4 text-sm font-book">or</Text>
                <View className="flex-1 h-px bg-gray-200" />
              </View>

              <Link href="/auth/signup" asChild>
                <TouchableOpacity
                  className="h-10 rounded-xl justify-center items-center border-2 border-[#76AB85] bg-white"
                  activeOpacity={0.8}
                  disabled={loading}
                >
                  <Text className="text-[#76AB85] text-base font-semibold tracking-wide">
                    Create New Account
                  </Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
        </ScrollView>
    </SafeAreaView>
  );
}