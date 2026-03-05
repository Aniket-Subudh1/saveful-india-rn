import React, { useEffect, useState } from 'react';
import { Image, Text, View } from 'react-native';
import tw from '../../../common/tailwind';
import { bundledSource } from '../../../common/helpers/uriHelpers';
import useEnvironment from '../../environment/hooks/useEnvironment';
import { cardDrop } from '../../../theme/shadow';
import { bodyMediumRegular, bodySmallBold, bodySmallRegular, subheadMediumUppercase, labelLarge } from '../../../theme/typography';
import { foodFactApiService, FoodFactApiModel } from '../../foodFact/api/foodFactApiService';
import { hackApiService, Sponsor as ApiSponsor } from '../../hack/api/hackApiService';

interface FoodFactPanelProps {
  ingredientId: string;
  foodFactId?: string;
}

export default function FoodFactPanel({ ingredientId, foodFactId }: FoodFactPanelProps) {
  const env = useEnvironment();
  const [foodFact, setFoodFact] = useState<FoodFactApiModel | null>(null);
  const [sponsor, setSponsor] = useState<ApiSponsor | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        let ff: FoodFactApiModel | null = null;
        // If foodFactId is provided, fetch directly by ID
        if (foodFactId) {
          ff = await foodFactApiService.getFoodFactById(foodFactId);
        }
        // Fallback: search by relatedIngredient
        if (!ff && ingredientId) {
          ff = await foodFactApiService.getFoodFactForIngredient(ingredientId);
        }
        setFoodFact(ff);
        const sponsorId = typeof ff?.sponsor === 'object' ? ff?.sponsor?._id : ff?.sponsor;
        if (sponsorId) {
          const sp = await hackApiService.getSponsorById(sponsorId);
          setSponsor(sp);
        } else {
          setSponsor(null);
        }
      } catch (e) {
        console.warn('FoodFactPanel: failed to load', e);
        setFoodFact(null);
        setSponsor(null);
      }
    };
    if (ingredientId || foodFactId) load();
  }, [ingredientId, foodFactId]);

  if (!foodFact) return null;

  return (
    <View style={[tw`gap-4 rounded border border-strokecream bg-white p-4`, cardDrop]}>
      <View>
        <Text style={tw.style(subheadMediumUppercase, 'text-midgray')}>
          {foodFact.title || 'Farm fact'}
        </Text>
        {!!foodFact.factOrInsight && (
          <Text style={tw.style(bodyMediumRegular, 'mt-1')}>
            {foodFact.factOrInsight}
          </Text>
        )}
      </View>

      {sponsor && (
        <View style={tw`flex-row gap-4 border-t border-strokecream pt-4`}>
          <View style={tw`shrink`}>
            {!!sponsor.broughtToYouBy && (
              <Text style={tw.style(bodySmallBold, 'text-stone')}>
                {sponsor.broughtToYouBy}
              </Text>
            )}
            {!!sponsor.tagline && (
              <Text style={tw.style(bodySmallRegular, 'text-stone')}>
                {sponsor.tagline}
              </Text>
            )}
          </View>
          <View style={tw`shrink-0`}>
            {!!(sponsor.logo || sponsor.logoBlackAndWhite) && (
              <Image
                style={[tw`h-[35px] w-[96px]`]}
                resizeMode="contain"
                source={bundledSource(
                  sponsor.logo ? sponsor.logo : sponsor.logoBlackAndWhite || '',
                  env.useBundledContent,
                )}
                accessibilityIgnoresInvertColors
              />
            )}
          </View>
        </View>
      )}
    </View>
  );
}
