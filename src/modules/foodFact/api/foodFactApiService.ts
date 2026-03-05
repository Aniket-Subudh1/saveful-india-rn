import axios from 'axios';
import EnvironmentManager from '../../environment/environmentManager';

export interface FoodFactApiModel {
  _id: string;
  title: string;
  sponsor?: string | { _id: string; title: string; logo?: string };
  relatedIngredient?: string | { _id: string; name: string };
  factOrInsight?: string;
}

class FoodFactApiService {
  private getBaseUrl(): string {
    return EnvironmentManager.shared.apiUrl();
  }

  async getAllFoodFacts(): Promise<FoodFactApiModel[]> {
    const baseUrl = this.getBaseUrl();
    const response = await axios.get(`${baseUrl}/api/food-facts`);
    return response.data;
  }

  async getFoodFactById(id: string): Promise<FoodFactApiModel | null> {
    try {
      const baseUrl = this.getBaseUrl();
      const response = await axios.get(`${baseUrl}/api/food-facts/${id}`);
      return response.data;
    } catch {
      return null;
    }
  }

  async getFoodFactForIngredient(ingredientId: string): Promise<FoodFactApiModel | null> {
    const all = await this.getAllFoodFacts();
    const match = all.find(ff => {
      const rel = ff.relatedIngredient as any;
      const id = typeof rel === 'object' ? rel?._id : rel;
      return id === ingredientId;
    });
    return match ?? null;
  }
}

export const foodFactApiService = new FoodFactApiService();
