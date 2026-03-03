import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  ImageBackground,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import tw from '../../../common/tailwind';
import FocusAwareStatusBar from '../../../common/components/FocusAwareStatusBar';
import {
  h6TextStyle,
  bodyMediumRegular,
  bodyMediumBold,
  subheadMediumUppercase,
} from '../../../theme/typography';
import { useAddRecipeFromLinkMutation } from '../api/cookbookApi';
import { CookbookStackParamList } from '../navigation/CookbookNavigation';

const SUPPORTED_DOMAINS = [
  'youtube.com',
  'youtu.be',
  'www.youtube.com',
  'm.youtube.com',
];

function isValidRecipeLink(url: string): boolean {
  try {
    const parsed = new URL(url.trim());
    return SUPPORTED_DOMAINS.some(
      (d) => parsed.hostname === d || parsed.hostname.endsWith(`.${d}`),
    );
  } catch {
    return false;
  }
}

export default function AddRecipeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<CookbookStackParamList>>();
  const [link, setLink] = useState('');
  const [addRecipe, { isLoading }] = useAddRecipeFromLinkMutation();
  const [submitted, setSubmitted] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const handlePaste = useCallback(async () => {
    try {
      const { Clipboard: RNClipboard } = require('react-native');
      const text = RNClipboard?.getString ? await RNClipboard.getString() : '';
      if (text) setLink(text);
    } catch {
    }
  }, []);

  const handleGenerate = useCallback(async () => {
    Keyboard.dismiss();
    const trimmedLink = link.trim();

    if (!trimmedLink) {
      Alert.alert('Missing Link', 'Please paste a YouTube recipe link.');
      return;
    }

    if (!isValidRecipeLink(trimmedLink)) {
      Alert.alert(
        'Invalid Link',
        'Please paste a valid YouTube link.',
      );
      return;
    }

    try {
      const result = await addRecipe({
        message: `Generate recipe for ${trimmedLink} link`,
      }).unwrap();

      if (result.success && result.queued) {
        setLink('');
        navigation.replace('CookbookHome');
      } else if (result.success && result.data) {
        // Fallback: if server returns data directly (backward compat)
        setLink('');
        navigation.replace('CookbookRecipeDetail', { id: result.data._id, initialRecipe: result.data });
      } else {
        Alert.alert(
          'Generation Failed',
          result.message || 'Could not generate recipe. Please try again.',
        );
      }
    } catch (error: any) {
      const rawServerMsg = error?.data?.message ?? error?.error ?? error?.message;
      const serverMsg =
        typeof rawServerMsg === 'string'
          ? rawServerMsg
          : Array.isArray(rawServerMsg)
            ? rawServerMsg.filter(Boolean).join(', ')
            : '';

      Alert.alert('Error', serverMsg || 'Something went wrong. Please try again.');
    }
  }, [link, addRecipe, navigation]);

  return (
    <SafeAreaView style={tw`flex-1 bg-white`} edges={['top']}>
      <FocusAwareStatusBar statusBarStyle="dark" />
      <View style={tw`flex-row items-center px-5 pt-3 pb-2`}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={tw`w-10 h-10 rounded-full bg-green-50 items-center justify-center mr-3`}
        >
          <Feather name="arrow-left" size={20} color={tw.color('green-600') || '#16A34A'} />
        </Pressable>
        <Text style={tw.style(h6TextStyle, 'text-gray-900 flex-1')}>
          Add Recipe
        </Text>
      </View>

      <ImageBackground
        style={tw`flex-1`}
        source={require('../../../../assets/ribbons/lemon.png')}
      >
        <KeyboardAvoidingView
          style={tw`flex-1`}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            style={tw`flex-1`}
            contentContainerStyle={tw`px-5 pt-4 pb-10`}
            keyboardShouldPersistTaps="handled"
          >
            {/* Instructions */}
            <Text style={tw.style(bodyMediumBold, 'text-gray-900 mb-2')}>
              Paste a Recipe Link
            </Text>
            <Text style={tw.style(bodyMediumRegular, 'text-gray-500 mb-5 leading-5')}>
              Copy a recipe link from YouTube and our AI will
              extract all the ingredients, steps, and details for you.
            </Text>

            {/* Supported platforms */}
            <View style={tw`flex-row mb-5`}>
              <View style={tw`flex-row items-center bg-white border border-eggplant px-4 py-2 rounded-full mr-2`}>
                <Feather name="youtube" size={14} color={tw.color('eggplant-vibrant') || '#7E42FF'} />
                <Text style={tw.style(subheadMediumUppercase, 'text-eggplant-vibrant ml-1.5')}>
                  YouTube
                </Text>
              </View>
            </View>

            {/* Link Input */}
            <View style={tw`bg-white rounded-lg border border-gray-100 p-1 shadow-sm`}>
              <View style={tw`flex-row items-center`}>
                <Feather
                  name="link-2"
                  size={18}
                  color={tw.color('stone')}
                  style={tw`ml-3`}
                />
                <TextInput
                  ref={inputRef}
                  style={tw`flex-1 font-sans text-sm text-black py-3.5 px-3`}
                  placeholder="https://youtu.be/..."
                  placeholderTextColor={tw.color('stone')}
                  value={link}
                  onChangeText={setLink}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  returnKeyType="go"
                  onSubmitEditing={handleGenerate}
                  editable={!isLoading}
                />
                {link.length > 0 && !isLoading && (
                  <Pressable onPress={() => setLink('')} style={tw`mr-2`}>
                    <Feather name="x-circle" size={18} color={tw.color('stone')} />
                  </Pressable>
                )}
              </View>
            </View>

            {/* Paste Button */}
            <Pressable
              onPress={handlePaste}
              style={tw`mt-3 self-start flex-row items-center`}
              disabled={isLoading}
            >
              <Feather name="clipboard" size={14} color={tw.color('eggplant-vibrant') || '#7E42FF'} />
              <Text style={tw.style(subheadMediumUppercase, 'text-eggplant-vibrant ml-1')}>
                Paste from clipboard
              </Text>
            </Pressable>

            {/* Submitted State — recipe queued */}
            {submitted && (
              <View style={tw`items-center mt-8`}>
                <View style={tw`w-16 h-16 rounded-full bg-green-100 items-center justify-center mb-4`}>
                  <Feather name="bell" size={28} color={tw.color('green-600') || '#16A34A'} />
                </View>
                <Text style={tw.style(bodyMediumBold, 'text-green-700 text-center')}>
                  Recipe is being generated!
                </Text>
                <Text style={tw.style(bodyMediumRegular, 'text-stone mt-2 text-center leading-5 px-4')}>
                  Our AI is working on your recipe in the background. We'll send you a notification when it's ready in your cookbook.
                </Text>
                <Pressable
                  onPress={() => navigation.replace('CookbookHome')}
                  style={tw`mt-6 bg-green-600 py-3.5 px-8 rounded-full flex-row items-center justify-center`}
                >
                  <Feather name="arrow-left" size={18} color="#fff" />
                  <Text style={tw.style(bodyMediumBold, 'text-white ml-2')}>
                    Back to Cookbook
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    setSubmitted(false);
                    setLink('');
                  }}
                  style={tw`mt-3`}
                >
                  <Text style={tw.style(bodyMediumBold, 'text-eggplant-vibrant')}>
                    Add Another Recipe
                  </Text>
                </Pressable>
              </View>
            )}

            {/* Loading State */}
            {isLoading && !submitted && (
              <View style={tw`items-center mt-8`}>
                <ActivityIndicator size="large" color={tw.color('green-600') || '#16A34A'} />
                <Text style={tw.style(bodyMediumBold, 'text-green-700 mt-4 text-center')}>
                  Submitting your recipe link...
                </Text>
              </View>
            )}

            {/* Generate Button */}
            {!isLoading && !submitted && (
              <Pressable
                onPress={handleGenerate}
                style={tw`mt-8 bg-green-600 py-4 rounded-full flex-row items-center justify-center`}
                disabled={!link.trim()}
              >
                <Feather name="zap" size={20} color="#fff" />
                <Text style={tw.style(bodyMediumBold, 'text-white ml-2')}>
                  Generate Recipe
                </Text>
              </Pressable>
            )}

            {/* Tips */}
            {!submitted && (
            <View style={tw`mt-8 bg-white border border-gray-100 rounded-lg p-4 shadow-sm`}>
              <Text style={tw.style(bodyMediumBold, 'text-gray-900 mb-3')}>
                Tips
              </Text>
              <View style={tw`mb-2`}>
                <Text style={tw.style(bodyMediumRegular, 'text-[11px] text-stone leading-4')}>
                  • Make sure the link is a cooking/recipe video
                </Text>
              </View>
              <View style={tw`mb-2`}>
                <Text style={tw.style(bodyMediumRegular, 'text-[11px] text-stone leading-4')}>
                  • YouTube Shorts and full videos are both supported
                </Text>
              </View>
              <View style={tw`mb-2`}>
                <Text style={tw.style(bodyMediumRegular, 'text-[11px] text-stone leading-4')}>
                  • Best results come from clear recipe videos with visible steps
                </Text>
              </View>
              <View>
                <Text style={tw.style(bodyMediumRegular, 'text-[11px] text-stone leading-4')}>
                  • You can generate up to 5 recipes per day
                </Text>
              </View>
            </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </ImageBackground>
    </SafeAreaView>
  );
}
