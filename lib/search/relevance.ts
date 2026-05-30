import type { Candidate, GuidedOption, SemanticContext } from "./types";

export interface RelevanceFilterResult {
  candidates: Candidate[];
  filteredCount: number;
  filteredReasons: Record<string, number>;
}

const childToyBlockedTerms = [
  "尿布",
  "成人",
  "內衣",
  "乳貼",
  "胸貼",
  "情趣",
  "成人用品",
  "嬰兒用品",
  "奶瓶",
  "奶嘴",
  "保養品",
  "保健",
  "3c成人配件",
  "情人用品",
  "性感"
];

const robotTerms = ["robot", "機器人", "機械人", "變形", "鋼彈", "gundam", "transformer", "變形金剛"];

function addReason(reasons: Record<string, number>, reason: string) {
  reasons[reason] = (reasons[reason] ?? 0) + 1;
}

function normalize(text: string): string {
  return text.toLowerCase();
}

function negativeTerms(ctx: SemanticContext): string[] {
  const terms = ctx.negativePreferences.flatMap((item) => {
    const cleaned = item.replace(/^不想要|^不要|^避免|^不喜歡/, "").trim();
    return cleaned ? [cleaned] : [];
  });
  if (ctx.negativePreferences.some((item) => item.includes("機器人"))) {
    terms.push(...robotTerms);
  }
  return terms;
}

function queryTerms(option?: GuidedOption): string[] {
  return (option?.searchQuery ?? "")
    .split(/\s+/)
    .map((term) => term.replace(/^-/, "").trim())
    .filter((term) => term.length >= 2);
}

function containsAny(text: string, terms: string[]): boolean {
  return terms.some((term) => text.includes(normalize(term)));
}

export function filterRelevantCandidates(
  candidates: Candidate[],
  ctx: SemanticContext,
  selectedOption?: GuidedOption
): RelevanceFilterResult {
  const reasons: Record<string, number> = {};
  const negatives = negativeTerms(ctx);
  const terms = queryTerms(selectedOption);

  const filtered = candidates.filter((candidate) => {
    const text = normalize(`${candidate.title} ${candidate.source}`);

    if (ctx.productCategory === "toy" && ctx.recipientAgeGroup === "child" && containsAny(text, childToyBlockedTerms)) {
      addReason(reasons, "child_toy_irrelevant_adult_or_baby_product");
      return false;
    }

    if (negatives.length && containsAny(text, negatives)) {
      addReason(reasons, "matches_negative_preference");
      return false;
    }

    if (ctx.productCategory === "toy" && terms.length) {
      const hasToySignal = containsAny(text, ["玩具", "toy", "娃娃", "手作", "diy", "扮家家酒", "故事", "角色", "兒童", "女孩"]);
      const hasQuerySignal = containsAny(text, terms.slice(0, 8));
      if (!hasToySignal && !hasQuerySignal) {
        addReason(reasons, "missing_toy_or_query_signal");
        return false;
      }
    }

    return true;
  });

  return {
    candidates: filtered,
    filteredCount: candidates.length - filtered.length,
    filteredReasons: reasons
  };
}
