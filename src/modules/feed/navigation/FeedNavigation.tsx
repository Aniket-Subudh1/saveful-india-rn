import React from 'react';
import { 
  createNativeStackNavigator, 
  NativeStackScreenProps 
} from '@react-navigation/native-stack';
import tw from '../../../common/tailwind';
import FeedScreen from '../screens/FeedScreen';
import PartnersScreen from '../screens/PartnersScreen';
import DietaryRecipesScreen from '../screens/DietaryRecipesScreen';
import IngredientsStackNavigator, { IngredientsStackParamList } from '../../ingredients/navigation/IngredientsNavigator';
import GroupsStackNavigator, { GroupsStackParamList } from '../../groups/navigation/GroupsNavigator';
import InventoryStackNavigator, { InventoryStackParamList } from '../../inventory/navigation/InventoryNavigator';
import CookbookStackNavigator, { CookbookStackParamList } from '../../cookbook/navigation/CookbookNavigation';
import LeaderboardScreen from '../../badges/screens/LeaderboardScreen';
import ShoppingListScreen from '../../shoppingList/screens/ShoppingListScreen';
import { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';
import { RootNavigationStackParams } from '../../navigation/navigator/root/RootNavigator';


export type FeedStackParamList = {
  FeedHome: undefined;
  Partners: undefined;
  Leaderboard: undefined;
  ShoppingList: undefined;
  DietaryRecipes: { filters: string[]; title?: string };
  Ingredients: NavigatorScreenParams<IngredientsStackParamList>;
  Groups: NavigatorScreenParams<GroupsStackParamList>;
  Inventory: NavigatorScreenParams<InventoryStackParamList> | undefined;
  Cookbook: NavigatorScreenParams<CookbookStackParamList> | undefined;
};

export type FeedStackScreenProps<Screen extends keyof FeedStackParamList> =
  CompositeScreenProps<
    NativeStackScreenProps<FeedStackParamList, Screen>,
    RootNavigationStackParams<'Feed'>
  >;

const NavigationStack = createNativeStackNavigator<FeedStackParamList>();

export default function FeedStackNavigator() {
  return (
    <NavigationStack.Navigator
      screenOptions={({ navigation }) => ({
        detachPreviousScreen: !navigation.isFocused(),
        headerTintColor: tw.color('gray-900'),
      })}
    >
      <NavigationStack.Screen
        name="FeedHome"
        component={FeedScreen}
        options={{ title: 'Feed', headerShown: false }}
      />
      <NavigationStack.Screen
        name="Partners"
        component={PartnersScreen}
        options={{ title: 'Partners', headerShown: false }}
      />

      <NavigationStack.Screen
        name="Leaderboard"
        component={LeaderboardScreen}
        options={{ title: 'Leaderboard', headerShown: false }}
      />

      <NavigationStack.Screen
        name="ShoppingList"
        component={ShoppingListScreen}
        options={{ title: 'Shopping List', headerShown: false }}
      />

      <NavigationStack.Screen
        name="Ingredients"
        component={IngredientsStackNavigator}
        options={{ title: 'Ingredients', headerShown: false }}
      />

      <NavigationStack.Screen
        name="Groups"
        component={GroupsStackNavigator}
        options={{ title: 'Groups', headerShown: false }}
      />

      <NavigationStack.Screen
        name="Inventory"
        component={InventoryStackNavigator}
        options={{ title: 'Inventory', headerShown: false }}
      />

      <NavigationStack.Screen
        name="DietaryRecipes"
        component={DietaryRecipesScreen}
        options={{ headerShown: false }}
      />

      <NavigationStack.Screen
        name="Cookbook"
        component={CookbookStackNavigator}
        options={{ title: 'My CookBook', headerShown: false }}
      />
    </NavigationStack.Navigator>
  );
}