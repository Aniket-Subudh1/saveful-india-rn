import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PermissionStatus } from 'expo-modules-core';
import AsyncStorage from '@react-native-async-storage/async-storage';
import tw from '../../../common/tailwind';
import useNotifications from '../../notifications/hooks/useNotifications';

const DISMISSED_KEY = '@notification_banner_dismissed';

export default function NotificationPermissionBanner() {
  const { permissionStatus, registerForNotifications } = useNotifications();
  const [dismissed, setDismissed] = useState(true); 
  const slideAnim = useRef(new Animated.Value(0)).current;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (permissionStatus !== PermissionStatus.UNDETERMINED) {
      setVisible(false);
      return;
    }

    AsyncStorage.getItem(DISMISSED_KEY).then((value) => {
      if (value !== 'true') {
        setDismissed(false);
        setVisible(true);
      }
    });
  }, [permissionStatus]);

  useEffect(() => {
    if (visible && !dismissed) {
      Animated.timing(slideAnim, {
        toValue: 1,
        duration: 400,
        delay: 800, 
        useNativeDriver: true,
      }).start();
    }
  }, [visible, dismissed, slideAnim]);

  const handleAllow = useCallback(() => {
    registerForNotifications();
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start(() => setVisible(false));
    AsyncStorage.setItem(DISMISSED_KEY, 'true');
  }, [registerForNotifications, slideAnim]);

  const handleDismiss = useCallback(() => {
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setDismissed(true);
      setVisible(false);
    });
    AsyncStorage.setItem(DISMISSED_KEY, 'true');
  }, [slideAnim]);

  if (!visible || dismissed) return null;

  return (
    <Animated.View
      style={[
        tw`mx-5 mb-3 rounded-2xl bg-eggplant px-4 py-3.5 overflow-hidden`,
        {
          opacity: slideAnim,
          transform: [
            {
              translateY: slideAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [-20, 0],
              }),
            },
          ],
        },
      ]}
    >
      <View style={tw`flex-row items-center`}>
        <View
          style={tw`h-10 w-10 items-center justify-center rounded-full bg-white/20 mr-3`}
        >
          <Ionicons name="notifications-outline" size={22} color="#FFFCF9" />
        </View>

        {/* Text content */}
        <View style={tw`flex-1 mr-2`}>
          <Text style={tw`font-sans-semibold text-sm text-white leading-tight`}>
            Stay in the loop!
          </Text>
          <Text style={tw`font-sans text-xs text-white/80 leading-tight mt-0.5`}>
            Get notified about new recipes, tips & challenges
          </Text>
        </View>

        {/* Dismiss X */}
        <Pressable
          onPress={handleDismiss}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Dismiss notification banner"
          style={tw`p-1`}
        >
          <Ionicons name="close" size={18} color="rgba(255,252,249,0.7)" />
        </Pressable>
      </View>

      <Pressable
        onPress={handleAllow}
        accessibilityRole="button"
        accessibilityLabel="Allow notifications"
        style={tw`mt-3 rounded-xl bg-white py-2.5 items-center`}
      >
        <Text style={tw`font-sans-semibold text-sm text-eggplant`}>
          Allow Notifications
        </Text>
      </Pressable>
    </Animated.View>
  );
}
