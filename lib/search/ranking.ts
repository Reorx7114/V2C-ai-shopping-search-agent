import type { Candidate, GuidedOption, SemanticContext } from "./types";

function includesAny(text: string, words: string[]) {
  return words.some((word) => word && text.includes(word.toLowerCase()));
}

export function rankCandidates(candidates: Candidate[], ctx: SemanticContext, selectedOption?: GuidedOption): Candidate[] {
  const negatives = ctx.negativePreferences.map((item) => item.replace(/^不想要|^不要|^避免|^不喜歡/, "").trim().toLowerCase());
  const optionWords = (selectedOption?.searchQuery ?? "")
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.replace(/^-/, ""))
    .filter((word) => word.length >= 2);

  return candidates
    .map((candidate) => {
      const text = `${candidate.title} ${candidate.source}`.toLowerCase();
      let score = 50;

      if (candidate.image) score += 8;
      if (candidate.link) score += 8;
      if (candidate.price) score += 6;
      if (includesAny(text, optionWords.slice(0, 8))) score += 18;
      if (negatives.length && includesAny(text, negatives)) score -= 50;
      if (ctx.productCategory === "toy" && includesAny(text, ["玩具", "toy", "娃娃", "diy", "兒童"])) score += 12;

      return {
        ...candidate,
        rankScore: score,
        rankReason: "需自行確認"
      };
    })
    .sort((a, b) => b.rankScore - a.rankScore)
    .slice(0, 8);
}
