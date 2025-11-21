import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../supabase';

export default function SignupScreen() {
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [userType, setUserType] = useState<'customer' | 'chef'>('customer');
  const [isChefConfirmed, setIsChefConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Format phone → always +92XXXXXXXXXX
  const formatPhone = (value: string) => {
    let digits = value.replace(/\D/g, '');
    if (digits.startsWith('0')) digits = digits.slice(1);
    if (digits.length > 10) digits = digits.slice(0, 10);
    return '+92' + digits;
  };

  const handleSignup = async () => {
    if (!fullName || !phoneNumber || !email || !password) {
      setError('Please fill in all fields');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const formattedPhone = formatPhone(phoneNumber);

      const { error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(), // Add trim
            phone_number: formattedPhone,
            user_type: userType,
          },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      // Show email confirmation popup
      Alert.alert(
        'Confirm Your Email',
        'A confirmation link has been sent to your email. Please verify to continue.',
        [{ text: 'OK', onPress: () => router.replace('/auth/login') }]
      );
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const toggleChef = () => {
    if (!isChefConfirmed) {
      Alert.alert(
        'Register as Chef?',
        'Are you sure you want to register as a chef?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Yes', onPress: () => { setUserType('chef'); setIsChefConfirmed(true); } },
        ]
      );
    } else {
      Alert.alert(
        'Cancel Chef Registration?',
        'You are currently registering as a chef. Do you want to cancel?',
        [
          { text: 'No', style: 'cancel' },
          { text: 'Yes', onPress: () => { setUserType('customer'); setIsChefConfirmed(false); } },
        ]
      );
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top', 'left', 'right']}>
      <ScrollView contentContainerClassName="flex-grow" keyboardShouldPersistTaps="handled">
        <View className="flex-1 justify-center px-8 py-10">

          <Text className="text-4xl font-heavy text-black mb-2">
            Create Account
          </Text>

          {error.length > 0 && (
            <View className="bg-red-50 border-l-4 border-red-500 py-3 px-4 rounded-lg mb-6">
              <Text className="text-red-900 text-sm font-book">{error}</Text>
            </View>
          )}

          {/* Full Name */}
          <View className="mb-5">
            <Text className="text-sm font-heavy text-black mb-2">Full Name</Text>
            <TextInput
              className="h-10 bg-gray-50 border border-gray-200 rounded-xl px-4 text-base"
              placeholder="Enter your full name"
              value={fullName}
              onChangeText={setFullName}
            />
          </View>

          {/* Phone Number */}
          <View className="mb-5 flex-row items-center">
            <View className="bg-gray-200 px-3 py-2 rounded-l-xl">
              <Text className="text-black font-semibold">+92</Text>
            </View>
            <TextInput
              className="h-10 bg-gray-50 border border-gray-200 rounded-r-xl px-4 text-base flex-1"
              placeholder="XXXXXXXXXX"
              keyboardType="phone-pad"
              value={phoneNumber.replace(/^0/, '')} // remove leading 0
              maxLength={10}
              onChangeText={setPhoneNumber}
            />
          </View>

          {/* Email */}
          <View className="mb-5">
            <Text className="text-sm font-heavy text-black mb-2">Email</Text>
            <TextInput
              className="h-10 bg-gray-50 border border-gray-200 rounded-xl px-4 text-base"
              placeholder="Enter your email"
              value={email}
              autoCapitalize="none"
              keyboardType="email-address"
              onChangeText={setEmail}
            />
          </View>

          {/* Password */}
          <View className="mb-5">
            <Text className="text-sm font-heavy text-black mb-2">Password</Text>
            <TextInput
              className="h-10 bg-gray-50 border border-gray-200 rounded-xl px-4 text-base"
              placeholder="Create a password"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          {/* Register Button */}
          <TouchableOpacity
            className="bg-[#76AB85] h-10 rounded-xl justify-center items-center mt-2"
            onPress={handleSignup}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text className="text-white text-base font-semibold">Create Account</Text>
            )}
          </TouchableOpacity>

          {/* Register as chef */}
          <TouchableOpacity
            className="mt-6 items-center"
            onPress={toggleChef}
          >
            <Text className="text-[#76AB85] font-semibold text-center">
              {isChefConfirmed
                ? 'You are registering as a chef. Tap to cancel if needed.'
                : 'Registering as a Chef?'}
            </Text>
          </TouchableOpacity>

          <View className="flex-row items-center my-8">
            <View className="flex-1 h-px bg-gray-200" />
            <Text className="text-gray-400 px-4 text-sm font-book">or</Text>
            <View className="flex-1 h-px bg-gray-200" />
          </View>

          {/* Sign In */}
          <TouchableOpacity onPress={() => router.push('/auth/login')}>
            <Text className="text-[#76AB85] text-center text-base font-semibold">
              Already have an account? Sign In
            </Text>
          </TouchableOpacity>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
