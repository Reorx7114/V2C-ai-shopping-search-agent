import { NextResponse } from "next/server";
import { buildComparison } from "@/lib/search/comparison";
import { getSearchConfig } from "@/lib/search/config";
import { generateGuidedOptions, NARROWING_OPENING } from "@/lib/search/guidedOptions";
import { buildLocalMockCandidates } from "@/lib/search/mock";
import { rankCandidates } from "@/lib/search/ranking";
import { parseIntentAndSemanticContext } from "@/lib/search/semanticContext";
import { postParseSafetyCheck, preSerpSafetyCheck, safetyCheck } from "@/lib/search/safety";
import { searchSerpApi } from "@/lib/search/serp";
import type { Candidate, GuidedOption, OptionId, SearchApiResponse, SearchDebug, SearchRequest, Stage } from "@/lib/search/types";

function baseDebug(mode: SearchDebug["mode"], stage: Stage, selectedOptionId?: OptionId): SearchDebug {
  const config = getSearchConfig();
  return {
    mode,
    stage,
    serpApiCalls: 0,
    searchProvider: mode === "blocked" ? "blocked" : "none",
    selectedOptionId,
    generatedSearchQueries: [],
    useSerpEnabled: config.useSerpEnabled,
    hasSerpApiKey: config.hasSerpApiKey,
    serpRawCount: 0,
    serpMappedCount: 0,
    serpFirstRawKeys: [],
    serpDiscardReason: {}
  };
}

function blocked(reason: string, stage: Stage, selectedOptionId?: OptionId, debug?: Partial<SearchDebug>) {
  const body: SearchApiResponse = {
    mode: "blocked",
    reason,
    debug: {
      ...baseDebug("blocked", stage, selectedOptionId),
      ...debug,
      mode: "blocked",
      stage,
      selectedOptionId,
      searchProvider: "blocked"
    }
  };
  return NextResponse.json(body);
}

function fallbackNotice(reason: string): string {
  if (reason === "USE_SERP=false") return "目前未啟用真實搜尋，以下為 Local Mock 結果。";
  if (reason === "missing_key") return "尚未設定 SerpAPI key，以下為 Local Mock 結果。";
  if (reason === "mapped_zero") return "已呼叫 SerpAPI，但目前沒有成功轉成可用商品結果，以下暫時顯示 Local Mock。";
  if (reason === "api_error") return "SerpAPI 呼叫發生錯誤，以下暫時顯示 Local Mock。";
  if (reason === "raw_zero") return "SerpAPI 目前沒有回傳商品結果，以下暫時顯示 Local Mock。";
  return "以下暫時顯示 Local Mock 結果。";
}

export async function POST(request: Request) {
  const payload = (await request.json()) as SearchRequest;
  const query = payload.query ?? "";
  const stage: Stage = payload.stage ?? "narrowing";
  const selectedOptionId = payload.selectedOptionId ?? payload.selectedOption?.id;
  const preCheck = safetyCheck(query);

  if (!preCheck.ok) {
    return blocked(preCheck.reason, stage, selectedOptionId);
  }

  const { parsedIntent, semanticContext } = await parseIntentAndSemanticContext(query);
  const postCheck = postParseSafetyCheck(parsedIntent.normalizedNeed);
  const debugBase: Partial<SearchDebug> = {
    semanticContext,
    parserSource: parsedIntent.parserSource
  };

  if (!postCheck.ok) {
    return blocked(postCheck.reason, stage, selectedOptionId, debugBase);
  }

  if (stage === "narrowing" || selectedOptionId === "D") {
    const options = generateGuidedOptions(parsedIntent, semanticContext, selectedOptionId === "D" ? (payload.regenCount ?? 0) + 1 : payload.regenCount ?? 0);
    const body: SearchApiResponse = {
      mode: "narrowing",
      opening: NARROWING_OPENING,
      parsedIntent,
      semanticContext,
      options,
      debug: {
        ...baseDebug("narrowing", "narrowing", selectedOptionId),
        ...debugBase,
        fallbackReason: selectedOptionId === "D" ? "selectedOption=D: 重新整理方向，不進行商品搜尋。" : undefined
      }
    };
    return NextResponse.json(body);
  }

  const selectedOption = payload.selectedOption as GuidedOption | undefined;
  if (!selectedOption || selectedOption.id === "D" || !selectedOption.searchQuery) {
    return blocked("請先選擇 A/B/C 其中一個可搜尋方向。", stage, selectedOptionId, debugBase);
  }

  const searchQuery = selectedOption.searchQuery;
  const preSerpCheck = preSerpSafetyCheck(searchQuery);
  if (!preSerpCheck.ok) {
    return blocked(preSerpCheck.reason, stage, selectedOptionId, {
      ...debugBase,
      generatedSearchQueries: [searchQuery]
    });
  }

  const config = getSearchConfig();
  const generatedSearchQueries = [searchQuery].slice(0, 2);
  let fallbackReason: string | undefined;
  let notice: string | undefined;
  let candidates: Candidate[] = [];
  let debug: SearchDebug = {
    ...baseDebug("results", "search", selectedOption.id),
    ...debugBase,
    generatedSearchQueries,
    searchProvider: "none"
  };

  if (!config.useSerpEnabled) {
    fallbackReason = "USE_SERP=false";
  } else if (!config.serpApiKey) {
    fallbackReason = "missing_key";
  } else {
    try {
      const serp = await searchSerpApi(generatedSearchQueries[0], config.serpApiKey);
      debug = {
        ...debug,
        serpApiCalls: 1,
        searchProvider: "serpapi",
        serpRawCount: serp.debug.serpRawCount,
        serpMappedCount: serp.debug.serpMappedCount,
        serpFirstRawKeys: serp.debug.serpFirstRawKeys,
        serpDiscardReason: serp.debug.serpDiscardReason,
        firstRawResultPreview: serp.debug.firstRawResultPreview
      };
      candidates = serp.candidates;
      if (serp.debug.serpRawCount === 0) fallbackReason = "raw_zero";
      if (serp.debug.serpRawCount > 0 && serp.debug.serpMappedCount === 0) fallbackReason = "mapped_zero";
    } catch (error) {
      fallbackReason = "api_error";
      debug = {
        ...debug,
        serpApiCalls: 1,
        searchProvider: "local_mock",
        errorMessage: error instanceof Error ? error.message : "Unknown SerpAPI error"
      };
    }
  }

  if (fallbackReason) {
    notice = fallbackNotice(fallbackReason);
    candidates = buildLocalMockCandidates(semanticContext, selectedOption);
    debug = {
      ...debug,
      searchProvider: "local_mock",
      fallbackReason
    };
  }

  const ranked = rankCandidates(candidates, semanticContext, selectedOption);
  const comparison = buildComparison(ranked, semanticContext);
  const body: SearchApiResponse = {
    mode: "results",
    parsedIntent,
    semanticContext,
    candidates: ranked,
    comparisonTable: comparison.comparisonTable,
    comparisonSummary: comparison.comparisonSummary,
    notice,
    debug
  };

  return NextResponse.json(body);
}
