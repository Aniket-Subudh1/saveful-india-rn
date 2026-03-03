import { Feather } from '@expo/vector-icons';
import { yupResolver } from '@hookform/resolvers/yup';
import { Picker } from '@react-native-picker/picker';
import { useLinkTo, useNavigation } from '@react-navigation/native';
import FocusAwareStatusBar from '../../../common/components/FocusAwareStatusBar';
import PrimaryButton from '../../../common/components/ThemeButtons/PrimaryButton';
import SecondaryButton from '../../../common/components/ThemeButtons/SecondaryButton';
import tw from '../../../common/tailwind';
import { mixpanelEventName } from '../../../modules/analytics/analytics';
import useAnalytics from '../../../modules/analytics/hooks/useAnalytics';
import {
  ControlledOverlayPicker,
  ControlledTextInput,
  FieldWrapper,
  FormLabel,
} from '../../../modules/forms';
import {
  useGetUserOnboardingQuery,
  useUpdateUserOnboardingMutation,
} from '../../../modules/intro/api/api';
//import PostcodeAutocomplete from '../../../modules/intro/components/PostcodeAutocomplete';
import { LocationMetadata } from '../../../modules/intro/api/types';
import { MixPanelContext } from '../../../modules/mixpanel/context/MixpanelContext';
import AnimatedSettingsHeader from '../../../modules/track/components/AnimatedSettingsHeader';
import React, { useContext, useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  Animated,
  Dimensions,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { cardDrop } from '../../../theme/shadow';
import { subheadLargeUppercase } from '../../../theme/typography';
import * as Yup from 'yup';
import { TrackStackScreenProps } from '../navigation/TrackNavigation';

const DAYS_OF_THE_WEEK = [
  { id: 'monday', name: 'Monday' },
  { id: 'tuesday', name: 'Tuesday' },
  { id: 'wednesday', name: 'Wednesday' },
  { id: 'thursday', name: 'Thursday' },
  { id: 'friday', name: 'Friday' },
  { id: 'saturday', name: 'Saturday' },
  { id: 'sunday', name: 'Sunday' },
];

const schema = Yup.object({
  postcode: Yup.string().required('Please enter your postcode'),
  suburb: Yup.string().required('Please enter your suburb'),
  noOfAdults: Yup.number()
    .required('Please enter the number of adults')
    .typeError('Please enter a number'),
  noOfChildren: Yup.number()
    .required('Please enter the number of children')
    .typeError('Please enter a number'),
  trackSurveyDay: Yup.string().required('Please select a day'),
});

interface FormData {
  postcode: string;
  suburb: string;
  noOfAdults: number;
  noOfChildren: number;
  trackSurveyDay: string;
}

const defaultValues: FormData = {
  postcode: '',
  suburb: '',
  noOfAdults: 0,
  noOfChildren: 0,
  trackSurveyDay: 'monday',
};

export default function SettingsSavefulScreen() {
  const offset = useRef(new Animated.Value(0)).current;

  //const linkTo = useLinkTo();
  const navigation = useNavigation<TrackStackScreenProps<'Settings'>['navigation']>();

  const [mixpanel] = useContext(MixPanelContext);
  //Uncomment when available
  const { data: userOnboarding } = useGetUserOnboardingQuery();
  const [updateUserOnboarding, { isLoading, isSuccess }] =
    useUpdateUserOnboardingMutation();

  //Temporary MOCK Data
// const [userOnboarding, setUserOnboarding] = useState<FormData | null>(null);
// const [isLoading, setIsLoading] = useState(false);
// const [isSuccess, setIsSuccess] = useState(false);

// useEffect(() => {
//   // Simulate fetching user onboarding data
//   setTimeout(() => {
//     setUserOnboarding({
//       postcode: '123456',
//       suburb: 'Mockville',
//       noOfAdults: 2,
//       noOfChildren: 1,
//       trackSurveyDay: 'friday',
//     });
//   }, 500);
// }, []);

// const updateUserOnboarding = async (data: FormData) => {
//   setIsLoading(true);
//   return new Promise<FormData>((resolve) => {
//     setTimeout(() => {
//       setUserOnboarding(data); // simulate update
//       setIsLoading(false);
//       setIsSuccess(true);
//       resolve(data);
//     }, 1000);
//   });
// };
//MOCK Data ends here

  const { sendAnalyticsEvent, sendFailedEventAnalytics } = useAnalytics();

  const {
    control,
    handleSubmit,
    setValue,
    // setError,
    // watch,
    formState: { errors },
  } = useForm<FormData>({
    mode: 'onBlur',
    defaultValues,
    resolver: yupResolver(schema),
  });

  const [isSuccessUpdateUserOnboarding, setIsSuccessUpdateUserOnboarding] =
    useState<boolean>(false);

  const [selectedLocation, setSelectedLocation] =
    useState<LocationMetadata | null>(null);

  const onUpdateUserOnboarding = handleSubmit(async data => {
    if (isLoading) {
      return;
    }

    try {
      await updateUserOnboarding(data).unwrap();
      //await updateUserOnboarding(data); // for mock and uncomment above once data is available
      sendAnalyticsEvent({
        event: mixpanelEventName.actionClicked,
        properties: {
          action: mixpanelEventName.preferencesUpdated,
          adult_number: data.noOfAdults,
          child_number: data.noOfChildren,
          postcode: data.postcode,
          suburb: data.suburb,
          track_survey_day: data.trackSurveyDay,
        },
      });
      mixpanel?.getPeople().set({
        adult_number: data.noOfAdults,
        child_number: data.noOfChildren,
        postcode: data.postcode,
        suburb: data.suburb,
        track_survey_day: data.trackSurveyDay,
        household_composition: `${data.noOfAdults} Adult ${data.noOfChildren} Children`,
      });

      setIsSuccessUpdateUserOnboarding(true);
      setTimeout(() => {
        setIsSuccessUpdateUserOnboarding(false);
      }, 3000);
    } catch (error: unknown) {
      sendFailedEventAnalytics(error);
      // Whoopss.
      // Alert.alert('User update error', JSON.stringify(error));
    }
  });

  useEffect(() => {
    if (userOnboarding) {
      setValue('postcode', userOnboarding.postcode);
      setValue('suburb', userOnboarding.suburb);
      setValue('noOfAdults', userOnboarding.no_of_people?.adults || 0);
      setValue('noOfChildren', userOnboarding.no_of_people?.children || 0);
      setValue('trackSurveyDay', userOnboarding.track_survey_day);

      

    }
  }, [setValue, userOnboarding]);

  if (!userOnboarding) {
  }

  return (
    <View style={tw`flex-1 bg-creme`}>
      <AnimatedSettingsHeader animatedValue={offset} title="Saveful settings" />
      <Image
        resizeMode="cover"
        style={tw.style(
          `absolute top-0 w-[${
            Dimensions.get('window').width
          }px] bg-eggplant h-[${
            (Dimensions.get('screen').width * 271) / 374
          }px]`,
        )}
        source={require('../../../../assets/ribbons/eggplant-tall.png')}
      />
      <ScrollView
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: offset } } }],
          { useNativeDriver: false },
        )}
        contentContainerStyle={tw.style('grow')}
        keyboardShouldPersistTaps="handled"
      >
        <SafeAreaView style={tw`z-10 flex-1`}>
          <View style={tw.style('mt-15 flex-1 bg-creme px-5 pt-8')}>
            <FieldWrapper>
              <FormLabel error={errors.postcode}>Postcode</FormLabel>
              {/* <PostcodeAutocomplete
                selectedLocation={selectedLocation}
                setSelectedLocation={setSelectedLocation}
                initialValue={userOnboarding.postcode}
                setValue={setValue}
              /> */} 
              {/* Uncomment once available */}
              {/* <ControlledTextInput
                name="postcode"
                control={control}
                error={errors.postcode}
                keyboardType="numeric"
                returnKeyType="done"
              /> */}
            </FieldWrapper>

            <FieldWrapper>
              <FormLabel error={errors.noOfAdults || errors.noOfChildren}>
                Household size
              </FormLabel>
              <View style={tw`w-full flex-row gap-1`}>
                <ControlledTextInput
                  name="noOfAdults"
                  control={control}
                  error={errors.noOfAdults}
                  containerStyle={tw`w-1/2`}
                  keyboardType="numeric"
                  postText="Adults"
                  returnKeyType="done"
                />
                <ControlledTextInput
                  name="noOfChildren"
                  control={control}
                  error={errors.noOfChildren}
                  containerStyle={tw`w-1/2`}
                  keyboardType="numeric"
                  postText="Children"
                  returnKeyType="done"
                />
              </View>
            </FieldWrapper>

            <View style={tw.style('mb-8')}>
              <FormLabel>Dietary requirements</FormLabel>
              {/* {userOnboarding?.dietary_requirements && (
              <Text style={tw.style(bodyMediumRegular)}>
                {userOnboarding?.dietary_requirements.join(', ')}
              </Text>
            )} */}
              <SecondaryButton
                onPress={() => {
                  //linkTo('/track/settings/details/onboarding-dietary');
                  navigation.navigate('SettingsDetailsOnboardingDietary');
                }}
              >
                Edit
              </SecondaryButton>
            </View>

            <View style={tw.style('mb-8')}>
              <FormLabel>Preferred Shopping & Weekly Survey Day</FormLabel>
              <ControlledOverlayPicker
                name="trackSurveyDay"
                control={control}
                customDisplayOnAndroid
                displayNames={DAYS_OF_THE_WEEK.reduce(
                  (acc, day) => ({ ...acc, [day.id]: day.name }),
                  {},
                )}
              >
                {DAYS_OF_THE_WEEK.map(day => (
                  <Picker.Item
                    value={day.id}
                    label={day.name}
                    key={`item-${day.id}`}
                  />
                ))}
              </ControlledOverlayPicker>
            </View>
          </View>
        </SafeAreaView>
      </ScrollView>

      {isSuccessUpdateUserOnboarding && (
        <Pressable
          style={tw.style(
            'mx-5 mb-4 flex-row items-center justify-start rounded-md border border-kale bg-mint p-3.5',
            cardDrop,
          )}
          onPress={() => {
            setIsSuccessUpdateUserOnboarding(false);
          }}
        >
          <Feather
            style={tw.style('mr-3')}
            name={'check'}
            size={24}
            color="black"
          />
          <Text style={[tw.style(subheadLargeUppercase)]}>
            Settings updated
          </Text>
        </Pressable>
      )}

      <View style={tw.style('mx-5 mb-7 gap-2')}>
        <PrimaryButton
          onPress={onUpdateUserOnboarding}
          buttonSize="large"
          loading={isLoading}
        >
          Save changes
        </PrimaryButton>
      </View>

      <FocusAwareStatusBar statusBarStyle="light" />
    </View>
  );
}
