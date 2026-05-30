import type { Candidate, GuidedOption, SemanticContext } from "./types";

function includesAny(text: string, words: string[]) {
  return words.some((word) => word && text.includes(word.toLowerCase()));
}

export function rankCandidates(candidates: Candidate[], ctx: SemanticContext, selectedOption?: GuidedOption): Candidate[] {
  const negatives = ctx.negativePreferences.map((item) => item.replace(/^不想要|^不要|^避免|^不喜歡/, "").trim().toLowerCase());
  const optionWords = [selectedOption?.label, selectedOption?.description, selectedOption?.searchQuery]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length >= 2);

  return candidates
    .map((candidate) => {
      const text = `${candidate.title} ${candidate.source}`.toLowerCase();
      let score = 50;
      const reasons: string[] = [];

      if (candidate.image) {
        score += 12;
        reasons.push("有圖片");
      }
      if (candidate.link) {
        score += 10;
        reasons.push("有查看連結");
      }
      if (candidate.price) {
        score += 8;
        reasons.push("有價格");
      }
      if (includesAny(text, optionWords.slice(0, 8))) {
        score += 14;
        reasons.push("符合所選方向");
      }
      if (negatives.length && includesAny(text, negatives)) {
        score -= 35;
        reasons.push("可能碰到排除條件");
      }
      if (ctx.emotionalTone !== "unknown" && text.includes(ctx.emotionalTone)) {
        score += 4;
      }

      return {
        ...candidate,
        rankScore: score,
        rankReason: reasons.join("、") || "基本資訊可用"
      };
    })
    .sort((a, b) => b.rankScore - a.rankScore)
    .slice(0, 8);
}
