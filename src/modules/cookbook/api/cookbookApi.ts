import api from '../../api';
import {
  UserRecipe,
  UserRecipesResponse,
  UserRecipeByIdResponse,
  AddRecipeRequest,
  AddRecipeResponse,
  DeleteRecipeResponse,
} from '../models/userRecipe';

const cookbookApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getUserRecipes: builder.query<UserRecipe[], void>({
      query: () => '/api/cookbookai/recipes',
      transformResponse: (response: UserRecipesResponse) => response.data ?? [],
      providesTags: ['CookbookRecipes'],
      keepUnusedDataFor: 60,
    }),

    getUserRecipeById: builder.query<UserRecipe | null, string>({
      query: (id) => `/api/cookbookai/recipes/${id}`,
      transformResponse: (response: UserRecipeByIdResponse) => response.data ?? null,
      keepUnusedDataFor: 120,
    }),

    addRecipeFromLink: builder.mutation<AddRecipeResponse, AddRecipeRequest>({
      queryFn: async (body, _api, _extraOptions, baseQuery) => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 420_000); // 7 minutes
        try {
          const result = await baseQuery({
            url: '/api/cookbookai/add-recipe',
            method: 'POST',
            body,
            signal: controller.signal,
          });
          clearTimeout(timer);
          if (result.error) return { error: result.error };
          return { data: result.data as AddRecipeResponse };
        } catch (err: any) {
          clearTimeout(timer);
          if (err?.name === 'AbortError') {
            return { error: { status: 'TIMEOUT_ERROR', error: 'Request timed out' } as any };
          }
          throw err;
        }
      },
      invalidatesTags: ['CookbookRecipes'],
    }),

    deleteCookbookRecipe: builder.mutation<DeleteRecipeResponse, string>({
      query: (id) => ({
        url: `/api/cookbookai/recipes/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['CookbookRecipes'],
    }),
  }),
  overrideExisting: true,
});

export const {
  useGetUserRecipesQuery,
  useGetUserRecipeByIdQuery,
  useAddRecipeFromLinkMutation,
  useDeleteCookbookRecipeMutation,
} = cookbookApi;

export default cookbookApi;
