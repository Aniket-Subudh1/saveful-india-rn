import React, { useCallback, useEffect, useMemo, useRef, useState, Fragment } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Image,
  ImageBackground,
  ImageRequireSource,
  ActivityIndicator,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import * as Progress from 'react-native-progress';
import RenderHTML, {
  HTMLContentModel,
  HTMLElementModel,
} from 'react-native-render-html';
import tw from '../../../common/tailwind';
import FocusAwareStatusBar from '../../../common/components/FocusAwareStatusBar';
import SecondaryButton from '../../../common/components/ThemeButtons/SecondaryButton';
import { useGetUserRecipeByIdQuery } from '../api/cookbookApi';
import { ingredientApiService } from '../../ingredients/api/ingredientApiService';
import { userRecipeToFramework } from '../adapters/userRecipeAdapter';
import { IFramework, IFrameworkComponentStep } from '../../../models/craft';
import { CookbookStackParamList } from '../navigation/CookbookNavigation';
import RelevantIngredients from '../../make/components/RelevantIngredients';
import { subheadLargeUppercase } from '../../../theme/typography';

// ── Step data model identical to MakeItScreen ──
interface CookbookMakeItStep extends IFrameworkComponentStep {
  title: string;
  ingredients: { id: string; title: string; quantity: string; preparation?: string; ingredientId?: string }[];
}

// ── Progress-bar navigation (same as MakeItNavigation) ──
function StepProgressBars({
  items,
  currentIndex,
  slideIndex,
  screenWidth,
}: {
  items: { id: string }[];
  currentIndex: number;
  slideIndex: number;
  screenWidth: number;
}) {
  return (
    <View style={tw`mb-7 mt-4 w-full flex-row gap-1 self-center px-5`}>
      {items.map((item, index) => {
        const isCurrentOrPast = currentIndex >= index;
        return (
          <Fragment key={item.id.toString()}>
            <Progress.Bar
              progress={index === 0 ? 1 : isCurrentOrPast ? slideIndex / index : 0}
              color={'#96F0B6'}
              indeterminateAnimationDuration={100}
              unfilledColor={'rgba(255, 252, 249, 0.2)'}
              animated
              borderWidth={0}
              height={4}
              useNativeDriver={true}
              borderRadius={9999}
              animationConfig={{ bounciness: 0 }}
              animationType={'spring'}
              width={
                (screenWidth - 40 - (items.length - 1) * 4) / items.length
              }
            />
          </Fragment>
        );
      })}
    </View>
  );
}

// ── Single step carousel card (matches MakeItCarouselItem) ──
function StepCarouselItem({
  item,
  index,
  noOfItems,
  onCompleteCook,
  scrollToItem,
  screenWidth,
  screenHeight,
}: {
  item: CookbookMakeItStep;
  index: number;
  noOfItems: number;
  onCompleteCook: () => void;
  scrollToItem: (index: number) => void;
  screenWidth: number;
  screenHeight: number;
}) {
  const contentWidth = useMemo(() => screenWidth - 40, [screenWidth]);

  const tagsStyles = useMemo(
    () => ({
      body: tw.style('text-white font-sans-semibold text-3.5xl leading-tightest'),
      p: tw.style('text-white font-sans-semibold text-3.5xl leading-tightest mb-4'),
      div: tw.style('text-white font-sans-semibold text-3.5xl leading-tightest'),
      span: tw.style('text-white font-sans-semibold'),
      strong: tw.style('text-lemon font-sans-bold text-3.5xl leading-tightest'),
      b: tw.style('text-lemon font-sans-bold text-3.5xl leading-tightest'),
    }),
    [],
  );

  const defaultViewProps = useMemo(() => ({ style: tw`m-0 p-0` }), []);
  const defaultTextProps = useMemo(
    () => ({
      style: tw.style('text-white font-sans-semibold text-3.5xl leading-tightest mb-4'),
      maxFontSizeMultiplier: 1 as const,
    }),
    [],
  );

  const customHTMLElementModels = useMemo(
    () => ({
      strong: HTMLElementModel.fromCustomModel({
        tagName: 'strong',
        mixedUAStyles: tw.style('text-lemon font-sans-bold'),
        contentModel: HTMLContentModel.textual,
      }),
    }),
    [],
  );

  // Ensure HTML wrapping
  const htmlSource = useMemo(() => {
    const raw = item.stepInstructions || '';
    const html = raw.trim().startsWith('<') ? raw : `<p>${raw}</p>`;
    return { html };
  }, [item.stepInstructions]);

  const reservedBottomSpace = Math.max(180, Math.round(screenHeight * 0.24));

  return (
    <View style={tw`relative w-[${screenWidth}px] h-full px-5`} key={item.id}>
      <ScrollView
        style={{ maxHeight: screenHeight - reservedBottomSpace }}
        contentContainerStyle={tw`pb-12`}
        showsVerticalScrollIndicator
        nestedScrollEnabled
      >
        <RenderHTML
          source={htmlSource}
          contentWidth={contentWidth}
          tagsStyles={tagsStyles}
          defaultViewProps={defaultViewProps}
          defaultTextProps={defaultTextProps}
          customHTMLElementModels={customHTMLElementModels}
        />
      </ScrollView>

      {/* Complete the cook on last step */}
      {index === noOfItems - 1 && (
        <View style={tw`mb-6`}>
          <SecondaryButton iconLeft="check" onPress={onCompleteCook}>
            Complete the cook
          </SecondaryButton>
        </View>
      )}

      {/* Invisible left/right hit areas for swiping */}
      {index > 0 && (
        <Pressable
          style={tw.style(
            'absolute left-0 top-0 w-10',
            index < noOfItems - 1 ? 'bottom-20' : 'bottom-0',
          )}
          onPress={() => scrollToItem(index - 1)}
        />
      )}
      {index < noOfItems - 1 && (
        <Pressable
          style={tw.style(
            'absolute right-0 top-0 w-10',
            index < noOfItems - 1 ? 'bottom-20' : 'bottom-0',
          )}
          onPress={() => scrollToItem(index + 1)}
        />
      )}
    </View>
  );
}

// ── Main screen ──
export default function CookbookMakeItScreen() {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const route = useRoute<RouteProp<CookbookStackParamList, 'CookbookMakeIt'>>();
  const navigation = useNavigation();
  const { id, variant, ingredients: passedIngredients } = route.params;

  const {
    data: recipe,
    isLoading,
    isFetching,
    isError,
  } = useGetUserRecipeByIdQuery(id);
  const [framework, setFramework] = useState<IFramework | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [slideIndex, setSlideIndex] = useState(0);
  const [isIngredientsActive, setIsIngredientsActive] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // Convert recipe → framework → fill ingredient names
  useEffect(() => {
    if (!recipe) {
      setFramework(null);
      return;
    }

    let fw: IFramework;
    try {
      fw = userRecipeToFramework(recipe);
    } catch {
      setFramework(null);
      return;
    }

    const isOid = (v: string) => /^[0-9a-fA-F]{24}$/.test(v);
    const missingIds: string[] = [];
    fw.components.forEach((comp) => {
      comp.requiredIngredients.forEach((ri) => {
        ri.recommendedIngredient.forEach((ing) => {
          if (!ing.title && isOid(ing.id)) missingIds.push(ing.id);
        });
        ri.alternativeIngredients.forEach((ai) =>
          ai.ingredient.forEach((ing) => {
            if (!ing.title && isOid(ing.id)) missingIds.push(ing.id);
          }),
        );
      });
      comp.optionalIngredients.forEach((oi) =>
        oi.ingredient.forEach((ing) => {
          if (!ing.title && isOid(ing.id)) missingIds.push(ing.id);
        }),
      );
    });

    if (missingIds.length > 0) {
      ingredientApiService
        .getIngredientsByIds(missingIds)
        .then((map) => {
          fw.components.forEach((comp) => {
            comp.requiredIngredients.forEach((ri) => {
              ri.recommendedIngredient.forEach((ing) => {
                const apiIng = map[ing.id];
                if (apiIng) ing.title = apiIng.name;
              });
              ri.alternativeIngredients.forEach((ai) =>
                ai.ingredient.forEach((ing) => {
                  const apiIng = map[ing.id];
                  if (apiIng) ing.title = apiIng.name;
                }),
              );
            });
            comp.optionalIngredients.forEach((oi) =>
              oi.ingredient.forEach((ing) => {
                const apiIng = map[ing.id];
                if (apiIng) ing.title = apiIng.name;
              }),
            );
          });
          setFramework({ ...fw });
        })
        .catch(() => setFramework(fw));
    } else {
      setFramework(fw);
    }
  }, [recipe]);

  // Build step list (same logic as MakeItScreen)
  const makeItSteps: CookbookMakeItStep[] = useMemo(() => {
    if (!framework) return [];

    const variantId = variant || framework.variantTags[0]?.id || '';

    const steps: CookbookMakeItStep[] = framework.components
      .filter((comp) =>
        comp.includedInVariants?.some((v) => v.id === variantId) ?? true,
      )
      .flatMap((comp) =>
        comp.componentSteps.map((step) => ({
          ...step,
          title: comp.componentTitle,
          ingredients: passedIngredients.filter((ing) => ing.id === comp.id),
        })),
      )
      .filter((step) => step.stepInstructions.trim().length > 0);

    // Final "Let's eat" step
    steps.push({
      id: 'lets-eat',
      title: "Let's eat",
      stepInstructions: `<p>That's it! Time to eat!</p>`,
      hackOrTip: [],
      relevantIngredients: [],
      alwaysShow: true,
      ingredients: [],
    });

    return steps;
  }, [framework, variant, passedIngredients]);

  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offset = event.nativeEvent.contentOffset.x;
      const idx = offset / screenWidth;
      setSlideIndex(idx);
      setCurrentIndex(Math.round(idx));
    },
    [screenWidth],
  );

  const scrollToItem = useCallback(
    (index: number) => {
      flatListRef.current?.scrollToIndex({ index, animated: true });
    },
    [],
  );

  // Auto-collapse ingredients on swipe
  useEffect(() => {
    setIsIngredientsActive(false);
  }, [currentIndex]);

  // ── Cook animation sprite keyed to step index (same as MakeItScreen) ──
  let iconSource: ImageRequireSource;
  switch (currentIndex % 5) {
    case 0: iconSource = require('../../../../assets/animations/cook-01.png'); break;
    case 1: iconSource = require('../../../../assets/animations/cook-02.png'); break;
    case 2: iconSource = require('../../../../assets/animations/cook-03.png'); break;
    case 3: iconSource = require('../../../../assets/animations/cook-04.png'); break;
    default: iconSource = require('../../../../assets/animations/cook-05.png'); break;
  }

  // ── Loading state ──
  if (isLoading || isFetching) {
    return (
      <View style={tw`flex-1 bg-kale items-center justify-center`}>
        <ActivityIndicator size="large" color="#fff" />
        <Text style={tw`text-sm font-sans text-white/70 mt-3`}>
          Preparing your recipe...
        </Text>
      </View>
    );
  }

  if (isError || !recipe) {
    return (
      <View style={tw`flex-1 bg-kale items-center justify-center px-8`}>
        <Feather name="alert-circle" size={48} color="rgba(255,255,255,0.7)" />
        <Text style={tw`text-base font-sans-bold text-white text-center mt-4`}>
          Recipe not found
        </Text>
        <Pressable onPress={() => navigation.goBack()} style={tw`mt-4`}>
          <Text style={tw`text-sm font-sans-semibold text-mint`}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  if (!framework) {
    return (
      <View style={tw`flex-1 bg-kale items-center justify-center px-8`}>
        <Feather name="alert-circle" size={48} color="rgba(255,255,255,0.7)" />
        <Text style={tw`text-base font-sans-bold text-white text-center mt-4`}>
          Could not prepare this recipe
        </Text>
        <Pressable onPress={() => navigation.goBack()} style={tw`mt-4`}>
          <Text style={tw`text-sm font-sans-semibold text-mint`}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  if (makeItSteps.length === 0) {
    return (
      <View style={tw`flex-1 bg-kale items-center justify-center px-8`}>
        <Feather name="alert-circle" size={48} color="rgba(255,255,255,0.7)" />
        <Text style={tw`text-base font-sans-bold text-white text-center mt-4`}>
          No cooking steps found
        </Text>
        <Pressable onPress={() => navigation.goBack()} style={tw`mt-4`}>
          <Text style={tw`text-sm font-sans-semibold text-mint`}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={tw`flex-1 bg-kale`}>
      <ImageBackground
        source={require('../../../../assets/ribbons/makeit.png')}
        style={tw`relative mt-5 flex-1`}
      >
        {/* ── Header (matches MakeItHeader) ── */}
        <View style={tw`absolute left-0 right-0 z-10`}>
          <SafeAreaView
            style={tw`absolute left-0 right-0 z-20 flex-row items-end justify-between gap-3 px-5 pt-5 pb-6.5`}
          >
            <View style={tw`h-5 w-5`} />
            {makeItSteps[currentIndex]?.title && (
              <Text
                style={tw.style(subheadLargeUppercase, 'flex-1 text-center leading-5 text-white')}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {makeItSteps[currentIndex].title}
              </Text>
            )}
            <Pressable
              style={tw`flex h-5 w-5 flex-shrink-0 items-center justify-center`}
              onPress={() => navigation.goBack()}
              accessibilityRole="button"
            >
              <Feather name="x" color={tw.color('white')} size={20} />
            </Pressable>
          </SafeAreaView>
        </View>

        {/* ── Cook animation sprite (bottom, semi-transparent) ── */}
        <Image
          style={[
            tw`absolute bottom-0 left-0 w-[${screenWidth}px] h-[${
              (screenWidth * 288) / 636
            }px] opacity-50`,
          ]}
          resizeMode="contain"
          source={iconSource}
          accessibilityIgnoresInvertColors
        />

        {/* ── Content ── */}
        <View style={tw`relative flex-1`}>
          <SafeAreaView edges={['top']}>
            <View style={tw`h-full items-center justify-start py-11`}>
              {/* Progress bars */}
              <StepProgressBars
                items={makeItSteps}
                currentIndex={currentIndex}
                slideIndex={slideIndex}
                screenWidth={screenWidth}
              />

              {/* Step carousel */}
              <FlatList
                ref={flatListRef}
                data={makeItSteps}
                keyExtractor={(item) => item.id}
                renderItem={({ item, index }) => (
                  <StepCarouselItem
                    item={item}
                    index={index}
                    noOfItems={makeItSteps.length}
                    onCompleteCook={() => navigation.goBack()}
                    scrollToItem={scrollToItem}
                    screenWidth={screenWidth}
                    screenHeight={screenHeight}
                  />
                )}
                horizontal
                showsHorizontalScrollIndicator={false}
                showsVerticalScrollIndicator={false}
                bounces={false}
                decelerationRate={0}
                renderToHardwareTextureAndroid
                snapToInterval={screenWidth}
                snapToAlignment="start"
                onScroll={onScroll}
                scrollEventThrottle={16}
              />
            </View>
          </SafeAreaView>
        </View>
      </ImageBackground>

      {/* ── Relevant ingredients panel (same component as Make) ── */}
      {makeItSteps[currentIndex]?.ingredients &&
        makeItSteps[currentIndex].ingredients.length > 0 &&
        currentIndex < makeItSteps.length - 1 && (
          <RelevantIngredients
            ingredients={makeItSteps[currentIndex].ingredients}
            setIsIngredientsActive={setIsIngredientsActive}
            isIngredientsActive={isIngredientsActive}
          />
        )}

      <FocusAwareStatusBar statusBarStyle="light" />
    </View>
  );
}
