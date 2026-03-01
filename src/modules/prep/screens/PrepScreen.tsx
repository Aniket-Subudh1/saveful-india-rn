import AsyncStorage from '@react-native-async-storage/async-storage';
import { IFramework } from '../../../models/craft';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import AnimatedHeader from '../../../common/components/AnimatedHeader';
import DebouncedPressable from '../../../common/components/DebouncePressable';
import FocusAwareStatusBar from '../../../common/components/FocusAwareStatusBar';
import SkeletonLoader from '../../../common/components/SkeletonLoader';
import { bundledSource } from '../../../common/helpers/uriHelpers';
import useArrayState from '../../../common/hooks/useArrayState';
import tw from '../../../common/tailwind';
import { mixpanelEventName } from '../../../modules/analytics/analytics';
import useAnalytics from '../../../modules/analytics/hooks/useAnalytics';
import useEnvironment from '../../../modules/environment/hooks/useEnvironment';
import {
  MakeStackParamList,
  MakeStackScreenProps,
} from '../../../modules/make/navigation/MakeNavigation';
import { InitialStackParamList } from '../../navigation/navigator/InitialNavigator';
import PrepCarousel from '../../../modules/prep/components/PrepCarousel';
import PrepComponent from '../../../modules/prep/components/PrepComponent';
import PrepFavorite from '../../../modules/prep/components/PrepFavorite';
import PrepFlavor from '../../../modules/prep/components/PrepFlavor';
import PrepInfoSticker from '../../../modules/prep/components/PrepInfoSticker';
import PrepIt from '../../../modules/prep/components/PrepIt';
import PrepVideo from '../../../modules/prep/components/PrepVideo';
import PrepShareQRModal from '../../../modules/prep/components/PrepShareQRModal';
import TutorialModal from '../../../modules/prep/components/TutorialModal';
import { PREPTUTORIAL } from '../../../modules/prep/data/data';
import { useCurentRoute } from '../../../modules/route/context/CurrentRouteContext';
//import { useCreateUserMealMutation } from 'modules/track/api/api';
import PrepServingSelector, { parseServingsFromPortions } from '../components/PrepServingSelector';
import { recipeApiService } from '../../recipe/api/recipeApiService';
import { recipeToFramework } from '../../recipe/adapters/recipeAdapter';
import { ingredientApiService } from '../../ingredients/api/ingredientApiService';
import { transformIngredientToLegacyFormat } from '../../ingredients/helpers/ingredientTransformers';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Text,
  View,
} from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { h2TextStyle, subheadMediumUppercase } from '../../../theme/typography';


// DEMO: Replace this with your actual mutation hook when ready
type CreateUserMealPayload = {
  frameworkId: string;
  variantId: string;
  completed: boolean;
  saved: boolean;
};

type CreateUserMealHook = () => [
  (payload: CreateUserMealPayload) => Promise<{ id: string }>,
  { isLoading: boolean }
];

const useCreateUserMealMutation: CreateUserMealHook = () => {
  const createUserMeal = async (payload: CreateUserMealPayload) => {
    return new Promise<{ id: string }>((resolve) => {
      setTimeout(() => {
        resolve({ id: `demo-meal-${Date.now()}` });
      }, 500);
    });
  };

  return [createUserMeal, { isLoading: false }];
};




const StorageKey = 'PrepTutorial';

const windowWidth = Dimensions.get('window').width;
const itemLength = windowWidth - 60;

export default function PrepScreen({
  // navigation,
  route: {
    params: { slug },
  },
}: MakeStackScreenProps<'PrepDetail'>) {
  const navigation =
    useNavigation<
      NativeStackNavigationProp<InitialStackParamList & MakeStackParamList>
    >();
  const offset = useRef(new Animated.Value(0)).current;

  const { sendAnalyticsEvent, sendScrollEventInitiation } = useAnalytics();
  const { newCurrentRoute } = useCurentRoute();
  const env = useEnvironment();

  const skeletonStyles = [
    `h-10 w-[${itemLength}px] mt-3 mb-1 items-center`,
    `h-10 w-[${itemLength}px] mb-3 items-center`,
    `h-6 rounded-full w-[${itemLength - 100}px] mb-10 items-center`,
    `mb-3 h-[311px] w-[${itemLength}px] overflow-hidden rounded-2lg`,
    `mb-3 h-[311px] w-[${itemLength}px] overflow-hidden rounded-2lg`,
  ];

  const [framework, setFramework] = React.useState<IFramework>();
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [isFirstPrepSession, setIsFirstPrepSession] =
    React.useState<boolean>(false);
  const [isShareModalVisible, setIsShareModalVisible] = React.useState<boolean>(false);

  const [selectedFlavor, setSelectedFlavor] = useState<string>('');
  const selectFlavor = (item: string) => {
    setSelectedFlavor(item);
  };

  // --- Serving Scale State ---
  const [isScaling, setIsScaling] = useState(false);
  const [isScaled, setIsScaled] = useState(false);
  const [scaledQuantities, setScaledQuantities] = useState<Record<string, string>>({});
  const [desiredServings, setDesiredServings] = useState<number | null>(null);
  const [cookingNotes, setCookingNotes] = useState<string | undefined>(undefined);

  const [allRequiredIngredients, setAllRequiredIngredients] = useArrayState<
    {
      id: string;
      title: string;
      quantity: string;
      preparation?: string;
      ingredientId: string;
    }[]
  >();
  const [allOptionalIngredients, setAllOptionalIngredients] = useArrayState<
    {
      id: string;
      title: string;
      quantity: string;
      preparation?: string;
      ingredientId: string;
    }[]
  >();

  const setDefaultRequiredIngredients = () => {
    if (!framework) return;

    const data = framework;

    // set default required ingredients
    setAllRequiredIngredients.set(
      data.components
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
  };

  const getFrameworksData = async () => {
    try {
      const recipe = await recipeApiService.getRecipeBySlug(slug);
      
      if (recipe) {
        const convertedFramework = recipeToFramework(recipe);

        // The adapter now extracts populated ingredient data directly from
        // the backend response. Only fetch ingredients individually for any
        // that are still missing a title (i.e. were not populated).
        const missingIds: string[] = [];
        convertedFramework.components.forEach(comp => {
          comp.requiredIngredients.forEach(ri => {
            ri.recommendedIngredient.forEach(ing => { if (!ing.title) missingIds.push(ing.id); });
            ri.alternativeIngredients.forEach(ai => ai.ingredient.forEach(ing => { if (!ing.title) missingIds.push(ing.id); }));
          });
          comp.optionalIngredients.forEach(oi => oi.ingredient.forEach(ing => { if (!ing.title) missingIds.push(ing.id); }));
          comp.componentSteps.forEach(step => step.relevantIngredients.forEach(ing => { if (!ing.title) missingIds.push(ing.id); }));
        });

        // Only fetch if there are genuinely missing ingredient names
        if (missingIds.length > 0) {
          const ingredientMap = await ingredientApiService.getIngredientsByIds(missingIds);
          convertedFramework.components.forEach(comp => {
            comp.requiredIngredients.forEach(ri => {
              ri.recommendedIngredient.forEach(ing => {
                const apiIng = ingredientMap[ing.id];
                if (apiIng) {
                  const legacy = transformIngredientToLegacyFormat(apiIng);
                  ing.title = legacy.title;
                  ing.averageWeight = legacy.averageWeight;
                }
              });
              ri.alternativeIngredients.forEach(ai => ai.ingredient.forEach(ing => {
                const apiIng = ingredientMap[ing.id];
                if (apiIng) {
                  const legacy = transformIngredientToLegacyFormat(apiIng);
                  ing.title = legacy.title;
                  ing.averageWeight = legacy.averageWeight;
                }
              }));
            });
            comp.optionalIngredients.forEach(oi => oi.ingredient.forEach(ing => {
              const apiIng = ingredientMap[ing.id];
              if (apiIng) {
                const legacy = transformIngredientToLegacyFormat(apiIng);
                ing.title = legacy.title;
                ing.averageWeight = legacy.averageWeight;
              }
            }));
            comp.componentSteps.forEach(step => step.relevantIngredients.forEach(ing => {
              const apiIng = ingredientMap[ing.id];
              if (apiIng) {
                const legacy = transformIngredientToLegacyFormat(apiIng);
                ing.title = legacy.title;
              }
            }));
          });
        }

        setFramework(convertedFramework);
        setSelectedFlavor(convertedFramework.variantTags[0]?.id || '');
        setIsLoading(false);
        setDefaultRequiredIngredients();
        return;
      }

      setIsLoading(false);
      navigation.navigate('FrameworkNotFound');
      return;
    } catch (error) {
      console.error('Error fetching from recipe API:', error);
      setIsLoading(false);
      navigation.navigate('FrameworkNotFound');
    }
  };

  useEffect(() => {
    if (selectedFlavor) {
      setDefaultRequiredIngredients();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFlavor]);

  useEffect(() => {
    const checkIsFirstPrepTutorial = async () => {
      const isFirstPrepTutorial = await AsyncStorage.getItem(StorageKey);

      if (!isFirstPrepTutorial) {
        setIsFirstPrepSession(true);
      }
    };

    checkIsFirstPrepTutorial();
  }, []);

  useEffect(() => {
    getFrameworksData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  // Collect all unique ingredients with quantities for serving scale API
  const allIngredientsForScaling = useMemo(() => {
    if (!framework) return [];
    const seen = new Set<string>();
    const result: { id: string; title: string; quantity?: string; preparation?: string }[] = [];

    framework.components
      .filter(comp =>
        comp.includedInVariants?.some(v => v.id === selectedFlavor),
      )
      .forEach(comp => {
        comp.requiredIngredients.forEach(ri => {
          ri.recommendedIngredient.forEach(ing => {
            if (!seen.has(ing.id)) {
              seen.add(ing.id);
              result.push({ id: ing.id, title: ing.title, quantity: ri.quantity, preparation: ri.preparation });
            }
          });
          ri.alternativeIngredients.forEach(ai => {
            ai.ingredient.forEach(ing => {
              if (!seen.has(ing.id)) {
                seen.add(ing.id);
                result.push({ id: ing.id, title: ing.title, quantity: ai.quantity, preparation: ai.preparation });
              }
            });
          });
        });
        comp.optionalIngredients.forEach(oi => {
          oi.ingredient.forEach(ing => {
            if (!seen.has(ing.id)) {
              seen.add(ing.id);
              result.push({ id: ing.id, title: ing.title, quantity: oi.quantity, preparation: oi.preparation });
            }
          });
        });
      });

    return result;
  }, [framework, selectedFlavor]);

  // Handler: user pressed OK on the serving selector
  const handleConfirmServings = useCallback(
    async (servings: number) => {
      if (!framework || allIngredientsForScaling.length === 0) return;

      setIsScaling(true);
      setIsScaled(false);
      setCookingNotes(undefined);

      try {
        const originalServings = parseServingsFromPortions(framework.portions);
        const response = await recipeApiService.scaleServings({
          originalServings,
          desiredServings: servings,
          recipeTitle: framework.title,
          ingredients: allIngredientsForScaling.map(ing => ({
            ingredientName: ing.title,
            originalQuantity: ing.quantity ?? '',
            preparation: ing.preparation,
            ingredientId: ing.id,
          })),
        });

        const newScaled: Record<string, string> = {};
        response.scaledIngredients.forEach((si) => {
          if (si.ingredientId) {
            newScaled[si.ingredientId] = si.scaledQuantity;
          }
          // Also store by name for fallback lookups
          if (si.ingredientName) {
            newScaled[`name:${si.ingredientName.toLowerCase()}`] = si.scaledQuantity;
          }
        });

        setScaledQuantities(newScaled);
        setDesiredServings(servings);
        setCookingNotes(response.cookingNotes ?? undefined);
        setIsScaled(true);
      } catch (error) {
        console.error('Serving scale error:', error);
        Alert.alert('Scaling Error', 'Could not adjust servings. The original recipe will be used.');
      } finally {
        setIsScaling(false);
      }
    },
    [framework, allIngredientsForScaling],
  );

  const [createUserMeal, { isLoading: isCreateUserMealLoading }] =
    useCreateUserMealMutation();

  const onMakeIt = useCallback(async () => {
    if (isCreateUserMealLoading || !framework) {
      return;
    }

    try {
      const result = await createUserMeal({
        frameworkId: framework.id,
        variantId: selectedFlavor,
        completed: false,
        saved: true, // Use this for notifications
      });  // use.unwrap() when the mock data is removed

      if (result) {
        sendAnalyticsEvent({
          event: mixpanelEventName.actionClicked,
          properties: {
            location: newCurrentRoute,
            action: mixpanelEventName.makeItPressed,
            title: framework?.title,
            ingredients: [
              ...allRequiredIngredients.flatMap(item => item),
              ...allOptionalIngredients.flatMap(item => item),
            ].map(item => item.title),
            result,
          },
        });

        sendAnalyticsEvent({
          event: mixpanelEventName.actionClicked,
          properties: {
            location: newCurrentRoute,
            action: mixpanelEventName.prepIngredientSelected,
            title: framework?.title,
            ingredients: [
              ...allRequiredIngredients.flatMap(item => item),
              ...allOptionalIngredients.flatMap(item => item),
            ].map(item => item.title),
            result,
          },
        });

        navigation.navigate('MakeIt', {
          id: framework.id,
          variant: selectedFlavor,
          ingredients: [
            ...allRequiredIngredients.flatMap(item => item),
            ...allOptionalIngredients.flatMap(item => item),
          ],
          mealId: result.id,
          // Pass pre-computed scaled quantities so MakeIt doesn't need to call AI again
          ...(isScaled && Object.keys(scaledQuantities).length > 0
            ? {
                scaledQuantities,
                desiredServings: desiredServings ?? undefined,
                cookingNotes,
              }
            : {}),
        });
      }
    } catch (error: unknown) {
      Alert.alert('Create meal error', JSON.stringify(error));
    }
  }, [
    allOptionalIngredients,
    allRequiredIngredients,
    cookingNotes,
    createUserMeal,
    desiredServings,
    framework,
    isCreateUserMealLoading,
    isScaled,
    navigation,
    newCurrentRoute,
    scaledQuantities,
    selectedFlavor,
    sendAnalyticsEvent,
  ]);

  if (!framework || isLoading) {
    return (
      <View style={tw`flex-1 bg-creme`}>
        <AnimatedHeader 
          animatedValue={offset} 
          title={framework?.title}
          rightActionIcon={<Feather name="share-2" size={20} color="black" />}
          onRightAction={() => setIsShareModalVisible(true)}
        />
        <ScrollView>
          <SafeAreaView
            edges={['bottom']}
            style={tw`flex-row flex-wrap justify-center`}
          >
            <SkeletonLoader styles={skeletonStyles} />
          </SafeAreaView>
          <FocusAwareStatusBar statusBarStyle="dark" />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={tw`flex-1 bg-creme`}>
      <AnimatedHeader 
        animatedValue={offset} 
        title={framework.title}
        rightActionIcon={<Feather name="share-2" size={20} color="black" />}
        onRightAction={() => setIsShareModalVisible(true)}
      />

      <ScrollView
        contentContainerStyle={tw`pb-20`}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: offset } } }],
          {
            useNativeDriver: false,
            listener: (event: NativeSyntheticEvent<NativeScrollEvent>) =>
              sendScrollEventInitiation(event, 'Framework Page Interacted'),
          },
        )}
      >
        <SafeAreaView edges={['bottom']}>
          <View style={tw`w-full items-center justify-start px-5`}>
            <View style={tw.style('gap-2 py-3')}>
              {framework.frameworkSponsor &&
                framework.frameworkSponsor.length > 0 && (
                  <View style={tw`flex-row items-center justify-center gap-2`}>
                    <Text
                      style={tw.style(subheadMediumUppercase, `text-center`)}
                    >
                      Presented by
                    </Text>
                    <View style={tw`shrink-0`}>
                      {(framework.frameworkSponsor[0]?.sponsorLogo[0]?.url ||
                        framework.frameworkSponsor[0]
                          ?.sponsorLogoBlackAndWhite[0]?.url) && (
                        <Image
                          style={[tw`h-[35px] w-[96px]`]}
                          resizeMode="contain"
                          source={bundledSource(
                            framework.frameworkSponsor[0]?.sponsorLogo[0]?.url
                              ? framework.frameworkSponsor[0]?.sponsorLogo[0]
                                  ?.url
                              : framework.frameworkSponsor[0]
                                  ?.sponsorLogoBlackAndWhite[0]?.url,
                            env.useBundledContent,
                          )}
                          accessibilityIgnoresInvertColors
                        />
                      )}
                    </View>
                  </View>
                )}
              <Text
                style={tw.style(h2TextStyle, 'text-center')}
                maxFontSizeMultiplier={1}
              >
                {framework.title}
              </Text>
            </View>
          </View>

          <PrepFavorite
            frameworkId={framework.id}
            frameworkName={framework.title}
          />

          <PrepInfoSticker
            portions={framework.portions}
            prepAndCookTime={framework.prepAndCookTime}
            sticker={framework.sticker}
            heroImage={framework.heroImage}
          />

          {/* Dynamic Serving Size Selector — user adjusts portions here before cooking */}
          <PrepServingSelector
            originalPortions={framework.portions}
            onConfirmServings={handleConfirmServings}
            isLoading={isScaling}
            isScaled={isScaled}
            cookingNotes={cookingNotes}
          />

          <PrepCarousel
            shortDescription={framework.shortDescription}
            description={framework.description}
            freezeKeepTime={framework.freezeKeepTime}
            fridgeKeepTime={framework.fridgeKeepTime}
            hackOrTip={framework.hackOrTip}
            frameworkId={framework.id}
            frameworkName={framework.title}
          />

          {framework.youtubeId && <PrepVideo id={framework.youtubeId} />}

          {framework.variantTags.length > 1 && (
            <PrepFlavor
              flavors={framework.variantTags}
              selectedFlavor={selectedFlavor}
              selectFlavor={selectFlavor}
            />
          )}

          <PrepIt
            shortDescription={framework.prepShortDescription}
            description={framework.prepLongDescription}
          />

          {/* Filter the components based on the selectedFlavour id being one of the includedInVariants */}
          {framework.components
            .filter(component => {
              const hasMatch = component.includedInVariants?.some(
                variant => variant.id === selectedFlavor,
              );
              return hasMatch;
            })
            .map((component, index) => {
              return (
                <PrepComponent
                  key={component.id}
                  {...component}
                  index={index}
                  allRequiredIngredients={allRequiredIngredients}
                  setAllRequiredIngredients={setAllRequiredIngredients}
                  setAllOptionalIngredients={setAllOptionalIngredients}
                  scaledQuantities={isScaled ? scaledQuantities : undefined}
                />
              );
            })}
        </SafeAreaView>
      </ScrollView>

      <DebouncedPressable
        style={tw.style(
          'absolute bottom-0 mr-1 flex w-full items-center justify-center rounded-tl-2lg rounded-tr-2lg bg-kale py-3.5',
        )}
        onPress={onMakeIt}
      >
        <Text
          style={tw.style('font-sans-bold text-2xl text-white')}
          maxFontSizeMultiplier={1}
        >
          MAKE IT
        </Text>
      </DebouncedPressable>
      <PrepShareQRModal
        isVisible={isShareModalVisible}
        onClose={() => setIsShareModalVisible(false)}
        recipeSlug={slug}
        recipeTitle={framework.title}
      />
      <TutorialModal
        data={PREPTUTORIAL}
        isFirst={isFirstPrepSession}
        setIsFirst={setIsFirstPrepSession}
        storageKey={StorageKey}
      />
      <FocusAwareStatusBar statusBarStyle="dark" />
    </View>
  );
}
