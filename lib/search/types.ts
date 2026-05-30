export type ResponseMode = "narrowing" | "results" | "blocked";
export type Stage = "narrowing" | "search";
export type OptionId = "A" | "B" | "C" | "D";

export type RecipientGender = "male" | "female" | "neutral" | "unknown";
export type RecipientAgeGroup = "adult" | "teenager" | "child" | "toddler" | "senior" | "unknown";
export type Relationship =
  | "spouse"
  | "partner"
  | "parent"
  | "child"
  | "sibling"
  | "friend"
  | "relative"
  | "coworker"
  | "supervisor"
  | "subordinate"
  | "client"
  | "self"
  | "unknown";
export type RelationshipSubType =
  | "father"
  | "mother"
  | "wife"
  | "husband"
  | "girlfriend"
  | "boyfriend"
  | "daughter"
  | "son"
  | "older_sister"
  | "younger_sister"
  | "older_brother"
  | "younger_brother"
  | "unknown";
export type SocialPosition = "elder" | "supervisor" | "executive" | "peer" | "junior" | "new_acquaintance" | "unknown";
export type Occasion = "birthday" | "anniversary" | "holiday" | "workplace_gift" | "casual_gift" | "self_use" | "unknown";
export type Personality =
  | "strict"
  | "conservative"
  | "playful"
  | "practical"
  | "fashionable"
  | "low_key"
  | "picky"
  | "warm"
  | "unknown";
export type ProductCategory =
  | "toy"
  | "bag"
  | "beauty"
  | "skincare"
  | "fragrance"
  | "accessory"
  | "food"
  | "home"
  | "tech"
  | "unknown";
export type EmotionalTone =
  | "safe"
  | "thoughtful"
  | "cute"
  | "warm"
  | "elegant"
  | "practical"
  | "playful"
  | "premium"
  | "low_key"
  | "creative"
  | "unknown";

export interface SemanticContext {
  recipientGender: RecipientGender;
  recipientAgeGroup: RecipientAgeGroup;
  relationship: Relationship;
  relationshipSubType: RelationshipSubType;
  socialPosition: SocialPosition;
  occasion: Occasion;
  personality: Personality;
  productCategory: ProductCategory;
  negativePreferences: string[];
  emotionalTone: EmotionalTone;
}

export interface ParsedIntent {
  rawNeed: string;
  normalizedNeed: string;
  giftIntent: boolean;
  locale: "zh-TW";
  parserSource: "openai" | "heuristic";
}

export interface GuidedOption {
  id: OptionId;
  label: string;
  description: string;
  reason: string;
  searchQuery?: string;
}

export interface Candidate {
  id: string;
  title: string;
  source: string;
  price?: string;
  image?: string;
  link?: string;
  isMock?: boolean;
  rankScore: number;
  rankReason: string;
}

export interface ComparisonRow {
  item: string;
  bestFor: string;
  strength: string;
  caution: string;
}

export interface SearchDebug {
  mode: ResponseMode;
  stage: Stage;
  semanticContext?: SemanticContext;
  serpApiCalls: number;
  searchProvider: "none" | "serpapi" | "local_mock" | "blocked";
  selectedOptionId?: OptionId;
  generatedSearchQueries: string[];
  useSerpEnabled: boolean;
  hasSerpApiKey: boolean;
  parserSource?: ParsedIntent["parserSource"];
  errorMessage?: string;
  serpRawCount: number;
  serpMappedCount: number;
  serpFirstRawKeys: string[];
  serpDiscardReason: Record<string, number>;
  firstRawResultPreview?: unknown;
  fallbackReason?: string;
}

export interface SearchRequest {
  query: string;
  stage?: Stage;
  selectedOption?: GuidedOption;
  selectedOptionId?: OptionId;
  regenCount?: number;
}

export type SearchApiResponse =
  | {
      mode: "narrowing";
      opening: string;
      parsedIntent: ParsedIntent;
      semanticContext: SemanticContext;
      options: GuidedOption[];
      debug: SearchDebug;
    }
  | {
      mode: "results";
      parsedIntent: ParsedIntent;
      semanticContext: SemanticContext;
      candidates: Candidate[];
      comparisonTable: ComparisonRow[];
      comparisonSummary: string;
      notice?: string;
      debug: SearchDebug;
    }
  | {
      mode: "blocked";
      reason: string;
      debug: SearchDebug;
    };

export const emptySemanticContext: SemanticContext = {
  recipientGender: "unknown",
  recipientAgeGroup: "unknown",
  relationship: "unknown",
  relationshipSubType: "unknown",
  socialPosition: "unknown",
  occasion: "unknown",
  personality: "unknown",
  productCategory: "unknown",
  negativePreferences: [],
  emotionalTone: "unknown"
};
