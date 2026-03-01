import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  ImageBackground,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  useWindowDimensions,
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
import { useGetUserRecipesQuery } from '../api/cookbookApi';
import { UserRecipe } from '../models/userRecipe';
import { CookbookStackParamList } from '../navigation/CookbookNavigation';

function RecipeCard({
  recipe,
  onPress,
  cardWidth,
}: {
  recipe: UserRecipe;
  onPress: () => void;
  cardWidth: number;
}) {
  const heroHeight = Math.max(220, cardWidth * 0.65);

  return (
    <Pressable
      onPress={onPress}
      style={tw`mb-4 overflow-hidden rounded-2xl border border-strokecream bg-creme`}
    >
      {recipe.heroImageUrl ? (
        <Image
          source={{ uri: recipe.heroImageUrl }}
          style={[tw`w-full`, { height: heroHeight }]}
          resizeMode="cover"
        />
      ) : (
        <View
          style={[
            tw`w-full bg-white items-center justify-center`,
            { height: heroHeight },
          ]}
        >
          <Feather name="book-open" size={34} color={tw.color('stone') || '#78716C'} />
        </View>
      )}
      <View style={tw`px-4 pt-4 pb-4`}>
        <Text style={tw.style(bodyMediumBold, 'text-black text-lg mb-1')} numberOfLines={2}>
          {recipe.title}
        </Text>
        <Text style={tw.style(bodyMediumRegular, 'text-stone text-sm leading-5')} numberOfLines={3}>
          {recipe.shortDescription}
        </Text>

        <View style={tw`mt-3 flex-row flex-wrap`}>
          {recipe.prepCookTime > 0 && (
            <View style={tw`mr-2 mb-2 flex-row items-center rounded-full bg-white px-3 py-1.5`}>
              <Feather name="clock" size={14} color={tw.color('kale')} />
              <Text style={tw.style(bodyMediumBold, 'ml-1.5 text-xs text-black')}>
                {recipe.prepCookTime} min
              </Text>
            </View>
          )}
          {recipe.portions && (
            <View style={tw`mr-2 mb-2 flex-row items-center rounded-full bg-white px-3 py-1.5`}>
              <Feather name="users" size={14} color={tw.color('kale')} />
              <Text style={tw.style(bodyMediumBold, 'ml-1.5 text-xs text-black')}>
                {recipe.portions} portions
              </Text>
            </View>
          )}

          <View
            style={tw`mb-2 self-start rounded-full border px-3 py-1.5 ${
              recipe.status === 'accepted'
                ? 'bg-green-50 border-green-200'
                : recipe.status === 'pending'
                ? 'bg-amber-50 border-amber-200'
                : 'bg-red-50 border-red-200'
            }`}
          >
            <Text style={tw.style(subheadMediumUppercase, 'text-gray-700 capitalize')}>
              {recipe.status === 'accepted' ? 'AI Generated' : recipe.status}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

function EmptyState({ onAddRecipe }: { onAddRecipe: () => void }) {
  return (
    <View style={tw`items-center justify-center px-10 mt-10`}>
      <View style={tw`w-20 h-20 rounded-full bg-gray-100 items-center justify-center mb-6`}>
        <Feather name="book-open" size={40} color={tw.color('stone') || '#78716C'} />
      </View>
      <Text style={tw.style(bodyMediumBold, 'text-stone text-center mt-4')}>
        Your CookBook is Empty
      </Text>
      <Text style={tw.style(bodyMediumRegular, 'text-stone mt-1 text-center mb-8')}>
        Paste a YouTube or Instagram recipe link and our AI will extract the recipe for you.
        Build your personal cookbook!
      </Text>
      <Pressable
        onPress={onAddRecipe}
        style={tw`bg-green-600 px-8 py-4 rounded-full flex-row items-center`}
      >
        <Feather name="plus" size={20} color="#fff" />
        <Text style={tw.style(bodyMediumBold, 'text-white ml-2')}>
          Add Your First Recipe
        </Text>
      </Pressable>
    </View>
  );
}

export default function CookbookScreen() {
  const { width } = useWindowDimensions();
  const navigation = useNavigation<NativeStackNavigationProp<CookbookStackParamList>>();
  const { data: recipes, isLoading, isError, refetch, isFetching } = useGetUserRecipesQuery(
    undefined,
    { refetchOnMountOrArgChange: true },
  );

  const sortedRecipes = useMemo(() => {
    if (!recipes) return [];
    return [...recipes].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [recipes]);

  const navigateToAddRecipe = useCallback(() => {
    navigation.navigate('AddRecipe');
  }, [navigation]);

  const navigateToRecipeDetail = useCallback(
    (recipeId: string) => {
      navigation.navigate('CookbookRecipeDetail', { id: recipeId });
    },
    [navigation],
  );

  const numColumns = 1;
  const cardWidth = width - 40;

  const renderItem = useCallback(
    ({ item }: { item: UserRecipe }) => (
      <View style={{ width: cardWidth }}>
        <RecipeCard
          recipe={item}
          cardWidth={cardWidth}
          onPress={() => navigateToRecipeDetail(item._id)}
        />
      </View>
    ),
    [cardWidth, numColumns, navigateToRecipeDetail],
  );

  const keyExtractor = useCallback((item: UserRecipe) => item._id, []);

  return (
    <SafeAreaView style={tw`flex-1 bg-white`} edges={['top']}>
      <FocusAwareStatusBar statusBarStyle="dark" />

      {isLoading ? (
        <View style={tw`flex-1 items-center justify-center`}>
          <ActivityIndicator size="large" color={tw.color('green-600') || '#16A34A'} />
        </View>
      ) : (
        <>
        {/* Header */}
        <View style={tw`flex-row items-center justify-between px-5 pt-3 pb-2`}>
          <View>
            <Text style={tw.style(h6TextStyle, 'text-gray-900')}>My CookBook</Text>
            <Text style={tw.style(bodyMediumRegular, 'text-green-600 text-xs mt-0.5')}>
              {sortedRecipes.length} {sortedRecipes.length === 1 ? 'recipe' : 'recipes'}
            </Text>
          </View>
          <Pressable
            onPress={navigateToAddRecipe}
            style={tw`w-10 h-10 rounded-full bg-green-600 items-center justify-center`}
          >
            <Feather name="plus" size={20} color="#fff" />
          </Pressable>
        </View>

        <ImageBackground
          style={tw`flex-1`}
          source={require('../../../../assets/ribbons/lemon.png')}
        >
          <View style={tw`px-5 pt-4 pb-2 flex-row gap-2`}>
            <Pressable
              onPress={navigateToAddRecipe}
              style={tw`flex-1 flex-row items-center justify-center gap-1.5 rounded-full border border-eggplant bg-white px-3 py-2`}
            >
              <Feather name="plus" size={14} color={tw.color('eggplant-vibrant') || '#7E42FF'} />
              <Text style={tw.style(subheadMediumUppercase, 'text-eggplant-vibrant')}>
                Add Recipe
              </Text>
            </Pressable>
            <Pressable
              onPress={refetch}
              style={tw`flex-1 flex-row items-center justify-center gap-1.5 rounded-full border border-eggplant bg-white px-3 py-2`}
            >
              <Feather name="refresh-cw" size={14} color={tw.color('eggplant-vibrant') || '#7E42FF'} />
              <Text style={tw.style(subheadMediumUppercase, 'text-eggplant-vibrant')}>
                Refresh
              </Text>
            </Pressable>
          </View>

          {sortedRecipes.length === 0 && !isError ? (
            <EmptyState onAddRecipe={navigateToAddRecipe} />
          ) : isError ? (
            <View style={tw`flex-1 items-center justify-center px-8`}>
            <Feather name="wifi-off" size={48} color={tw.color('stone')} />
            <Text style={tw.style(bodyMediumBold, 'text-black mt-4 text-center')}>
              Couldn't load recipes
            </Text>
            <Text style={tw.style(bodyMediumRegular, 'text-stone mt-1 text-center')}>
              Pull down to retry or check your connection.
            </Text>
            <Pressable
              onPress={refetch}
              style={tw`mt-6 bg-green-600 px-6 py-3 rounded-full`}
            >
              <Text style={tw.style(bodyMediumBold, 'text-white')}>Retry</Text>
            </Pressable>
          </View>
          ) : (
            <FlatList
              key={numColumns}
              data={sortedRecipes}
              renderItem={renderItem}
              keyExtractor={keyExtractor}
              numColumns={numColumns}
              contentContainerStyle={tw.style('px-5 pt-1 pb-24 items-center')}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={isFetching && !isLoading}
                  onRefresh={refetch}
                  tintColor={tw.color('green-600') || '#16A34A'}
                />
              }
            />
          )}
        </ImageBackground>
        </>
      )}
    </SafeAreaView>
  );
}
