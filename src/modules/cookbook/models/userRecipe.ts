export interface UserAlternativeIngredient {
  ingredient: string;
  inheritQuantity: boolean;
  inheritPreparation: boolean;
  quantity?: string;
  preparation?: string;
}

export interface UserRequiredIngredient {
  recommendedIngredient: string;
  quantity: string;
  preparation: string;
  alternativeIngredients: UserAlternativeIngredient[];
}

export interface UserOptionalIngredient {
  ingredient: string; 
  quantity: string;
  preparation: string;
}

export interface UserComponentStep {
  stepInstructions: string;
  hackOrTipIds: string[];
  alwaysShow: boolean;
  relevantIngredients: string[];
}

export interface UserComponent {
  componentTitle: string;
  componentInstructions?: string;
  includedInVariants: string[];
  requiredIngredients: UserRequiredIngredient[];
  optionalIngredients: UserOptionalIngredient[];
  componentSteps: UserComponentStep[];
}

export interface UserRecipeComponentWrapper {
  prepShortDescription?: string;
  prepLongDescription?: string;
  variantTags: string[];
  stronglyRecommended: boolean;
  choiceInstructions?: string;
  buttonText?: string;
  component: UserComponent[];
}

export type UserRecipeStatus = 'accepted' | 'pending' | 'rejected';

export interface UserRecipe {
  _id: string;
  userid: string;
  status: UserRecipeStatus;
  title: string;
  shortDescription: string;
  longDescription: string;
  hackOrTipIds: string[];
  heroImageUrl?: string;
  youtubeId?: string;
  portions: string;
  prepCookTime: number;
  stickerId?: string;
  frameworkCategories: string[];
  sponsorId?: string;
  fridgeKeepTime?: string;
  freezeKeepTime?: string;
  useLeftoversIn: string[];
  components: UserRecipeComponentWrapper[];
  order?: number;
  isActive: boolean;
  countries: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AddRecipeRequest {
  message: string;
}

export interface AddRecipeResponse {
  success: boolean;
  message: string;
  data?: UserRecipe;
  limit?: number;
}

export interface UserRecipesResponse {
  success: boolean;
  count: number;
  data: UserRecipe[];
}

export interface UserRecipeByIdResponse {
  success: boolean;
  data?: UserRecipe;
  message?: string;
}

export interface DeleteRecipeResponse {
  success: boolean;
  message: string;
}
