import tw from '../../../common/tailwind';
import React, { Fragment, SetStateAction, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { cardDrop } from '../../../theme/shadow';
import { subheadMediumUppercase } from '../../../theme/typography';
import ChartContent from './ChartContent';
import { useGetStatsQuery } from '../api/api';
import { useGetCurrentUserQuery } from '../../auth/api';
import { getCurrencySymbol } from '../../../common/utils/currency';

export default function TrackTabChart() {
  const { data: stats } = useGetStatsQuery();
  const { data: user } = useGetCurrentUserQuery();

  const currencySymbol = getCurrencySymbol(user?.country);

  const totalFoodSavedKg = Number(stats?.food_savings_user ?? 0);
  const totalCostSaved = Number(stats?.total_cost_savings ?? 0);
  const totalCo2SavedKg = Number(stats?.total_co2_savings ?? 0);
  const mealsCount = stats?.completed_meals_count ?? 0;

  const description = `by cooking ${mealsCount} saveful meals`;

  const TRACK = [
    {
      name: 'food',
      heading: 'you’ve potentially saved',
      value: `${totalFoodSavedKg.toFixed(2)}kg`,
      description,
      image: require('../../../../assets/track/food1.png'),
    },
    {
      name: 'money',
      heading: 'you’ve potentially saved',
      value: `${currencySymbol}${totalCostSaved.toFixed(2)}`,
      description,
      image: require('../../../../assets/track/money1.png'),
    },
    {
      name: 'co2',
      heading: 'you’ve potentially saved',
      value: `${totalCo2SavedKg.toFixed(2)}kg CO2`,
      description,
      image: require('../../../../assets/track/co2.png'),
    },
  ];

  const [activeTab, setActiveTab] = useState(TRACK?.[0].name);

  const handleTabPress = (tabName: SetStateAction<string>) => {
    setActiveTab(tabName);
  };


  return (
    <View
      style={[
        tw.style(
          `relative items-center rounded-2lg border border-eggplant-vibrant bg-white pb-3 pt-5`,
        ),
        cardDrop,
      ]}
    >
      <View style={tw.style(`flex-row`)}>
        {TRACK.map((content, index) => {
          return (
            <Pressable
              key={index}
              style={tw.style(
                `items-center border border-strokecream px-2.5 py-1 ${
                  index === TRACK.length - 1
                    ? 'rounded-tr-2lg rounded-br-2lg'
                    : index === 0
                    ? 'rounded-tl-2lg rounded-bl-2lg'
                    : ''
                } ${
                  activeTab === content.name
                    ? 'border-creme-2 bg-white'
                    : 'border-creme-2 bg-creme-2'
                }`,
              )}
              onPress={() => handleTabPress(content.name)}
            >
              <Text
                style={tw.style(
                  subheadMediumUppercase,
                  activeTab === content.name ? 'text-black' : 'text-stone',
                )}
              >
                {content.name}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {TRACK.map((content, index) => {
        return (
          <Fragment key={index}>
            {activeTab === content.name && <ChartContent item={content} />}
          </Fragment>
        );
      })}
    </View>
  );
}
