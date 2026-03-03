import { NavigatorScreenParams } from "@react-navigation/native";
import React, { useEffect } from "react";
import {
  createNativeStackNavigator,
  NativeStackScreenProps,
} from "@react-navigation/native-stack";
import { useNavigation, NavigationProp } from "@react-navigation/native";
import useAccessToken from "../../auth/hooks/useSessionToken";
import { useGetCurrentUserQuery } from "../../auth/api";
import useAuthListener from "../../auth/hooks/useAuthListener";
import { useAppDispatch } from "../../../store/hooks";
import { clearSessionData } from "../../auth/sessionSlice";

import { RootStackParamList } from "./root/types";
import IntroNavigator from "./intro/IntroNavigator";
import RootNavigator from "./root/RootNavigator";
import SurveyStackNavigator, { 
  SurveyStackParamList 
} from "../../track/navigation/SurveyNavigator";
import IngredientsStackNavigator, { 
  IngredientsStackParamList 
} from "../../ingredients/navigation/IngredientsNavigator";
import InventoryStackNavigator, {
  InventoryStackParamList
} from "../../inventory/navigation/InventoryNavigator";
import HackVideoScreen from "../../hack/screens/HackVideoScreen";
import MakeItScreen from "../../make/screens/MakeItScreen";
import AuthScreen from "../../intro/screens/AuthScreen";
import OTPVerificationScreen from "../../intro/screens/OTPVerificationScreen";
import OnboardingNavigator from "./onboarding/OnboardingNavigator";
import SplashPage from "../../intro/components/SplashPage";
import IntroScreen from "../../intro/screens/IntroScreen";

export type InitialStackParamList = {
  Splash: undefined;
  Intro: undefined;
  Auth: undefined;
  OTPVerificationScreen: { email: string; name: string } | undefined;
  Onboarding: undefined;
  Root: NavigatorScreenParams<RootStackParamList> | undefined;
  Ingredients: NavigatorScreenParams<IngredientsStackParamList> | undefined;
  Inventory: NavigatorScreenParams<InventoryStackParamList> | undefined;
  Survey: NavigatorScreenParams<SurveyStackParamList> | undefined;
  MakeIt: {
    id: string;
    variant: string;
    ingredients: {
      id: string;
      title: string;
      quantity: string;
      preparation?: string;
    }[];
    mealId: string;
  };
  HackVideo: { videoString: string }; // id: string
};

const InitialNavigationStack =
  createNativeStackNavigator<InitialStackParamList>();

export type InitialNavigationStackParams<
  Screen extends keyof InitialStackParamList
> = NativeStackScreenProps<InitialStackParamList, Screen>;

function InitialNavigator() {

  const accessToken = useAccessToken();
  const dispatch = useAppDispatch();
  const navigation = useNavigation<NavigationProp<InitialStackParamList>>();

  const { data: currentUser, isLoading: isUserLoading, error: userError, refetch } = useGetCurrentUserQuery(
    undefined,
    { 
      skip: !accessToken,
      refetchOnMountOrArgChange: true,
    }
  );

  // Log user fetch errors but don't crash
  useEffect(() => {
    if (userError) {
      console.error('Failed to fetch current user:', userError);
      // If user fetch fails, clear session and redirect to auth
      if (accessToken) {
        console.log('Clearing invalid session...');
        dispatch(clearSessionData());
      }
    }
  }, [userError, accessToken, dispatch]);
  // Onboarding is complete once the user has a country set.
  // This is written by PUT /auth/dietary-profile at the end of the onboarding
  // carousel, so it is the single authoritative signal — no separate onboarding
  // query is needed here.
  const hasCompletedOnboarding = !!currentUser?.country;

  // Listen for auth state changes and handle automatic logout
  useAuthListener();

  // Navigate based on authentication state changes (handles post-login navigation)
  useEffect(() => {
    // Get current route safely
    const navState = navigation.getState();
    const currentRoute = navState?.routes?.[navState?.index ?? 0]?.name;
    
    // Skip navigation if:
    // 1. No current route yet (navigation not initialized)
    // 2. We're on the Splash screen (let SplashPage handle it)
    // 3. No access token (user not logged in)
    // 4. User data is still loading
    if (!currentRoute || currentRoute === 'Splash' || !accessToken || isUserLoading) {
      return;
    }

    // User is authenticated - navigate based on onboarding status
    const targetRoute = hasCompletedOnboarding ? 'Root' : 'Onboarding';
    
    // Only navigate if we're not already on the target route
    if (currentRoute !== targetRoute) {
      console.log(`Navigating from ${currentRoute} to ${targetRoute} after auth state change`);
      navigation.reset({
        index: 0,
        routes: [{ name: targetRoute }],
      });
    }
  }, [accessToken, hasCompletedOnboarding, isUserLoading, navigation]);

  // Validate token on mount - immediately clear if invalid or expired
  useEffect(() => {
    if (accessToken) {
      try {
        const payload = JSON.parse(atob(accessToken.split('.')[1]));
        const expirationTime = payload.exp * 1000;
        
        if (Date.now() >= expirationTime) {
          console.log('Token expired on app mount - clearing session');
          dispatch(clearSessionData());
        }
      } catch (error) {
        console.log('Invalid token format on app mount - clearing session');
        dispatch(clearSessionData());
      }
    }
  }, []);

  // Notification permission is now handled by the NotificationPermissionBanner
  // on the Feed screen for a less intrusive UX.

  return (
    <InitialNavigationStack.Navigator initialRouteName="Splash" screenOptions={{ headerShown: false }}>
      <InitialNavigationStack.Screen 
        name="Splash" 
        component={SplashPage} 
        options={{ headerShown: false }} 
      />
      <InitialNavigationStack.Screen 
        name="Intro" 
        component={IntroScreen} 
        options={{ headerShown: false }} 
      />
      <InitialNavigationStack.Screen 
        name="Auth" 
        component={AuthScreen} 
        options={{ headerShown: false }} 
      />
      <InitialNavigationStack.Screen 
        name="OTPVerificationScreen" 
        component={OTPVerificationScreen} 
        options={{ headerShown: false }} 
      />
      <InitialNavigationStack.Screen 
        name="Onboarding" 
        component={OnboardingNavigator}
        options={{ headerShown: false }}
      />
      <InitialNavigationStack.Screen 
        name="Root" 
        component={RootNavigator} 
        options={{ headerShown: false }}
      />
      <InitialNavigationStack.Screen 
        name="Ingredients" 
        component={IngredientsStackNavigator}
        options={{ headerShown: false }}
      />
      <InitialNavigationStack.Screen 
        name="Inventory" 
        component={InventoryStackNavigator}
        options={{ headerShown: false }}
      />
      <InitialNavigationStack.Screen 
        name="Survey" 
        component={SurveyStackNavigator} 
        options={{ headerShown: false }}
      />
      <InitialNavigationStack.Screen 
        name="MakeIt"
        component={MakeItScreen}
        options={{title: 'Make it', headerShown: false}}
      />
      <InitialNavigationStack.Screen 
        name="HackVideo" 
        component={HackVideoScreen}
        options={{ title: 'Video', headerShown: false, presentation: 'fullScreenModal', animation: 'fade' }} 
      />
    </InitialNavigationStack.Navigator>
  );
}

export default InitialNavigator;