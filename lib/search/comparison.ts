import type { Candidate, ComparisonRow, SemanticContext } from "./types";

function bestFor(ctx: SemanticContext): string {
  if (ctx.productCategory === "toy" && ctx.recipientAgeGroup === "child") return "兒童玩具";
  if (ctx.relationship === "sibling") return "手足禮物";
  if (ctx.relationshipSubType === "father") return "父親禮物";
  if (ctx.relationship === "supervisor") return "主管禮物";
  return "需自行確認";
}

export function buildComparison(candidates: Candidate[], ctx: SemanticContext): {
  comparisonTable: ComparisonRow[];
  comparisonSummary: string;
} {
  const rows = candidates.slice(0, 4).map((candidate) => ({
    item: candidate.title,
    price: candidate.price ?? "需自行確認",
    bestFor: bestFor(ctx),
    caution: "需自行確認"
  }));

  return {
    comparisonTable: rows,
    comparisonSummary: rows.length ? "先列出前幾個商品，保留價格、情境與注意事項供你自行判斷。" : "目前沒有可比較的商品結果。"
  };
}
