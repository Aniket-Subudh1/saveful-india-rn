interface IAsset {
  id: string;
  title: string;
  url: string;
  uid: string;
}

interface ICategory {
  id: string;
  title: string;
  groupHandle: string;
  groupId: string;
  uid: string;
  image?: IAsset[];
  heroImage?: IAsset[];
}

interface ISticker {
  id: string;
  uid: string;
  image: IAsset[];
}

interface ITag {
  id: string;
  title: string;
  uid: string;
}

interface ISponsor {
  id: string;
  title: string;
  sponsorLogo: IAsset[];
  sponsorLogoBlackAndWhite: IAsset[];
  broughtToYouBy: string;
  sponsorTagline: string;
}

interface ISponsorPanel {
  id: string;
  title: string;
  factOrInsight: string;
  videoSubTitle: string;
  videoThumbnail: IAsset[];
  videoTitle: string;
  sponsor: ISponsor[];
}

interface ICategories {
  categories: ICategory[];
}

interface IIngredient {
  id: string;
  averageWeight: number;
  description: string | null;
  heroImage: IAsset[];
  ingredientTheme: string | null;
  inSeason: string[] | null;
  nutrition: string | null;
  title: string;
  sticker: ISticker[];
  parentIngredient: {
    id: string;
    title: string;
  }[];
  sponsorPanel: {
    id: string;
  }[];
  // Backend integration: optional food fact reference for Ingredient
  foodFactId?: string;
  suitableDiets: {
    id: string;
  }[];
  relatedHacks: {
    id: string;
  }[];
  uid: string;
}

interface IIngredients {
  ingredientEntries: IIngredient[];
}

interface IHackOrTip {
  id: string;
  title: string;
  uid: string;
  shortDescription: string;
  description: string | null;
  hackOrTipType: 'miniHack' | 'proTip' | 'servingSuggestion';
  sponsor: ISponsor[];
  sponsorHeading: string | null;
}

interface IArticleBlockText {
  __typename: 'articleBlocks_textBlock_BlockType';
  id: string;
  text: string;
}

interface IArticleBlockImage {
  __typename: 'articleBlocks_imageBlock_BlockType';
  id: string;
  image: IAsset[];
}

interface IArticleBlockHackOrTip {
  __typename: 'articleBlocks_hackOrTipBlock_BlockType';
  id: string;
  hackOrTip: {
    id: string;
  }[];
}

interface IArticleBlockVideo {
  __typename: 'articleBlocks_videoBlock_BlockType';
  id: string;
  videoUrl: string;
  videoCaption: string;
  videoCredit: string;
  videoThumbnail: IAsset[];
}

interface IArticleBlockList {
  accordion: any;
  __typename: 'articleBlocks_listBlock_BlockType';
  id: string;
  listTitle: string;
  listItems: string[];
}

interface IArticleBlockAccordion {
  __typename: 'articleBlocks_imageDetailsBlock_BlockType';
  id: string;
  accordion: {
    id: string;
    accordionTitle: string;
    accordionText: string;
    accordionFramework: {
      id: string;
    }[];
  }[];
}

interface IArticleBlockImageDetails {
  __typename: 'articleBlocks_imageDetailsBlock_BlockType';
  id: string;
  blockImage: IAsset[];
  blockTitle: string;
  blockDescription: string;
}

interface IArticleContent {
  id: string;
  title: string;
  uid: string;
  hackCategory: ICategory[];
  thumbnailImage: IAsset[];
  shortDescription: string;
  heroImage: IAsset[];
  sponsor: ISponsor[];
  description: string | null;
  articleBlocks: (
    | IArticleBlockText
    | IArticleBlockImage
    | IArticleBlockHackOrTip
    | IArticleBlockVideo
    | IArticleBlockList
    | IArticleBlockAccordion
    | IArticleBlockImageDetails
  )[];
  videoUrl?: string;
}

interface IArticleContents {
  articleContentEntries: IArticleContent[];
}
interface IVideoContent {
  id: string;
  title: string;
  uid: string;
  hackCategory: ICategory[];
  thumbnailImage: IAsset[];
  shortDescription: string;
  videoUrl?: string;
}

interface IVideoContents {
  videoContentEntries: IVideoContent[];
}

interface IFrameworkComponentStep {
  id: string;
  stepInstructions: string;
  hackOrTip: IHackOrTip[];
  relevantIngredients: {
    id: string;
    title: string;
  }[];
  alwaysShow: boolean;
}

interface IFrameworkComponent {
  id: string;
  uid: string;
  title: string | null;
  componentInstructions: string | null;
  componentTitle: string;
  includedInVariants: ITag[];
  requiredIngredients: {
    id: string;
    recommendedIngredient: {
      id: string;
      title: string;
      averageWeight: number;
    }[];
    alternativeIngredients: {
      id: string;
      quantity: string;
      preparation: string;
      ingredient: {
        id: string;
        title: string;
        averageWeight: number;
      }[];
      alternativeOptions: ['inheritQuantity' | 'inheritPreparation'];
    }[];
    quantity: string;
    preparation: string;
  }[];
  optionalIngredients: {
    id: string;
    ingredient: {
      id: string;
      title: string;
      averageWeight: number;
    }[];
    quantity: string;
    preparation: string;
  }[];
  stronglyRecommended: ['stronglyRecommended'];
  choiceInstructions: string | null;
  buttonText: string | null;
  componentSteps: IFrameworkComponentStep[];
}

interface IFramework {
  id: string;
  slug: string;
  title: string;
  components: IFrameworkComponent[];
  shortDescription: string;
  description: string;
  heroImage: IAsset[];
  frameworkCategories: {
    id: string;
  }[];
  frameworkSponsor: ISponsor[];
  fridgeKeepTime: string;
  freezeKeepTime: string;
  hackOrTip: {
    id: string;
  }[];
  portions: string | null;
  prepAndCookTime: number | null;
  prepShortDescription: string;
  prepLongDescription: string | null;
  sticker: ISticker[];
  useLeftoversIn: {
    id: string;
  }[];
  variantTags: ITag[];
  youtubeId?: string;
}

interface IHackOrTips {
  hackOrTipEntries: IHackOrTip[];
}

interface IFrameworks {
  frameworkEntries: IFramework[];
}

interface ISponsorPanels {
  sponsorPanelEntries: ISponsorPanel[];
}

interface IChallengeBonusAchievement {
  id: string;
  achievementTitle: string;
  achievementSubTitle: string;
  achievementShortDescription: string;
  achievementDescription: string;
  achievementEarnedBadge: IAsset[];
  achievementUndearnedBadge: IAsset[];
  foodSavedTarget: number;
  achievementSocialShareImage: IAsset[];
  achievementEarnedDescription: string;
}

interface IChallenge {
  id: string;
  slug: string;
  title: string;
  uid: string;
  challengeBadge: IAsset[];
  challengeShortDescription: string;
  challengeDescription: string;
  sponsor: ISponsor[];
  termsAndConditionsLink: string;
  termsAndConditionsText: string;
  challengeCompleteDescription: string;
  challengeSocialShareImage: IAsset[];
  incompleteChallengeMessage: string;
  optInBannerMessage: string;
  optInStartDate: string;
  gracePeriodStartDate: string;
  drawStartDate: string;
  challengeEndDate: string;
  challengeDuration: number;
  numberOfCooks: number;
  bonusAchievements: IChallengeBonusAchievement[];
}

interface IChallenges {
  challengeEntries: IChallenge[];
}

export {
  IArticleBlockAccordion,
  IArticleBlockHackOrTip,
  IArticleBlockImage,
  IArticleBlockImageDetails,
  IArticleBlockList,
  IArticleBlockText,
  IArticleBlockVideo,
  IArticleContent,
  IArticleContents,
  IAsset,
  ICategories,
  ICategory,
  IChallenge,
  IChallengeBonusAchievement,
  IChallenges,
  IFramework,
  IFrameworkComponent,
  IFrameworkComponentStep,
  IFrameworks,
  IHackOrTip,
  IHackOrTips,
  IIngredient,
  IIngredients,
  ISponsor,
  ISponsorPanel,
  ISponsorPanels,
  ISticker,
  ITag,
  IVideoContent,
  IVideoContents,
};
