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
  'instagram.com',
  'instagr.am',
  'www.youtube.com',
  'm.youtube.com',
  'www.instagram.com',
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
      Alert.alert('Missing Link', 'Please paste a YouTube or Instagram recipe link.');
      return;
    }

    if (!isValidRecipeLink(trimmedLink)) {
      Alert.alert(
        'Invalid Link',
        'Please paste a valid YouTube or Instagram link.',
      );
      return;
    }

    try {
      const result = await addRecipe({
        message: `Generate recipe for ${trimmedLink} link`,
      }).unwrap();

      if (result.success && result.data) {
        setLink('');
        navigation.replace('CookbookRecipeDetail', { id: result.data._id, initialRecipe: result.data });
      } else {
        Alert.alert(
          'Generation Failed',
          result.message || 'Could not generate recipe. Please try again.',
        );
      }
    } catch (error: any) {
      const isTimeout =
        error?.name === 'AbortError' ||
        error?.name === 'TimeoutError' ||
        error?.status === 'TIMEOUT_ERROR';

      const rawServerMsg = error?.data?.message ?? error?.error ?? error?.message;
      const serverMsg =
        typeof rawServerMsg === 'string'
          ? rawServerMsg
          : Array.isArray(rawServerMsg)
            ? rawServerMsg.filter(Boolean).join(', ')
            : '';

      const normalizedMsg = serverMsg.toLowerCase();
      const isInvalid =
        normalizedMsg.includes('invalid response') ||
        normalizedMsg.includes('could not parse') ||
        normalizedMsg.includes('empty response');

      let title = 'Error';
      let message = 'Something went wrong. Please try again.';

      if (isTimeout) {
        title = 'Timed Out';
        message =
          'The request took too long. Please try again — it usually works on a second attempt.';
      } else if (isInvalid) {
        title = 'Could Not Read Recipe';
        message =
          'The AI couldn\'t parse a recipe from that link. Try a different link or try again.';
      } else if (serverMsg) {
        message = serverMsg;
      }

      Alert.alert(title, message);
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
              Copy a recipe link from YouTube or Instagram and our AI will
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
              <View style={tw`flex-row items-center bg-white border border-eggplant px-4 py-2 rounded-full`}>
                <Feather name="instagram" size={14} color={tw.color('eggplant-vibrant') || '#7E42FF'} />
                <Text style={tw.style(subheadMediumUppercase, 'text-eggplant-vibrant ml-1.5')}>
                  Instagram
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
                  placeholder="https://youtu.be/... or https://instagram.com/..."
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

            {/* Loading State */}
            {isLoading && (
              <View style={tw`items-center mt-8`}>
                <ActivityIndicator size="large" color={tw.color('green-600') || '#16A34A'} />
                <Text style={tw.style(bodyMediumBold, 'text-green-700 mt-4 text-center')}>
                  AI is extracting your recipe...
                </Text>
                <Text style={tw.style(bodyMediumRegular, 'text-stone mt-1 text-center')}>
                  This may take 15-30 seconds
                </Text>
              </View>
            )}

            {/* Generate Button */}
            {!isLoading && (
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
                  • Instagram reels and posts with recipes work great
                </Text>
              </View>
              <View>
                <Text style={tw.style(bodyMediumRegular, 'text-[11px] text-stone leading-4')}>
                  • You can generate up to 5 recipes per day
                </Text>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </ImageBackground>
    </SafeAreaView>
  );
}
