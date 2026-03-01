import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  Pressable,
  ActivityIndicator,
  Alert,
  useWindowDimensions,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import tw from '../../../common/tailwind';
import FocusAwareStatusBar from '../../../common/components/FocusAwareStatusBar';
import {
  useGetUserRecipeByIdQuery,
  useDeleteCookbookRecipeMutation,
} from '../api/cookbookApi';
import { ingredientApiService } from '../../ingredients/api/ingredientApiService';
import { UserRecipe } from '../models/userRecipe';
import { CookbookStackParamList } from '../navigation/CookbookNavigation';
import { InitialStackParamList } from '../../navigation/navigator/InitialNavigator';
import { userRecipeToFramework } from '../adapters/userRecipeAdapter';
import useArrayState from '../../../common/hooks/useArrayState';
import PrepComponent from '../../prep/components/PrepComponent';
import { IFramework } from '../../../models/craft';
import { subheadLargeUppercase } from '../../../theme/typography';

/** Extract ID from string or populated object */
function extractId(value: any): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (value.$oid) return value.$oid;
  if (value._id) return typeof value._id === 'string' ? value._id : String(value._id);
  return String(value);
}

// Strip HTML tags for plain text display
function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

interface IngredientNameMap {
  [id: string]: string;
}

function isObjectId(value: string): boolean {
  return /^[0-9a-fA-F]{24}$/.test(value);
}

export default function CookbookRecipeDetailScreen() {
  const { width } = useWindowDimensions();
  const route = useRoute<RouteProp<CookbookStackParamList, 'CookbookRecipeDetail'>>();
    const heroHeight = useMemo(() => {
      const rawHeight = width * 0.65;
      return Math.min(360, Math.max(220, rawHeight));
    }, [width]);

  const navigation = useNavigation<NativeStackNavigationProp<CookbookStackParamList & InitialStackParamList>>();
  const { id, initialRecipe } = route.params as { id: string; initialRecipe?: UserRecipe };

  const { data: fetchedRecipe, isLoading, error } = useGetUserRecipeByIdQuery(id, {
    skip: !!initialRecipe,
  });
  const recipe: UserRecipe | null | undefined = initialRecipe ?? fetchedRecipe;
  const [deleteRecipe, { isLoading: isDeleting }] = useDeleteCookbookRecipeMutation();

  const [ingredientNames, setIngredientNames] = useState<IngredientNameMap>({});
  const [namesLoading, setNamesLoading] = useState(true);
  const [selectedFlavor, setSelectedFlavor] = useState('');
  const lastInitializedKeyRef = useRef<string>('');

  const [allRequiredIngredients, setAllRequiredIngredients] = useArrayState<
    {
      id: string;
      title: string;
      quantity: string;
      preparation?: string;
      ingredientId: string;
    }[]
  >();
  const [, setAllOptionalIngredients] = useArrayState<
    {
      id: string;
      title: string;
      quantity: string;
      preparation?: string;
      ingredientId: string;
    }[]
  >();

  const resolvedFramework = useMemo<IFramework | null>(() => {
    if (!recipe) return null;
    const framework = userRecipeToFramework(recipe);

    framework.components.forEach((comp) => {
      comp.requiredIngredients.forEach((ri) => {
        ri.recommendedIngredient.forEach((ing) => {
          if (!ing.title && ingredientNames[ing.id]) {
            ing.title = ingredientNames[ing.id];
          }
        });
        ri.alternativeIngredients.forEach((ai) => {
          ai.ingredient.forEach((ing) => {
            if (!ing.title && ingredientNames[ing.id]) {
              ing.title = ingredientNames[ing.id];
            }
          });
        });
      });
      comp.optionalIngredients.forEach((oi) => {
        oi.ingredient.forEach((ing) => {
          if (!ing.title && ingredientNames[ing.id]) {
            ing.title = ingredientNames[ing.id];
          }
        });
      });
    });

    return framework;
  }, [recipe, ingredientNames]);

  useEffect(() => {
    if (!recipe) return;

    // Collect only valid ObjectId strings — AI-generated recipes use plain names
    const ids = new Set<string>();
    for (const wrapper of recipe.components) {
      for (const comp of wrapper.component) {
        for (const ri of comp.requiredIngredients) {
          const recId = extractId(ri.recommendedIngredient);
          if (recId && isObjectId(recId)) ids.add(recId);

          for (const ai of ri.alternativeIngredients) {
            const aiId = extractId(ai.ingredient);
            if (aiId && isObjectId(aiId)) ids.add(aiId);
          }
        }
        for (const oi of comp.optionalIngredients) {
          const oiId = extractId(oi.ingredient);
          if (oiId && isObjectId(oiId)) ids.add(oiId);
        }
      }
    }

    const idArray = Array.from(ids).filter(Boolean);
    if (idArray.length === 0) {
      setNamesLoading(false);
      return;
    }

    ingredientApiService
      .getIngredientsByIds(idArray)
      .then((map) => {
        const names: IngredientNameMap = {};
        for (const [key, ing] of Object.entries(map)) {
          names[key] = ing.name;
        }
        setIngredientNames(names);
      })
      .catch((err) => {
        console.warn('Failed to fetch ingredient names:', err);
      })
      .finally(() => setNamesLoading(false));
  }, [recipe]);

  useEffect(() => {
    if (!resolvedFramework) return;
    const defaultFlavor = resolvedFramework.variantTags[0]?.id || '';
    if (defaultFlavor && selectedFlavor !== defaultFlavor) {
      setSelectedFlavor(defaultFlavor);
    }
  }, [resolvedFramework, selectedFlavor]);

  useEffect(() => {
    if (!resolvedFramework || !selectedFlavor) return;

    const initKey = `${resolvedFramework.id}:${selectedFlavor}:${resolvedFramework.components.length}`;
    if (lastInitializedKeyRef.current === initKey) return;
    lastInitializedKeyRef.current = initKey;

    setAllRequiredIngredients.set(
      resolvedFramework.components
        .filter(component =>
          component.includedInVariants?.some(
            variant => variant.id === selectedFlavor,
          ),
        )
        .map(component => {
          return component.requiredIngredients.map(item => ({
            id: component.id,
            title: item.recommendedIngredient[0].title,
            quantity: item.quantity,
            preparation: item.preparation,
            ingredientId: item.recommendedIngredient[0].id,
          }));
        }),
    );
    // setAllRequiredIngredients helper object identity changes on each render;
    // intentionally avoid adding it as dependency to prevent render loops.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedFramework, selectedFlavor]);

  const handleDelete = useCallback(() => {
    Alert.alert('Delete Recipe', 'Are you sure you want to remove this recipe from your cookbook?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteRecipe(id).unwrap();
            navigation.goBack();
          } catch {
            Alert.alert('Error', 'Failed to delete recipe.');
          }
        },
      },
    ]);
  }, [id, deleteRecipe, navigation]);

  const handleCookIt = useCallback(() => {
    if (!resolvedFramework) return;

    const framework = resolvedFramework;
    const defaultVariant = framework.variantTags[0]?.id || '';

    // Collect all ingredients (required recommended + selected optional) for MakeIt
    const allIngredients: { id: string; title: string; quantity: string; preparation?: string }[] = [];

    framework.components
      .filter((comp) =>
        comp.includedInVariants?.some((v) => v.id === defaultVariant) ?? true,
      )
      .forEach((comp) => {
        comp.requiredIngredients.forEach((ri) => {
          const rec = ri.recommendedIngredient[0];
          if (rec) {
            allIngredients.push({
              id: comp.id,
              title: ingredientNames[rec.id] || rec.title || 'Ingredient',
              quantity: ri.quantity,
              preparation: ri.preparation,
            });
          }
        });
        comp.optionalIngredients.forEach((oi) => {
          const ing = oi.ingredient[0];
          if (ing) {
            allIngredients.push({
              id: comp.id,
              title: ingredientNames[ing.id] || ing.title || 'Ingredient',
              quantity: oi.quantity,
              preparation: oi.preparation,
            });
          }
        });
      });

    navigation.navigate('CookbookMakeIt', {
      id: framework.id,
      variant: defaultVariant,
      ingredients: allIngredients,
    });
  }, [resolvedFramework, ingredientNames, navigation]);

  const handleOpenYouTube = useCallback(() => {
    if (!recipe?.youtubeId) return;
    Linking.openURL(`https://www.youtube.com/watch?v=${recipe.youtubeId}`);
  }, [recipe?.youtubeId]);

  if (isLoading) {
    return (
      <View style={tw`flex-1 bg-creme items-center justify-center`}>
        <ActivityIndicator size="large" color={tw.color('kale')} />
      </View>
    );
  }

  if (!recipe || error) {
    return (
      <View style={tw`flex-1 bg-creme items-center justify-center px-8`}>
        <Feather name="alert-circle" size={48} color={tw.color('chilli')} />
        <Text style={tw`text-lg font-sans-bold text-black mt-4 text-center`}>
          Recipe not found
        </Text>
        <Pressable onPress={() => navigation.goBack()} style={tw`mt-4`}>
          <Text style={tw`text-sm font-sans-semibold text-kale`}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={tw`flex-1 bg-creme`}>
      {/* Hero Image */}
      {recipe.heroImageUrl && (
        <View style={tw`relative`}>
          <Image
            source={{ uri: recipe.heroImageUrl }}
            style={{ width, height: heroHeight }}
            resizeMode="cover"
          />
          {/* Gradient Overlay */}
          <View style={tw`absolute inset-0 bg-black/20`} />
        </View>
      )}

      {/* Back + Delete buttons */}
      <SafeAreaView style={tw`absolute top-0 left-0 right-0 z-10`} edges={['top']}>
        <View style={tw`flex-row items-center justify-between px-4 pt-2`}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={tw`w-10 h-10 rounded-full bg-white/90 items-center justify-center`}
          >
            <Feather name="arrow-left" size={20} color={tw.color('black')} />
          </Pressable>
          <Pressable
            onPress={handleDelete}
            disabled={isDeleting}
            style={tw`w-10 h-10 rounded-full bg-white/90 items-center justify-center`}
          >
            <Feather name="trash-2" size={18} color={tw.color('chilli')} />
          </Pressable>
        </View>
      </SafeAreaView>

      <ScrollView
        style={tw`flex-1`}
        contentContainerStyle={tw`pb-32`}
        showsVerticalScrollIndicator={false}
      >
        {/* Title area */}
        <View style={tw`px-5 ${recipe.heroImageUrl ? 'pt-5' : 'pt-20'}`}>
          <Text style={tw`text-2xl font-sans-bold text-black mb-2`}>
            {recipe.title}
          </Text>
          <Text style={tw`text-sm font-sans text-stone leading-5 mb-4`}>
            {recipe.shortDescription}
          </Text>

          {/* Info Pills */}
          <View style={tw`flex-row flex-wrap mb-4`}>
            {recipe.prepCookTime > 0 && (
              <View style={tw`flex-row items-center bg-white rounded-full px-3 py-1.5 mr-2 mb-2`}>
                <Feather name="clock" size={14} color={tw.color('kale')} />
                <Text style={tw`text-xs font-sans-semibold text-black ml-1.5`}>
                  {recipe.prepCookTime} min
                </Text>
              </View>
            )}
            {recipe.portions && (
              <View style={tw`flex-row items-center bg-white rounded-full px-3 py-1.5 mr-2 mb-2`}>
                <Feather name="users" size={14} color={tw.color('kale')} />
                <Text style={tw`text-xs font-sans-semibold text-black ml-1.5`}>
                  {recipe.portions} portions
                </Text>
              </View>
            )}
            {recipe.youtubeId && (
              <Pressable
                onPress={handleOpenYouTube}
                style={tw`flex-row items-center bg-white rounded-full px-3 py-1.5 mr-2 mb-2`}
              >
                <Feather name="youtube" size={14} color="#FF0000" />
                <Text style={tw`text-xs font-sans-semibold text-black ml-1.5`}>
                  Watch Video
                </Text>
              </Pressable>
            )}
          </View>

          {/* Storage Info */}
          {(recipe.fridgeKeepTime || recipe.freezeKeepTime) && (
            <View style={tw`bg-white rounded-2xl p-4 mb-5`}>
              {recipe.fridgeKeepTime && (
                <View style={tw`flex-row items-start mb-2`}>
                  <Feather name="box" size={14} color={tw.color('kale')} style={tw`mt-0.5 mr-2`} />
                  <View style={tw`flex-1`}>
                    <Text style={tw`text-xs font-sans-semibold text-black`}>Fridge</Text>
                    <Text style={tw`text-xs font-sans text-stone`}>{recipe.fridgeKeepTime}</Text>
                  </View>
                </View>
              )}
              {recipe.freezeKeepTime && (
                <View style={tw`flex-row items-start`}>
                  <Feather name="thermometer" size={14} color={tw.color('blueberry')} style={tw`mt-0.5 mr-2`} />
                  <View style={tw`flex-1`}>
                    <Text style={tw`text-xs font-sans-semibold text-black`}>Freezer</Text>
                    <Text style={tw`text-xs font-sans text-stone`}>{recipe.freezeKeepTime}</Text>
                  </View>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Components / Ingredients / Steps */}
        <View style={tw`px-5`}>
          <Text style={tw.style(subheadLargeUppercase, 'mb-4 text-midgray')}>
            Ingredients & Steps
          </Text>

          {namesLoading ? (
            <View style={tw`items-center py-8`}>
              <ActivityIndicator size="small" color={tw.color('kale')} />
              <Text style={tw`text-xs font-sans text-stone mt-2`}>Loading ingredients...</Text>
            </View>
          ) : (
            resolvedFramework?.components
              .filter(component =>
                selectedFlavor
                  ? component.includedInVariants?.some(v => v.id === selectedFlavor)
                  : true,
              )
              .map((component, index) => (
                <PrepComponent
                  key={component.id}
                  {...component}
                  index={index}
                  allRequiredIngredients={allRequiredIngredients}
                  setAllRequiredIngredients={setAllRequiredIngredients}
                  setAllOptionalIngredients={setAllOptionalIngredients}
                />
              ))
          )}
        </View>

        {/* Long Description */}
        {recipe.longDescription && (
          <View style={tw`px-5 mt-4`}>
            <Text style={tw`text-lg font-sans-bold text-black mb-2`}>About</Text>
            <Text style={tw`text-sm font-sans text-stone leading-5`}>
              {stripHtml(recipe.longDescription)}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Floating Cook It Button */}
      <View style={tw`absolute bottom-0 left-0 right-0 bg-creme/95 border-t border-strokecream`}>
        <SafeAreaView edges={['bottom']} style={tw`px-5 pt-3 pb-2`}>
          <Pressable
            onPress={handleCookIt}
            style={tw`bg-kale py-4 rounded-full flex-row items-center justify-center`}
          >
            <Feather name="play-circle" size={20} color="#fff" />
            <Text style={tw`text-white font-sans-bold text-base ml-2`}>
              Cook It
            </Text>
          </Pressable>
        </SafeAreaView>
      </View>

      <FocusAwareStatusBar statusBarStyle={recipe.heroImageUrl ? 'light' : 'dark'} />
    </View>
  );
}
