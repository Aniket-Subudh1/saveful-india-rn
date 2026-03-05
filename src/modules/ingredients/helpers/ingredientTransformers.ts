import { Ingredient, Month } from '../api/types';
import { IIngredient, IAsset } from '../../../models/craft';

export function isCurrentlyInSeason(inSeason: Month[] | null): boolean {
  if (!inSeason || inSeason.length === 0) return true;
  
  const currentDate = new Date();
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const currentMonthName = monthNames[currentDate.getMonth()];
  
  return inSeason.includes(currentMonthName as Month);
}

export function transformIngredientToLegacyFormat(ingredient: Ingredient): IIngredient {
  const categoryId = ingredient.categoryId !== null && typeof ingredient.categoryId === 'object' ? ingredient.categoryId._id : ingredient.categoryId;
  const foodFact = ingredient.foodFactId !== null && typeof ingredient.foodFactId === 'object' ? ingredient.foodFactId : null;
  const foodFactId = foodFact ? foodFact._id : (typeof ingredient.foodFactId === 'string' ? ingredient.foodFactId : undefined);
  const stickerId = ingredient.stickerId !== null && typeof ingredient.stickerId === 'object' ? ingredient.stickerId._id : ingredient.stickerId;
  
  const heroImage: IAsset[] = ingredient.heroImageUrl ? [{
    id: ingredient._id,
    title: ingredient.name,
    url: ingredient.heroImageUrl,
    uid: ingredient._id,
  }] : [];

  // Transform parentIngredients
  const parentIngredient = ingredient.parentIngredients.map(parent => {
    if (parent !== null && typeof parent === 'object') {
      return {
        id: parent._id,
        title: parent.name,
      };
    }
    return { id: parent, title: '' };
  });

  // Transform suitableDiets
  const suitableDiets = ingredient.suitableDiets.map(diet => {
    if (diet !== null && typeof diet === 'object') {
      return { id: diet._id };
    }
    return { id: diet };
  });

  // Transform relatedHacks
  const relatedHacks = ingredient.relatedHacks.map(hack => {
    if (hack !== null && typeof hack === 'object') {
      return { id: hack._id };
    }
    return { id: hack };
  });

  return {
    id: ingredient._id,
    averageWeight: ingredient.averageWeight,
    description: ingredient.description || null,
    heroImage,
    ingredientTheme: ingredient.theme ? String(ingredient.theme).toLowerCase() : null,
    inSeason: ingredient.inSeason || null,
    nutrition: ingredient.nutrition || null,
    title: ingredient.name,
    sticker: stickerId ? [{ id: stickerId, uid: stickerId, image: [] }] : [],
    parentIngredient,
    sponsorPanel: [],
    foodFactId: foodFactId || undefined,
    suitableDiets,
    relatedHacks,
    uid: ingredient._id,
  };
}

/**
 * Transform array of backend ingredients to legacy format
 */
export function transformIngredientsToLegacyFormat(ingredients: Ingredient[]): IIngredient[] {
  return ingredients.map(transformIngredientToLegacyFormat);
}
