import { CurrentUser, CurrentUserTOTP } from '../../models/Session';
import api from '../api';
import { DataResponse } from '../../modules/api/types';

export interface SessionToken {
  id: string;
  aud?: string;
  updated_at: number;
  device?: string;
  client?: string;
  is_current?: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupData {
  email: string;
  password: string;
  name: string;
  country?: string;
  stateCode?: string;
  vegType?: string;
  dairyFree?: boolean;
  nutFree?: boolean;
  glutenFree?: boolean;
  hasDiabetes?: boolean;
  otherAllergies?: string[];
  noOfAdults?: number;
  noOfChildren?: number;
  tastePreference?: string[];
}

export interface RequestOtpData {
  email: string;
  password: string;
  confirmPassword: string;
  name: string;
  country?: string;
  stateCode?: string;
  vegType?: string;
  dairyFree?: boolean;
  nutFree?: boolean;
  glutenFree?: boolean;
  hasDiabetes?: boolean;
  otherAllergies?: string[];
  noOfAdults?: number;
  noOfChildren?: number;
  tastePreference?: string[];
}

export interface VerifyOtpData {
  email: string;
  otp: string;
}

export interface ForgotPasswordData {
  email: string;
}

export interface ResetPasswordData {
  email: string;
  otp: string;
  newPassword: string;
  confirmPassword: string;
}

export interface PasswordResetResponse {
  success: boolean;
  message: string;
}

export interface OtpResponse {
  success: boolean;
  message: string;
  expiresIn?: string;
}

export interface AuthResponse {
  success: boolean;
  accessToken: string;
  refreshToken?: string;
  user?: {
    id: string;
    email: string;
    role: string;
    name: string;
  };
  userId?: string;
  message?: string;
}

export interface DietaryProfileUpdate {
  vegType: 'OMNI' | 'VEGETARIAN' | 'VEGAN';
  dairyFree?: boolean;
  nutFree?: boolean;
  glutenFree?: boolean;
  hasDiabetes?: boolean;
  otherAllergies?: string[];
  country?: string;
  pincode?: string;
  noOfAdults?: number;
  noOfChildren?: number;
}

const currentUserApi = api
  .enhanceEndpoints({
    addTagTypes: ['SessionTokens'],
  })
  .injectEndpoints({
    overrideExisting: true,
    endpoints: builder => ({
      // New login endpoint for NestJS backend
      login: builder.mutation<AuthResponse, LoginCredentials>({
        query: credentials => ({
          url: '/api/auth/login',
          method: 'POST',
          body: credentials,
        }),
        invalidatesTags: ['CurrentUser'],
        async onQueryStarted(_, { dispatch, queryFulfilled }) {
          try {
            const { data } = await queryFulfilled;
            // If login successful and has token, refetch user data
            if (data.success && data.accessToken) {
              dispatch(currentUserApi.util.invalidateTags(['CurrentUser']));
            }
          } catch {
            // Handle error if needed
          }
        },
      }),

      // Request OTP for signup
      requestOTP: builder.mutation<OtpResponse, RequestOtpData>({
        query: data => ({
          url: '/api/auth/request-otp',
          method: 'POST',
          body: data,
        }),
      }),

      // Verify OTP and create account
      verifyOTP: builder.mutation<AuthResponse, VerifyOtpData>({
        query: data => ({
          url: '/api/auth/verify-otp',
          method: 'POST',
          body: data,
        }),
        invalidatesTags: ['CurrentUser'],
        async onQueryStarted(_, { dispatch, queryFulfilled }) {
          try {
            const { data } = await queryFulfilled;
            // If verification successful and has token, refetch user data
            if (data.success && data.accessToken) {
              dispatch(currentUserApi.util.invalidateTags(['CurrentUser']));
            }
          } catch {
            // Handle error if needed
          }
        },
      }),

      // New signup endpoint for NestJS backend (legacy, kept for backward compatibility)
      signup: builder.mutation<AuthResponse, SignupData>({
        query: data => ({
          url: '/api/auth/signup',
          method: 'POST',
          body: data,
        }),
        invalidatesTags: ['CurrentUser'],
        async onQueryStarted(_, { dispatch, queryFulfilled }) {
          try {
            const { data } = await queryFulfilled;
            // If signup successful and has token, refetch user data
            if (data.success && data.accessToken) {
              dispatch(currentUserApi.util.invalidateTags(['CurrentUser']));
            }
          } catch {
            // Handle error if needed
          }
        },
      }),

      // Refresh token endpoint
      refreshToken: builder.mutation<AuthResponse, { refreshToken: string }>({
        query: ({ refreshToken }) => ({
          url: '/api/auth/refresh',
          method: 'POST',
          body: { refreshToken },
        }),
      }),

      getCurrentUser: builder.query<
        CurrentUser | null,
        { accessToken?: string } | void
      >({
        query: params => ({
          url: '/api/auth/me',
          method: 'get',
          headers: params?.accessToken
            ? { authorization: `Bearer ${params?.accessToken}` }
            : undefined,
        }),
        providesTags: ['CurrentUser'],
        keepUnusedDataFor: 3600, 
        transformResponse: (r: any) => {
          if (!r) return null;
          const normalizedId = r?._id ?? r?.id;
          const user: CurrentUser = {
            // Spread original object first
            ...r,
            // Then normalize and map fields to our model
            id: normalizedId as string,
            email: r.email,
            first_name: r.name || r.first_name || '',
            name: r.name,
            country: r.country,
            stateCode: r.stateCode,
            // Prefer flat fields, fallback to nested dietaryProfile
            vegType: r.vegType ?? r.dietaryProfile?.vegType,
            dairyFree: r.dairyFree ?? r.dietaryProfile?.dairyFree,
            nutFree: r.nutFree ?? r.dietaryProfile?.nutFree,
            glutenFree: r.glutenFree ?? r.dietaryProfile?.glutenFree,
            hasDiabetes: r.hasDiabetes ?? r.dietaryProfile?.hasDiabetes,
            otherAllergies: r.otherAllergies ?? r.dietaryProfile?.otherAllergies,
            noOfAdults: r.noOfAdults ?? r.dietaryProfile?.noOfAdults,
            noOfChildren: r.noOfChildren ?? r.dietaryProfile?.noOfChildren,
            tastePreference: r.tastePreference ?? r.dietaryProfile?.tastePrefrence,
          };
          return user;
        },
      }),

      createCurrentUserTOTP: builder.mutation<
        CurrentUserTOTP,
        { secret: string; totp_code: string; accessToken?: string } | void
      >({
        query: params => ({
          url: '/api/current_user/totp',
          method: 'POST',
          body: params,
          headers: params?.accessToken
            ? { authorization: `Bearer ${params?.accessToken}` }
            : undefined,
        }),
        invalidatesTags: ['CurrentUserTOTP'],
        transformResponse: r => (r as DataResponse<CurrentUserTOTP>).data,
      }),

      getCurrentUserTOTP: builder.query<
        CurrentUserTOTP,
        { accessToken?: string } | void
      >({
        query: params => ({
          url: '/api/current_user/totp',
          method: 'get',
          headers: params?.accessToken
            ? { authorization: `Bearer ${params?.accessToken}` }
            : undefined,
        }),
        providesTags: ['CurrentUserTOTP'],
        transformResponse: r => (r as DataResponse<CurrentUserTOTP>).data,
      }),

      deleteCurrentUserTOTP: builder.mutation<
        CurrentUserTOTP,
        { accessToken?: string } | void
      >({
        query: params => ({
          url: '/api/current_user/totp',
          method: 'DELETE',
          headers: params?.accessToken
            ? { authorization: `Bearer ${params?.accessToken}` }
            : undefined,
        }),
        invalidatesTags: ['CurrentUserTOTP'],
        transformResponse: r => (r as DataResponse<CurrentUserTOTP>).data,
      }),

      updateCurrentUser: builder.mutation<CurrentUser, CurrentUser>({
        query: params => ({
          url: '/api/auth/profile',
          method: 'PUT',
          body: {
            name: params.first_name || params.name,
          },
        }),
        invalidatesTags: ['CurrentUser'],
        transformResponse: (r: any): CurrentUser => {
          const normalizedId = r?._id ?? r?.id;
          return {
            ...r,
            id: normalizedId as string,
            email: r.email,
            first_name: r.name || r.first_name || '',
            name: r.name,
          } as CurrentUser;
        },
      }),

      updateCurrentUserPassword: builder.mutation<
        { success: boolean; message: string },
        {
          currentPassword: string;
          newPassword: string;
          confirmNewPassword: string;
        }
      >({
        query: ({ currentPassword, newPassword, confirmNewPassword }) => ({
          url: '/api/auth/change-password',
          method: 'POST',
          body: {
            currentPassword,
            newPassword,
            confirmNewPassword,
          },
        }),
        invalidatesTags: ['CurrentUser'],
      }),

      updateCurrentUserEmail: builder.mutation<CurrentUser, { email: string }>({
        query: params => ({
          url: '/api/current_user/update_email',
          method: 'POST',
          body: params,
        }),
        invalidatesTags: ['CurrentUser'],
        transformResponse: r => (r as DataResponse<CurrentUser>).data,
      }),

      updateCurrentUserTimezone: builder.mutation<
        CurrentUser,
        { timezone: string }
      >({
        query: params => ({
          url: '/api/current_user/update_timezone',
          method: 'POST',
          body: params,
        }),
        invalidatesTags: ['CurrentUser'],
        transformResponse: r => (r as DataResponse<CurrentUser>).data,
      }),

      deleteCurrentUser: builder.mutation<{ success: boolean; message: string }, void>({
        query: () => ({
          url: '/api/auth/account',
          method: 'DELETE',
        }),
        invalidatesTags: ['CurrentUser'],
      }),

      updateDietaryProfile: builder.mutation<CurrentUser, DietaryProfileUpdate>({
        query: (data) => ({
          url: '/api/auth/dietary-profile',
          method: 'PUT',
          body: data,
        }),
        invalidatesTags: ['CurrentUser'],
        transformResponse: (r: any): CurrentUser => {
          console.log('updateDietaryProfile response:', r);
          const normalizedId = r?._id ?? r?.id;
          return {
            ...r,
            id: normalizedId as string,
            email: r.email || '',
            first_name: r.name || r.first_name || '',
            name: r.name,
            country: r.country,
            stateCode: r.stateCode,
            vegType: r.vegType ?? r.dietaryProfile?.vegType,
            dairyFree: r.dairyFree ?? r.dietaryProfile?.dairyFree,
            nutFree: r.nutFree ?? r.dietaryProfile?.nutFree,
            glutenFree: r.glutenFree ?? r.dietaryProfile?.glutenFree,
            hasDiabetes: r.hasDiabetes ?? r.dietaryProfile?.hasDiabetes,
            otherAllergies: r.otherAllergies ?? r.dietaryProfile?.otherAllergies,
            noOfAdults: r.noOfAdults ?? r.dietaryProfile?.noOfAdults,
            noOfChildren: r.noOfChildren ?? r.dietaryProfile?.noOfChildren,
            tastePreference: r.tastePreference ?? r.dietaryProfile?.tastePrefrence,
          } as CurrentUser;
        },
        async onQueryStarted(_, { dispatch, queryFulfilled }) {
          try {
            await queryFulfilled;
            // Refetch current user to get updated dietary profile
            dispatch(currentUserApi.util.invalidateTags(['CurrentUser']));
          } catch {
            // Handle error if needed
          }
        },
      }),

      deleteSession: builder.mutation<
        void,
        { refresh_token?: string; id?: string; notification_token?: string }
      >({
        query: params => {
          return {
            url: '/api/session',
            method: 'DELETE',
            body: params,
          };
        },
        invalidatesTags: ['SessionTokens'],
      }),

      listSessions: builder.query<
        DataResponse<SessionToken[]>,
        { refresh_token?: string }
      >({
        query: params => {
          const searchParams = new URLSearchParams();
          if (params.refresh_token) {
            searchParams.set('refresh_token', params.refresh_token);
          }
          return {
            url: `/api/session?${searchParams.toString()}`,
          };
        },
        providesTags: ['SessionTokens'],
      }),

      // Forgot password – request OTP to email
      forgotPassword: builder.mutation<PasswordResetResponse, ForgotPasswordData>({
        query: data => ({
          url: '/api/auth/forgot-password',
          method: 'POST',
          body: data,
        }),
      }),

      // Reset password with OTP + new password
      resetPassword: builder.mutation<PasswordResetResponse, ResetPasswordData>({
        query: data => ({
          url: '/api/auth/reset-password',
          method: 'POST',
          body: data,
        }),
      }),
    }),
  });

export const {
  useLoginMutation,
  useSignupMutation,
  useRequestOTPMutation,
  useVerifyOTPMutation,
  useRefreshTokenMutation,
  useGetCurrentUserQuery,
  useLazyGetCurrentUserQuery,
  useCreateCurrentUserTOTPMutation,
  useGetCurrentUserTOTPQuery,
  useLazyGetCurrentUserTOTPQuery,
  useDeleteCurrentUserTOTPMutation,
  useUpdateCurrentUserMutation,
  useUpdateCurrentUserEmailMutation,
  useUpdateCurrentUserTimezoneMutation,
  useDeleteCurrentUserMutation,
  useUpdateDietaryProfileMutation,
  useDeleteSessionMutation,
  useListSessionsQuery,
  useUpdateCurrentUserPasswordMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
} = currentUserApi;
