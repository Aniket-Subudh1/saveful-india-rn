import React from 'react';
import {
  createNativeStackNavigator,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import { CompositeScreenProps } from '@react-navigation/native';
import tw from '../../../common/tailwind';
import CookbookScreen from '../screens/CookbookScreen';
import AddRecipeScreen from '../screens/AddRecipeScreen';
import CookbookRecipeDetailScreen from '../screens/CookbookRecipeDetailScreen';
import CookbookMakeItScreen from '../screens/CookbookMakeItScreen';
import { RootNavigationStackParams } from '../../navigation/navigator/root/RootNavigator';
import { UserRecipe } from '../models/userRecipe';

export type CookbookStackParamList = {
  CookbookHome: undefined;
  AddRecipe: undefined;
  CookbookRecipeDetail: { id: string; initialRecipe?: UserRecipe };
  CookbookMakeIt: {
    id: string;
    variant: string;
    ingredients: {
      id: string;
      title: string;
      quantity: string;
      preparation?: string;
    }[];
  };
};

export type CookbookStackScreenProps<
  Screen extends keyof CookbookStackParamList,
> = CompositeScreenProps<
  NativeStackScreenProps<CookbookStackParamList, Screen>,
  RootNavigationStackParams<'Feed'>
>;

const NavigationStack = createNativeStackNavigator<CookbookStackParamList>();

export default function CookbookStackNavigator() {
  return (
    <NavigationStack.Navigator
      screenOptions={({ navigation }) => ({
        detachPreviousScreen: !navigation.isFocused(),
        headerTintColor: tw.color('gray-900'),
      })}
    >
      <NavigationStack.Screen
        name="CookbookHome"
        component={CookbookScreen}
        options={{ title: 'My CookBook', headerShown: false }}
      />
      <NavigationStack.Screen
        name="AddRecipe"
        component={AddRecipeScreen}
        options={{ title: 'Add Recipe', headerShown: false }}
      />
      <NavigationStack.Screen
        name="CookbookRecipeDetail"
        component={CookbookRecipeDetailScreen}
        options={{ title: 'Recipe', headerShown: false }}
      />
      <NavigationStack.Screen
        name="CookbookMakeIt"
        component={CookbookMakeItScreen}
        options={{
          title: 'Cook It',
          headerShown: false,
          animation: 'slide_from_bottom',
        }}
      />
    </NavigationStack.Navigator>
  );
}
