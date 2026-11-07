import * as ImagePicker from 'expo-image-picker';
import {
    AlertCircle,
    AlertTriangle,
    Camera,
    Check,
    CheckCircle2,
    ChevronRight,
    MapPin,
    RefreshCw,
} from 'lucide-react-native';
import React, { useRef, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LocationService } from '../../services/locationService';
import { supabase } from '../../supabase';

interface ChefOnboardingProps {
  userId: string;
  onComplete: () => void;
}

interface FieldErrors {
  kitchenName?: string;
  kitchenAddress?: string;
  postcode?: string;
  cuisines?: string;
}

type LocationState = 'idle' | 'loading' | 'found' | 'failed';
type SaveState = 'idle' | 'saving' | 'saved' | 'failed';

const TOTAL_STEPS = 3;
const ERROR_TEXT = '#7F1D1D';
const ERROR_BORDER = '#B3261E';
const BRAND_DARK = '#2F6B45';
const BRAND_TINT = '#EAF3EC';

const STEPS = [
  { number: 1, short: 'Kitchen', title: 'Your kitchen' },
  { number: 2, short: 'Location', title: 'Where you cook' },
  { number: 3, short: 'Food', title: 'The food you cook' },
];

const STEP_HINTS: Record<number, string> = {
  1: 'Next, we will ask where you cook so families can find you.',
  2: 'Next, we will ask what food you cook so families know what to expect.',
  3: 'This is the last step. When you save, your kitchen opens and families in Karachi can order the food you cook.',
};

// Keep numbers friendly: people type spaces, dashes and country codes.
const digitsOnly = (value: string) => value.replace(/\D/g, '');

const tidyText = (value: string) => value.trim().replace(/\s+/g, ' ');

const friendlySaveError = (rawMessage: string) => {
  const message = rawMessage.toLowerCase();

  if (message.includes('photo') || message.includes('avatar')) {
    return 'We could not upload your kitchen photo. Check your internet and try again, or remove the photo to save without it.';
  }
  if (
    message.includes('network') ||
    message.includes('fetch') ||
    message.includes('timeout') ||
    message.includes('offline')
  ) {
    return 'We could not reach GKK. Check your internet connection and try again.';
  }
  if (
    message.includes('jwt') ||
    message.includes('session') ||
    message.includes('token') ||
    message.includes('auth')
  ) {
    return 'Your sign in has expired. Please sign in again, then come back to finish your kitchen.';
  }
  return 'Something went wrong while we were saving your kitchen. Your details are still here, so you can try again.';
};

function FieldLabel({
  label,
  required,
}: {
  label: string;
  required?: boolean;
}) {
  return (
    <View className="flex-row items-center mb-2">
      <Text className="text-sm font-heavy text-black mr-2">{label}</Text>
      {required ? (
        <View className="bg-[#EAF3EC] rounded-full px-2 py-0.5">
          <Text className="text-[11px] font-heavy text-[#2F6B45]">Required</Text>
        </View>
      ) : (
        <Text className="text-[11px] font-book text-gray-500">Optional</Text>
      )}
    </View>
  );
}

function FieldHelp({ children }: { children: React.ReactNode }) {
  return (
    <Text className="text-xs font-book text-gray-600 mt-2 leading-5">
      {children}
    </Text>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;

  return (
    <View
      className="flex-row items-start mt-2"
      accessibilityLiveRegion="polite"
    >
      <AlertCircle size={16} color={ERROR_BORDER} style={{ marginTop: 2 }} />
      <Text className="text-sm font-book ml-1.5 flex-1" style={{ color: ERROR_TEXT }}>
        {message}
      </Text>
    </View>
  );
}

function ErrorSummary({ count }: { count: number }) {
  if (count === 0) return null;

  return (
    <View
      className="bg-red-50 border-2 rounded-xl p-4 mb-5 flex-row items-start"
      style={{ borderColor: ERROR_BORDER }}
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
    >
      <AlertCircle size={20} color={ERROR_BORDER} />
      <Text className="text-sm font-book ml-2 flex-1" style={{ color: ERROR_TEXT }}>
        {count === 1
          ? 'You are almost there. Please check the one thing marked below.'
          : `You are almost there. Please check the ${count} things marked below.`}
      </Text>
    </View>
  );
}

export default function ChefOnboarding({ userId, onComplete }: ChefOnboardingProps) {
  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [locationState, setLocationState] = useState<LocationState>('idle');
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [saveError, setSaveError] = useState('');
  const [savedKitchenName, setSavedKitchenName] = useState('');
  const scrollRef = useRef<React.ComponentRef<typeof ScrollView>>(null);

  // Kitchen Info
  const [kitchenName, setKitchenName] = useState('');
  const [bio, setBio] = useState('');
  const [kitchenAddress, setKitchenAddress] = useState('');
  const [postcode, setPostcode] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>([]);
  const [kitchenImage, setKitchenImage] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState('');

  const cuisineOptions = [
    'Pakistani', 'Indian', 'Chinese', 'Italian', 'Thai',
    'Mexican', 'Japanese', 'Mediterranean', 'American', 'Arabic'
  ];

  const saving = saveState === 'saving';
  const errorCount = Object.values(errors).filter(Boolean).length;

  const scrollToTop = () => {
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const clearError = (field: keyof FieldErrors) => {
    setErrors(prev => (prev[field] ? { ...prev, [field]: undefined } : prev));
  };

  const goToStep = (nextStep: number) => {
    setErrors({});
    setStep(nextStep);
    scrollToTop();
  };

  const getCurrentLocation = async () => {
    if (locationState === 'loading') return;

    setLocationState('loading');
    try {
      const location = await LocationService.getCurrentLocation();
      if (location) {
        const address = tidyText(location.address || '');
        const hasUsableAddress = address.replace(/[,\s]+/g, '').length > 0;
        if (hasUsableAddress) {
          setKitchenAddress(address);
          setLatitude(location.latitude);
          setLongitude(location.longitude);
          setLocationState('found');
          clearError('kitchenAddress');
        } else {
          setLocationState('failed');
        }
      } else {
        setLocationState('failed');
      }
    } catch (error) {
      console.error('Error getting location:', error);
      setLocationState('failed');
    }
  };

  const pickImage = async () => {
    setPhotoError('');

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      setPhotoError(
        'We need your permission to open your photos. You can allow photos in your phone settings, or save your kitchen without a photo.'
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setKitchenImage(result.assets[0].uri);
    }
  };

  const removeImage = () => {
    setKitchenImage(null);
    setPhotoError('');
  };

  const toggleCuisine = (cuisine: string) => {
    setSelectedCuisines(prev =>
      prev.includes(cuisine)
        ? prev.filter(item => item !== cuisine)
        : [...prev, cuisine]
    );
    clearError('cuisines');
  };

  const uploadImage = async (uri: string): Promise<string | null> => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const fileExt = uri.split('.').pop();
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, blob);

      if (uploadError) throw uploadError;

      return filePath;
    } catch (error) {
      console.error('Error uploading image:', error);
      return null;
    }
  };

  const validateStepOne = (): FieldErrors => {
    const next: FieldErrors = {};
    const name = tidyText(kitchenName);

    if (!name) {
      next.kitchenName = 'Please add your kitchen name so families know who they are ordering from.';
    } else if (name.length < 2) {
      next.kitchenName = 'That name looks too short. Please write the name families will recognise.';
    } else if (name.length > 60) {
      next.kitchenName = 'Please keep your kitchen name under 60 letters so it fits on the screen.';
    }

    return next;
  };

  const validateStepTwo = (): FieldErrors => {
    const next: FieldErrors = {};
    const address = tidyText(kitchenAddress);
    const postcodeDigits = digitsOnly(postcode);
    const postcodeIsEmpty = tidyText(postcode).length === 0;

    if (!address) {
      next.kitchenAddress = 'Please add the address where you cook so families know where to collect their food.';
    } else if (address.length < 6) {
      next.kitchenAddress = 'That address looks too short. Please add your house number, street and area.';
    }

    if (!postcodeIsEmpty && postcodeDigits.length < 4) {
      next.postcode = 'Please check the postcode. It should be at least 4 numbers, like 75600.';
    } else if (postcodeDigits.length > 6) {
      next.postcode = 'That postcode looks too long. A Karachi postcode has 5 numbers, like 75600.';
    }

    return next;
  };

  const validateStepThree = (): FieldErrors => {
    const next: FieldErrors = {};

    if (selectedCuisines.length === 0) {
      next.cuisines = 'Please pick at least one kind of food you cook so families can find you.';
    }

    return next;
  };

  const handleStepOneNext = () => {
    const nextErrors = validateStepOne();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      scrollToTop();
      return;
    }
    goToStep(2);
  };

  const handleStepTwoNext = () => {
    const nextErrors = validateStepTwo();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      scrollToTop();
      return;
    }
    goToStep(3);
  };

  const handleComplete = async () => {
    if (saving) return;

    const nextErrors = validateStepThree();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      scrollToTop();
      return;
    }

    setSaveState('saving');
    setSaveError('');

    try {
      let imagePath: string | null = null;
      if (kitchenImage) {
        imagePath = await uploadImage(kitchenImage);
        if (!imagePath) {
          throw new Error('photo upload failed');
        }
      }

      const { error } = await supabase
        .from('chef_profiles')
        .update({
          kitchen_name: tidyText(kitchenName),
          bio: bio.trim(),
          kitchen_address: tidyText(kitchenAddress),
          postcode: digitsOnly(postcode),
          latitude: latitude,
          longitude: longitude,
          cuisine_types: selectedCuisines,
          kitchen_image: imagePath,
          is_active: true,
          is_accepting_orders: true,
        })
        .eq('id', userId);

      if (error) throw error;

      setSavedKitchenName(tidyText(kitchenName));
      setSaveState('saved');
    } catch (error) {
      console.error('Error saving kitchen:', error);
      const rawMessage = error instanceof Error ? error.message : '';
      setSaveError(friendlySaveError(rawMessage));
      setSaveState('failed');
      scrollToTop();
    }
  };

  const renderProgress = () => (
    <View className="px-6 pt-4 pb-3">
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-xs font-heavy" style={{ color: BRAND_DARK }}>
          STEP {step} OF {TOTAL_STEPS}
        </Text>
        <Text className="text-xs font-book text-gray-600">
          {step === TOTAL_STEPS ? 'Last step' : `${TOTAL_STEPS - step} ${TOTAL_STEPS - step === 1 ? 'step' : 'steps'} to go`}
        </Text>
      </View>

      <View
        className="flex-row gap-2"
        accessibilityRole="progressbar"
        accessibilityLabel={`Step ${step} of ${TOTAL_STEPS}: ${STEPS[step - 1].title}`}
        accessibilityValue={{ min: 1, max: TOTAL_STEPS, now: step }}
      >
        {STEPS.map(item => {
          const done = item.number < step;
          const current = item.number === step;
          return (
            <View key={item.number} className="flex-1">
              <View
                className={`h-1.5 rounded-full ${done || current ? 'bg-[#76AB85]' : 'bg-gray-200'}`}
              />
              <View className="flex-row items-center mt-2">
                <View
                  className={`w-5 h-5 rounded-full items-center justify-center mr-1.5 ${
                    done || current ? 'bg-[#76AB85]' : 'bg-gray-200'
                  }`}
                >
                  {done ? (
                    <Check size={12} color="#FFFFFF" />
                  ) : (
                    <Text
                      className={`text-[10px] font-heavy ${
                        current ? 'text-white' : 'text-gray-600'
                      }`}
                    >
                      {item.number}
                    </Text>
                  )}
                </View>
                <Text
                  className={`text-[11px] font-heavy ${
                    current ? 'text-[#2F6B45]' : 'text-gray-600'
                  }`}
                  numberOfLines={1}
                >
                  {item.short}
                  {done ? ', done' : ''}
                </Text>
              </View>
            </View>
          );
        })}
      </View>

      <View className="bg-gray-50 rounded-xl px-4 py-3 mt-3">
        <Text className="text-sm font-heavy text-black">{STEPS[step - 1].title}</Text>
        <Text className="text-xs font-book text-gray-600 mt-1 leading-5">
          {STEP_HINTS[step]}
        </Text>
      </View>
    </View>
  );

  const renderStepOne = () => (
    <View className="px-6 pb-4">
      <Text className="text-3xl font-heavy text-black mb-2">
        Let&apos;s open your kitchen
      </Text>
      <Text className="text-base font-book text-gray-600 mb-6">
        Tell families a little about yourself. This is the first thing they will see when they find you.
      </Text>

      <ErrorSummary count={errorCount} />

      {/* Kitchen Name */}
      <View className="mb-5">
        <FieldLabel label="Kitchen name" required />
        <TextInput
          className={`h-12 rounded-xl px-4 text-base text-black font-book border-2 ${
            errors.kitchenName ? 'bg-red-50' : 'bg-gray-50 border-gray-200'
          }`}
          style={errors.kitchenName ? { borderColor: ERROR_BORDER } : undefined}
          placeholder="For example, Ammi's Kitchen"
          placeholderTextColor="#6B7280"
          value={kitchenName}
          onChangeText={(value) => {
            setKitchenName(value);
            clearError('kitchenName');
          }}
          accessibilityLabel="Kitchen name, required"
          accessibilityHint="The name families will see when they order from you"
          maxLength={60}
          returnKeyType="next"
        />
        <FieldHelp>
          Use the name your family and neighbours know you by.
        </FieldHelp>
        <FieldError message={errors.kitchenName} />
      </View>

      {/* Bio */}
      <View className="mb-5">
        <FieldLabel label="About your kitchen" />
        <TextInput
          className="min-h-24 bg-gray-50 border-2 border-gray-200 rounded-xl px-4 py-3 text-base text-black font-book"
          placeholder="For example, home cooked Sindhi biryani and fresh rotis, made the way my mother taught me."
          placeholderTextColor="#6B7280"
          value={bio}
          onChangeText={setBio}
          multiline
          textAlignVertical="top"
          accessibilityLabel="About your kitchen, optional"
          accessibilityHint="A short description of what you cook and what makes it special"
          maxLength={240}
        />
        <View className="flex-row items-center justify-between mt-2">
          <Text className="text-xs font-book text-gray-600">
            Optional. A sentence or two is plenty.
          </Text>
          <Text className="text-xs font-book text-gray-600">{bio.length}/240</Text>
        </View>
      </View>

      {/* Kitchen Image */}
      <View className="mb-6">
        <FieldLabel label="Photo of your kitchen" />
        <TouchableOpacity
          onPress={pickImage}
          className="h-32 bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl items-center justify-center overflow-hidden"
          accessibilityRole="button"
          accessibilityLabel={
            kitchenImage
              ? 'Change the photo of your kitchen'
              : 'Add a photo of your kitchen, optional'
          }
          accessibilityHint="Opens your photos so you can choose a picture of your kitchen or food"
        >
          {kitchenImage ? (
            <Image
              source={{ uri: kitchenImage }}
              className="w-full h-full rounded-xl"
              accessibilityLabel="The photo of your kitchen you have chosen"
            />
          ) : (
            <>
              <Camera size={32} color="#4B5563" />
              <Text className="text-gray-700 mt-2 font-book">Tap to add a photo</Text>
            </>
          )}
        </TouchableOpacity>
        <View className="flex-row items-center justify-between mt-2">
          <Text className="text-xs font-book text-gray-600">
            Optional. A clear photo helps families trust your kitchen.
          </Text>
          {kitchenImage ? (
            <TouchableOpacity
              onPress={removeImage}
              className="px-3 py-2"
              accessibilityRole="button"
              accessibilityLabel="Remove the kitchen photo"
            >
              <Text className="text-sm font-heavy" style={{ color: BRAND_DARK }}>
                Remove photo
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
        <FieldError message={photoError} />
      </View>

      <TouchableOpacity
        className="bg-[#76AB85] h-14 rounded-xl justify-center items-center"
        onPress={handleStepOneNext}
        accessibilityRole="button"
        accessibilityLabel="Continue to where you cook"
      >
        <View className="flex-row items-center">
          <Text className="text-white text-base font-heavy mr-2">Continue</Text>
          <ChevronRight size={20} color="#FFFFFF" />
        </View>
      </TouchableOpacity>
    </View>
  );

  const renderStepTwo = () => (
    <View className="px-6 pb-4">
      <Text className="text-3xl font-heavy text-black mb-2">
        Where do you cook?
      </Text>
      <Text className="text-base font-book text-gray-600 mb-6">
        Families use this to find you and to plan when they collect their food.
      </Text>

      <ErrorSummary count={errorCount} />

      <View className="mb-5">
        <FieldLabel label="Kitchen address" required />

        <TouchableOpacity
          onPress={getCurrentLocation}
          className="flex-row items-center justify-center mb-3 bg-[#76AB85] rounded-xl px-4 h-12"
          disabled={locationState === 'loading'}
          accessibilityRole="button"
          accessibilityLabel={
            locationState === 'loading'
              ? 'Finding your location'
              : 'Use my current location'
          }
          accessibilityState={{ disabled: locationState === 'loading' }}
        >
          {locationState === 'loading' ? (
            <>
              <ActivityIndicator color="#FFFFFF" />
              <Text className="text-white font-heavy ml-2">Finding your location...</Text>
            </>
          ) : (
            <>
              <MapPin size={20} color="#FFFFFF" />
              <Text className="text-white font-heavy ml-2">Use my current location</Text>
            </>
          )}
        </TouchableOpacity>

        {locationState === 'found' ? (
          <View
            className="flex-row items-start rounded-xl p-3 mb-3"
            style={{ backgroundColor: BRAND_TINT }}
            accessibilityLiveRegion="polite"
          >
            <Check size={18} color={BRAND_DARK} />
            <Text className="text-sm font-book ml-2 flex-1" style={{ color: BRAND_DARK }}>
              We found your location. Check the address below and change it if it needs a correction.
            </Text>
          </View>
        ) : null}

        {locationState === 'failed' ? (
          <View
            className="bg-red-50 border-2 rounded-xl p-3 mb-3"
            style={{ borderColor: ERROR_BORDER }}
            accessibilityRole="alert"
            accessibilityLiveRegion="assertive"
          >
            <View className="flex-row items-start">
              <AlertCircle size={18} color={ERROR_BORDER} />
              <Text className="text-sm font-book ml-2 flex-1" style={{ color: ERROR_TEXT }}>
                We could not find your location. You can type your address below, or try again.
              </Text>
            </View>
            <TouchableOpacity
              onPress={getCurrentLocation}
              className="mt-2 h-11 self-start flex-row items-center px-3 rounded-lg border-2"
              style={{ borderColor: ERROR_BORDER }}
              accessibilityRole="button"
              accessibilityLabel="Try finding my location again"
            >
              <RefreshCw size={16} color={ERROR_BORDER} />
              <Text className="font-heavy ml-2" style={{ color: ERROR_BORDER }}>
                Try again
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <TextInput
          className={`min-h-20 rounded-xl px-4 py-3 text-base text-black font-book border-2 ${
            errors.kitchenAddress ? 'bg-red-50' : 'bg-gray-50 border-gray-200'
          }`}
          style={errors.kitchenAddress ? { borderColor: ERROR_BORDER } : undefined}
          placeholder="For example, House 12, Street 4, Block C, Gulshan"
          placeholderTextColor="#6B7280"
          value={kitchenAddress}
          onChangeText={(value) => {
            setKitchenAddress(value);
            clearError('kitchenAddress');
            if (locationState === 'found') setLocationState('idle');
          }}
          multiline
          textAlignVertical="top"
          accessibilityLabel="Kitchen address, required"
          accessibilityHint="The address where you cook, including house number, street and area"
        />
        <FieldHelp>
          Please add the house number, street and area. You can type it in English or Urdu.
        </FieldHelp>
        <FieldError message={errors.kitchenAddress} />
      </View>

      <View className="mb-6">
        <FieldLabel label="Postcode" />
        <TextInput
          className={`h-12 rounded-xl px-4 text-base text-black font-book border-2 ${
            errors.postcode ? 'bg-red-50' : 'bg-gray-50 border-gray-200'
          }`}
          style={errors.postcode ? { borderColor: ERROR_BORDER } : undefined}
          placeholder="For example, 75600"
          placeholderTextColor="#6B7280"
          value={postcode}
          onChangeText={(value) => {
            setPostcode(value);
            clearError('postcode');
          }}
          keyboardType="number-pad"
          maxLength={12}
          accessibilityLabel="Postcode, optional"
          accessibilityHint="The postcode for your area. Numbers only, for example 75600"
        />
        <FieldHelp>
          Optional. Numbers only. Spaces and dashes are fine too.
        </FieldHelp>
        <FieldError message={errors.postcode} />
      </View>

      <View className="flex-row gap-3">
        <TouchableOpacity
          className="flex-1 h-14 border-2 border-[#76AB85] rounded-xl justify-center items-center"
          onPress={() => goToStep(1)}
          accessibilityRole="button"
          accessibilityLabel="Go back to your kitchen details"
        >
          <Text className="text-[#76AB85] text-base font-heavy">Back</Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="flex-1 bg-[#76AB85] h-14 rounded-xl justify-center items-center"
          onPress={handleStepTwoNext}
          accessibilityRole="button"
          accessibilityLabel="Continue to the food you cook"
        >
          <View className="flex-row items-center">
            <Text className="text-white text-base font-heavy mr-2">Continue</Text>
            <ChevronRight size={20} color="#FFFFFF" />
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStepThree = () => (
    <View className="px-6 pb-4">
      <Text className="text-3xl font-heavy text-black mb-2">
        What food do you cook?
      </Text>
      <Text className="text-base font-book text-gray-600 mb-6">
        Pick every kind of food you make. Families will search for you using these, so choose the ones you cook often.
      </Text>

      <ErrorSummary count={errorCount} />

      <View
        className={`flex-row flex-wrap gap-3 mb-2 ${
          errors.cuisines ? 'rounded-xl p-2 border-2 bg-red-50' : ''
        }`}
        style={errors.cuisines ? { borderColor: ERROR_BORDER } : undefined}
      >
        {cuisineOptions.map((cuisine) => {
          const selected = selectedCuisines.includes(cuisine);
          return (
            <TouchableOpacity
              key={cuisine}
              onPress={() => toggleCuisine(cuisine)}
              className={`px-4 min-h-12 justify-center rounded-full border-2 ${
                selected
                  ? 'bg-[#76AB85] border-[#76AB85]'
                  : 'bg-white border-gray-300'
              }`}
              accessibilityRole="button"
              accessibilityLabel={`${cuisine}${selected ? ', selected' : ''}`}
              accessibilityState={{ selected }}
            >
              <View className="flex-row items-center">
                {selected ? (
                  <Check size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                ) : null}
                <Text
                  className={`font-heavy ${
                    selected ? 'text-white' : 'text-gray-700'
                  }`}
                >
                  {cuisine}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
      <FieldError message={errors.cuisines} />
      <Text className="text-xs font-book text-gray-600 mt-3 mb-6">
        Optional: you can add more kinds of food later from your kitchen.
      </Text>

      {saveState === 'failed' ? (
        <View
          className="bg-red-50 border-2 rounded-xl p-4 mb-4"
          style={{ borderColor: ERROR_BORDER }}
          accessibilityRole="alert"
          accessibilityLiveRegion="assertive"
        >
          <View className="flex-row items-start">
            <AlertTriangle size={20} color={ERROR_BORDER} />
            <View className="flex-1 ml-2">
              <Text className="text-sm font-heavy mb-1" style={{ color: ERROR_TEXT }}>
                We could not save your kitchen
              </Text>
              <Text className="text-sm font-book" style={{ color: ERROR_TEXT }}>
                {saveError}
              </Text>
              <Text className="text-xs font-book mt-1" style={{ color: ERROR_TEXT }}>
                Nothing you wrote is lost.
              </Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={handleComplete}
            className="mt-3 h-12 rounded-xl border-2 flex-row items-center justify-center"
            style={{ borderColor: ERROR_BORDER }}
            accessibilityRole="button"
            accessibilityLabel="Try saving my kitchen again"
          >
            <RefreshCw size={18} color={ERROR_BORDER} />
            <Text className="font-heavy ml-2" style={{ color: ERROR_BORDER }}>
              Try saving again
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {saving ? (
        <Text
          className="text-sm font-book text-gray-600 mb-3 text-center"
          accessibilityLiveRegion="polite"
        >
          Please keep this screen open while we save your kitchen.
        </Text>
      ) : null}

      <View className="flex-row gap-3">
        <TouchableOpacity
          className={`flex-1 h-14 border-2 border-[#76AB85] rounded-xl justify-center items-center ${
            saving ? 'opacity-50' : ''
          }`}
          onPress={() => goToStep(2)}
          disabled={saving}
          accessibilityRole="button"
          accessibilityLabel="Go back to your kitchen address"
          accessibilityState={{ disabled: saving }}
        >
          <Text className="text-[#76AB85] text-base font-heavy">Back</Text>
        </TouchableOpacity>

        <TouchableOpacity
          className={`flex-1 bg-[#76AB85] h-14 rounded-xl justify-center items-center ${
            saving ? 'opacity-70' : ''
          }`}
          onPress={handleComplete}
          disabled={saving}
          accessibilityRole="button"
          accessibilityLabel={saving ? 'Saving your kitchen' : 'Save and open my kitchen'}
          accessibilityState={{ disabled: saving, busy: saving }}
        >
          {saving ? (
            <View className="flex-row items-center">
              <ActivityIndicator color="#FFFFFF" />
              <Text className="text-white text-base font-heavy ml-2">
                Saving...
              </Text>
            </View>
          ) : (
            <Text className="text-white text-base font-heavy">Save my kitchen</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  if (saveState === 'saved') {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={['top', 'left', 'right']}>
        <View className="flex-1 px-6 justify-center items-center">
          <View
            className="w-20 h-20 rounded-full items-center justify-center mb-6"
            style={{ backgroundColor: BRAND_TINT }}
          >
            <CheckCircle2 size={44} color={BRAND_DARK} />
          </View>
          <Text
            className="text-3xl font-heavy text-black text-center mb-3"
            accessibilityRole="header"
          >
            Your kitchen is open
          </Text>
          <Text className="text-base font-book text-gray-600 text-center mb-8 leading-6">
            Families in Karachi can now find {savedKitchenName} and order the food you cook. You can add your dishes and change any details later from your kitchen.
          </Text>
          <TouchableOpacity
            className="bg-[#76AB85] h-14 rounded-xl justify-center items-center w-full"
            onPress={onComplete}
            accessibilityRole="button"
            accessibilityLabel="Go to my kitchen"
          >
            <Text className="text-white text-base font-heavy">Go to my kitchen</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top', 'left', 'right']}>
      {renderProgress()}

      <ScrollView
        ref={scrollRef}
        className="flex-1"
        contentContainerClassName="pb-10"
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        {step === 1 && renderStepOne()}
        {step === 2 && renderStepTwo()}
        {step === 3 && renderStepThree()}
      </ScrollView>
    </SafeAreaView>
  );
}
