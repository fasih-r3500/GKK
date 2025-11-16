import { Link, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../supabase';

export default function LoginScreen() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setError('');

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      return;
    }

    router.replace("/"); // redirect home
  };

  return (
    <View className="flex-1 justify-center px-5 bg-white">
      <Text className="text-3xl font-bold mb-5 text-center">Login</Text>

      {error.length > 0 && <Text className="text-red-500 text-center mb-3">{error}</Text>}

      <TextInput
        className="h-12 border border-gray-300 rounded-lg px-4 my-2"
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
      />

      <TextInput
        className="h-12 border border-gray-300 rounded-lg px-4 my-2"
        placeholder="Password"
        placeholderTextColor="grey"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <TouchableOpacity
        className="bg-blue-600 rounded-lg py-3 mt-4"
        onPress={handleLogin}
      >
        <Text className="text-white text-center font-semibold text-lg">Log In</Text>
      </TouchableOpacity>

      <Link
        href="/auth/signup"
        className="text-blue-600 text-center mt-4"
      >
        No account? Sign up
      </Link>
    </View>
  );
}
