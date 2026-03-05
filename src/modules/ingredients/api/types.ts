export enum IngredientTheme {
  RED = 'Red',
  PINK = 'Pink',
  PURPLE = 'Purple',
  GREEN = 'Green',
  YELLOW = 'Yellow',
  ORANGE = 'Orange',
}

export enum Month {
  JANUARY = 'January',
  FEBRUARY = 'February',
  MARCH = 'March',
  APRIL = 'April',
  MAY = 'May',
  JUNE = 'June',
  JULY = 'July',
  AUGUST = 'August',
  SEPTEMBER = 'September',
  OCTOBER = 'October',
  NOVEMBER = 'November',
  DECEMBER = 'December',
}

export interface IngredientCategory {
  _id: string;
  name: string;
  imageUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface DietCategory {
  _id: string;
  name: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface HackOrTip {
  _id: string;
  title: string;
  type: string;
  shortDescription: string;
}

export interface Sponsor {
  _id: string;
  title: string;
  logo: string;
  logoBlackAndWhite?: string;
  broughtToYouBy?: string;
  tagline?: string;
}

export interface Sticker {
  _id: string;
  title: string;
  imageUrl: string;
  description?: string;
}

export interface ParentIngredient {
  _id: string;
  name: string;
  averageWeight: number;
}

export interface FoodFact {
  _id: string;
  title: string;
  sponsor?: Sponsor | string;
  relatedIngredient?: { _id: string; name: string } | string;
  factOrInsight?: string;
}

export interface Ingredient {
  _id: string;
  name: string;
  averageWeight: number;
  categoryId: IngredientCategory | string;
  suitableDiets: (DietCategory | string)[];
  hasPage: boolean;
  heroImageUrl?: string;
  theme?: IngredientTheme;
  parentIngredients: (ParentIngredient | string)[];
  description?: string;
  foodFactId?: FoodFact | string;
  relatedHacks: (HackOrTip | string)[];
  inSeason: Month[];
  stickerId?: Sticker | string;
  isPantryItem: boolean;
  nutrition?: string;
  order?: number;
  createdAt: string;
  updatedAt: string;
}
