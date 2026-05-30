import type { Candidate, ComparisonRow, SemanticContext } from "./types";

export function buildComparison(candidates: Candidate[], ctx: SemanticContext): {
  comparisonTable: ComparisonRow[];
  comparisonSummary: string;
} {
  const rows = candidates.slice(0, 4).map((candidate, index) => ({
    item: candidate.title,
    bestFor: index === 0 ? "最接近目前方向" : ctx.emotionalTone === "practical" ? "重視實用性" : "想多比較風格",
    strength: candidate.rankReason,
    caution: candidate.price ? "可再確認尺寸、材質與退換貨" : "價格資訊不足，點進連結前要再確認"
  }));

  return {
    comparisonTable: rows,
    comparisonSummary: rows.length
      ? "我先把可用商品依資訊完整度、方向貼合度和避雷條件排序；前幾項適合優先打開比較。"
      : "目前沒有可比較的商品結果。"
  };
}
