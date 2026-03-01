import axios from 'axios';
import EnvironmentManager from '../../environment/environmentManager';
import { Recipe, PopulatedRecipe } from '../models/recipe';

/** Simple TTL cache entry */
interface CacheEntry<T> {
  data: T;
  expiry: number;
}

class RecipeApiService {
  private normalizeSlug(value: string): string {
    return value
      .toLowerCase()
      .trim()
      .replace(/[’']/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private getBaseUrl(): string {
    return EnvironmentManager.shared.apiUrl();
  }

  // --- In-memory cache (5-minute TTL) ---
  private static CACHE_TTL = 5 * 60 * 1000;
  private cacheById = new Map<string, CacheEntry<PopulatedRecipe>>();
  private cacheBySlug = new Map<string, CacheEntry<PopulatedRecipe>>();
  private cacheAllRecipes = new Map<string, CacheEntry<Recipe[]>>();

  private isCacheValid<T>(entry: CacheEntry<T> | undefined): entry is CacheEntry<T> {
    return !!entry && Date.now() < entry.expiry;
  }

  async getAllRecipes(country?: string): Promise<Recipe[]> {
    try {
      const cacheKey = `all:${country || 'none'}`;
      const cached = this.cacheAllRecipes.get(cacheKey);
      if (this.isCacheValid(cached)) return cached.data;

      const baseUrl = this.getBaseUrl();
      const params = country ? `?country=${encodeURIComponent(country)}` : '';
      const response = await axios.get(`${baseUrl}/api/api/recipe${params}`);
      this.cacheAllRecipes.set(cacheKey, { data: response.data, expiry: Date.now() + RecipeApiService.CACHE_TTL });
      return response.data;
    } catch (error) {
      console.error('Error fetching recipes:', error);
      throw error;
    }
  }

  async getRecipeById(id: string): Promise<PopulatedRecipe> {
    try {
      const cached = this.cacheById.get(id);
      if (this.isCacheValid(cached)) return cached.data;

      const baseUrl = this.getBaseUrl();
      const response = await axios.get(`${baseUrl}/api/api/recipe/${id}`);
      const recipe = response.data;
      this.cacheById.set(id, { data: recipe, expiry: Date.now() + RecipeApiService.CACHE_TTL });
      // Also populate the slug cache
      const legacySlug = recipe.title?.toLowerCase().replace(/\s+/g, '-');
      const canonicalSlug = recipe.title ? this.normalizeSlug(recipe.title) : '';
      if (legacySlug) {
        this.cacheBySlug.set(legacySlug, {
          data: recipe,
          expiry: Date.now() + RecipeApiService.CACHE_TTL,
        });
      }
      if (canonicalSlug) {
        this.cacheBySlug.set(canonicalSlug, {
          data: recipe,
          expiry: Date.now() + RecipeApiService.CACHE_TTL,
        });
      }
      return recipe;
    } catch (error) {
      console.error(`Error fetching recipe ${id}:`, error);
      throw error;
    }
  }


  async getRecipeBySlug(slug: string, _country?: string): Promise<PopulatedRecipe | null> {
    try {
      const normalizedInputSlug = this.normalizeSlug(slug);

      // Check in-memory cache first
      const cached = this.cacheBySlug.get(slug);
      if (this.isCacheValid(cached)) return cached.data;
      const normalizedCached = this.cacheBySlug.get(normalizedInputSlug);
      if (this.isCacheValid(normalizedCached)) return normalizedCached.data;

      // Hit the dedicated slug endpoint (single DB query)
      const baseUrl = this.getBaseUrl();
      const response = await axios.get(`${baseUrl}/api/api/recipe/by-slug/${encodeURIComponent(slug)}`);
      const recipe = response.data;
      this.cacheBySlug.set(slug, { data: recipe, expiry: Date.now() + RecipeApiService.CACHE_TTL });
      this.cacheBySlug.set(normalizedInputSlug, { data: recipe, expiry: Date.now() + RecipeApiService.CACHE_TTL });
      this.cacheById.set(recipe._id || recipe.id, { data: recipe, expiry: Date.now() + RecipeApiService.CACHE_TTL });
      return recipe;
    } catch (error: any) {
      // 404 means not found — don't throw
      if (error?.response?.status === 404) {
        try {
          const recipes = await this.getAllRecipes();
          const normalizedInputSlug = this.normalizeSlug(slug);
          const matched = recipes.find(recipe => {
            const titleSlug = this.normalizeSlug(recipe.title || '');
            const legacySlug = (recipe.title || '').toLowerCase().replace(/\s+/g, '-');
            return titleSlug === normalizedInputSlug || legacySlug === slug;
          });

          if (!matched?._id) return null;

          const recipe = await this.getRecipeById(matched._id);
          this.cacheBySlug.set(slug, { data: recipe, expiry: Date.now() + RecipeApiService.CACHE_TTL });
          this.cacheBySlug.set(normalizedInputSlug, {
            data: recipe,
            expiry: Date.now() + RecipeApiService.CACHE_TTL,
          });
          return recipe;
        } catch (fallbackError) {
          console.error(`Fallback slug resolution failed for ${slug}:`, fallbackError);
          return null;
        }
      }
      console.error(`Error fetching recipe by slug ${slug}:`, error);
      throw error;
    }
  }

  async getRecipesByCategory(categoryId: string, country?: string): Promise<Recipe[]> {
    try {
      const baseUrl = this.getBaseUrl();
      const params = country ? `?country=${encodeURIComponent(country)}` : '';
      const response = await axios.get(`${baseUrl}/api/api/recipe/category/${categoryId}${params}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching recipes for category ${categoryId}:`, error);
      throw error;
    }
  }

 
  async getRecipesByIngredient(ingredientId: string, country?: string): Promise<Recipe[]> {
    try {
      const baseUrl = this.getBaseUrl();
      const params = country ? `?country=${encodeURIComponent(country)}` : '';
      const response = await axios.get(`${baseUrl}/api/api/recipe/ingredient/${ingredientId}${params}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching recipes for ingredient ${ingredientId}:`, error);
      throw error;
    }
  }

  
  async getRecipesByCategories(categoryIds: string[], country?: string): Promise<Recipe[]> {
    try {
    
      const allRecipes = await this.getAllRecipes(country);
      
      if (categoryIds.length === 0) {
        return allRecipes;
      }

      const extractId = (val: any): string => {
        if (typeof val === 'string') return val;
        if (val?.$oid) return val.$oid as string;
        if (val?._id) {
          return typeof val._id === 'string'
            ? (val._id as string)
            : (val._id?.$oid as string) || String(val._id);
        }
        const str = String(val);
        return str === '[object Object]' ? '' : str;
      };

      const filtered = allRecipes.filter(recipe =>
        Array.isArray(recipe.frameworkCategories) &&
        recipe.frameworkCategories.some(cat => {
          const catId = extractId(cat);
          return catId && categoryIds.includes(catId);
        })
      );

      if (!filtered || filtered.length === 0) {
        return allRecipes.filter(recipe => {
          if (!Array.isArray(recipe.frameworkCategories)) return false;
          for (const cat of recipe.frameworkCategories) {
            const id = extractId(cat);
            if (id && categoryIds.includes(id)) return true;
          }
          return false;
        });
      }

      return filtered;
    } catch (error) {
      console.error('Error filtering recipes by categories:', error);
      throw error;
    }
  }

 
  async scaleServings(params: {
    originalServings: number;
    desiredServings: number;
    recipeTitle?: string;
    ingredients: {
      ingredientName: string;
      originalQuantity: string;
      preparation?: string;
      ingredientId?: string;
    }[];
  }): Promise<{
    originalServings: number;
    desiredServings: number;
    scaledIngredients: {
      ingredientName: string;
      originalQuantity: string;
      scaledQuantity: string;
      ingredientId?: string;
      preparation?: string;
    }[];
    cookingNotes?: string;
  }> {
    try {
      const baseUrl = this.getBaseUrl();
      const response = await axios.post(
        `${baseUrl}/api/api/recipe/scale-servings`,
        params,
      );
      return response.data;
    } catch (error) {
      console.error('Error scaling servings:', error);
      throw error;
    }
  }
}

export const recipeApiService = new RecipeApiService();
