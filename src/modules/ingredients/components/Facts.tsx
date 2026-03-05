import formatMonths from '../../../common/helpers/formatMonths';
import tw from '../../../common/tailwind';
import { IIngredient } from '../../../models/craft';
import FoodFactPanel from './FoodFactPanel';
import React from 'react';
import { Dimensions, Text, View } from 'react-native';
import RenderHTML from 'react-native-render-html';
import { bodyLargeBold, bodyLargeRegular, tagStyles } from '../../../theme/typography';

export default function Facts({
  nutrition,
  inSeason,
  sponsorPanel,
  description,
  foodFactId,
  id,
  uid,
}: IIngredient & { foodFactId?: string }) {
  const source = {
    html: nutrition || '',
  };

  return (
    <View style={tw`relative w-full px-5 pb-6`}>
      <View style={tw`gap-6.5 z-10`}>
        {/* Food Fact panel from backend (matches existing UI) */}
        <FoodFactPanel ingredientId={uid || id} foodFactId={foodFactId} />

        {description && (
          <View>
            <Text style={tw.style(bodyLargeBold)}>About this ingredient:</Text>
            <RenderHTML
              source={{
                html: description || '',
              }}
              contentWidth={225}
              tagsStyles={tagStyles}
              defaultViewProps={{
                style: tw`m-0 p-0`,
              }}
              defaultTextProps={{
                style: tw.style(bodyLargeRegular, 'mt-2 text-midgray'),
              }}
            />
          </View>
        )}

        {nutrition && (
          <View>
            <Text style={tw.style(bodyLargeBold)}>Nutrition:</Text>
            <RenderHTML
              source={source}
              contentWidth={Dimensions.get('window').width - 40}
              tagsStyles={tagStyles}
              defaultViewProps={{
                style: tw`m-0 p-0`,
              }}
              defaultTextProps={{
                style: tw.style(bodyLargeRegular, 'mt-2 text-midgray'),
              }}
            />
          </View>
        )}

        {inSeason && inSeason.length > 0 && (
          <View>
            <Text style={tw.style(bodyLargeBold)}>In season:</Text>
            <Text style={tw.style(bodyLargeRegular, 'mt-2 text-midgray')}>
              {formatMonths(inSeason)}
            </Text>
          </View>
        )}
      </View>
      {/* <ImageBackground
        style={tw`absolute bottom-0 bottom-[-220px] left-0 right-0 h-full items-center`}
        source={heroImageBGSrc}
        imageStyle={{
          resizeMode: 'contain',
        }}
      /> */}
    </View>
  );
}
