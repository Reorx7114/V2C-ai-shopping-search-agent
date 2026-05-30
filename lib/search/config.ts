export function isUseSerpEnabled(value: string | undefined): boolean {
  return ["true", "1", "yes", "on"].includes((value ?? "").trim().toLowerCase());
}

export function getSearchConfig() {
  return {
    useSerpEnabled: isUseSerpEnabled(process.env.USE_SERP),
    hasSerpApiKey: Boolean(process.env.SERPAPI_API_KEY),
    serpApiKey: process.env.SERPAPI_API_KEY,
    hasOpenAiKey: Boolean(process.env.OPENAI_API_KEY)
  };
}
