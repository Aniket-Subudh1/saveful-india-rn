import { UserRecipe } from '../models/userRecipe';
import {
  IFramework,
  IFrameworkComponent,
  IFrameworkComponentStep,
  ITag,
} from '../../../models/craft';

/**
 * Safely extract an ID from a value that may be a string ObjectId
 * or a populated object with _id.
 */
function extractId(value: any): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (value.$oid) return value.$oid;
  if (value._id) return typeof value._id === 'string' ? value._id : String(value._id);
  return String(value);
}

/**
 * Safely extract a name from a value that may be a string ObjectId,
 * a populated object with name, or a plain ingredient name.
 */
function extractName(value: any): string {
  if (!value) return '';
  if (typeof value === 'object' && value.name) return value.name;
  // If it's a plain string that doesn't look like an ObjectId, it IS the name
  if (typeof value === 'string' && !/^[0-9a-fA-F]{24}$/.test(value)) return value;
  return '';
}


export function userRecipeToFramework(recipe: UserRecipe): IFramework {
  const allVariantNames = new Set<string>();
  for (const wrapper of recipe.components) {
    for (const tag of wrapper.variantTags ?? []) {
      if (typeof tag === 'string' && tag.trim()) {
        allVariantNames.add(tag.trim());
      }
    }
    for (const comp of wrapper.component ?? []) {
      for (const iv of comp.includedInVariants ?? []) {
        if (typeof iv === 'string' && iv.trim()) {
          allVariantNames.add(iv.trim());
        }
      }
    }
  }

 
  if (allVariantNames.size === 0) {
    allVariantNames.add(recipe.title);
  }

  const variantTags: ITag[] = Array.from(allVariantNames).map((name) => {
    const safeName = (name || recipe.title || 'Default').toString().trim() || 'Default';
    const slug = safeName.toLowerCase().replace(/\s+/g, '-');
    return {
      id: `variant-${slug}`,
      title: safeName,
      uid: `variant-${slug}`,
    };
  });

  const components: IFrameworkComponent[] = recipe.components.flatMap(
    (wrapper, wrapperIndex) =>
      wrapper.component.map((comp, compIndex) => {
        const compId = `comp-${wrapperIndex}-${compIndex}`;

        let includedInVariants: ITag[];
        if ((comp.includedInVariants ?? []).length > 0) {
          includedInVariants = (comp.includedInVariants ?? []).map((name) => {
            const safeName =
              (typeof name === 'string' && name.trim())
                ? name.trim()
                : (recipe.title || 'Default');
            const slug = safeName.toLowerCase().replace(/\s+/g, '-');
            return {
              id: `variant-${slug}`,
              title: safeName,
              uid: `variant-${slug}`,
            };
          });
        } else {
          includedInVariants = [...variantTags];
        }

        const requiredIngredients = comp.requiredIngredients.map((ri, riIdx) => ({
          id: `ri-${compId}-${riIdx}`,
          recommendedIngredient: [
            {
              id: extractId(ri.recommendedIngredient),
              title: extractName(ri.recommendedIngredient),
              averageWeight: 0,
            },
          ],
          alternativeIngredients: ri.alternativeIngredients.map((ai, aiIdx) => ({
            id: `ai-${compId}-${riIdx}-${aiIdx}`,
            quantity: ai.inheritQuantity ? ri.quantity : (ai.quantity || ri.quantity),
            preparation: ai.inheritPreparation ? ri.preparation : (ai.preparation || ri.preparation),
            ingredient: [
              {
                id: extractId(ai.ingredient),
                title: extractName(ai.ingredient),
                averageWeight: 0,
              },
            ],
            alternativeOptions: [
              ...(ai.inheritQuantity ? ['inheritQuantity' as const] : []),
              ...(ai.inheritPreparation ? ['inheritPreparation' as const] : []),
            ] as ['inheritQuantity' | 'inheritPreparation'],
          })),
          quantity: ri.quantity,
          preparation: ri.preparation,
        }));

        // Convert optional ingredients
        const optionalIngredients = comp.optionalIngredients.map((oi, oiIdx) => ({
          id: `oi-${compId}-${oiIdx}`,
          ingredient: [
            {
              id: extractId(oi.ingredient),
              title: extractName(oi.ingredient),
              averageWeight: 0,
            },
          ],
          quantity: oi.quantity,
          preparation: oi.preparation,
        }));

        // Convert component steps
        const componentSteps: IFrameworkComponentStep[] = comp.componentSteps.map(
          (step, stepIdx) => ({
            id: `step-${compId}-${stepIdx}`,
            stepInstructions: step.stepInstructions,
            hackOrTip: [],
            relevantIngredients: step.relevantIngredients.map((ri) => ({
              id: typeof ri === 'string' ? ri : (ri as any)?._id || '',
              title: typeof ri === 'object' ? (ri as any)?.name || '' : '',
            })),
            alwaysShow: step.alwaysShow,
          }),
        );

        const component: IFrameworkComponent = {
          id: compId,
          uid: compId,
          title: comp.componentTitle,
          componentInstructions: comp.componentInstructions || null,
          componentTitle: comp.componentTitle,
          includedInVariants,
          requiredIngredients,
          optionalIngredients,
          stronglyRecommended: wrapper.stronglyRecommended
            ? (['stronglyRecommended'] as ['stronglyRecommended'])
            : ([] as unknown as ['stronglyRecommended']),
          choiceInstructions: wrapper.choiceInstructions || null,
          buttonText: wrapper.buttonText || null,
          componentSteps,
        };

        return component;
      }),
  );

  const framework: IFramework = {
    id: recipe._id,
    slug: recipe._id,
    title: recipe.title,
    components,
    shortDescription: recipe.shortDescription,
    description: recipe.longDescription,
    heroImage: recipe.heroImageUrl
      ? [{ id: 'hero', title: recipe.title, url: recipe.heroImageUrl, uid: 'hero' }]
      : [],
    frameworkCategories: recipe.frameworkCategories.map((id) => ({ id })),
    frameworkSponsor: [],
    fridgeKeepTime: recipe.fridgeKeepTime || '',
    freezeKeepTime: recipe.freezeKeepTime || '',
    hackOrTip: recipe.hackOrTipIds.map((id) => ({ id })),
    portions: recipe.portions || null,
    prepAndCookTime: recipe.prepCookTime || null,
    prepShortDescription: recipe.components[0]?.prepShortDescription || '',
    prepLongDescription: recipe.components[0]?.prepLongDescription || null,
    sticker: [],
    useLeftoversIn: recipe.useLeftoversIn.map((id) => ({ id })),
    variantTags,
    youtubeId: recipe.youtubeId,
  };

  return framework;
}
