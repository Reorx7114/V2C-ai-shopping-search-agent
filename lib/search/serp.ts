import type { Candidate } from "./types";

export type SerpDiscardReason = Record<string, number>;

export interface SerpMappedResult {
  candidates: Candidate[];
  debug: {
    serpRawCount: number;
    serpMappedCount: number;
    serpFirstRawKeys: string[];
    serpDiscardReason: SerpDiscardReason;
    firstRawResultPreview?: unknown;
  };
}

type SerpRawItem = Record<string, unknown>;

function asText(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number") return String(value);
  return undefined;
}

function addReason(reasons: SerpDiscardReason, reason: string) {
  reasons[reason] = (reasons[reason] ?? 0) + 1;
}

function resolveLink(raw: SerpRawItem): Pick<Candidate, "link" | "linkType"> {
  const directLink = asText(raw.link);
  if (directLink) return { link: directLink, linkType: "merchant" };

  const productLink = asText(raw.product_link);
  if (productLink) return { link: productLink, linkType: "google_shopping" };

  const serpApiProductApi = asText(raw.serpapi_product_api);
  if (serpApiProductApi) return { link: serpApiProductApi, linkType: "serpapi_product_api" };

  return { linkType: "unknown" };
}

export function mapSerpShoppingResults(rawItems: unknown[]): SerpMappedResult {
  const discard: SerpDiscardReason = {};
  const candidates: Candidate[] = [];
  const items = Array.isArray(rawItems) ? rawItems : [];
  const firstRaw = items[0] as SerpRawItem | undefined;

  items.forEach((item, index) => {
    if (!item || typeof item !== "object") {
      addReason(discard, "not_object");
      return;
    }
    const raw = item as SerpRawItem;
    const title = asText(raw.title);
    const { link, linkType } = resolveLink(raw);
    const image = asText(raw.thumbnail);
    const price = asText(raw.price) ?? asText(raw.extracted_price);
    const source = asText(raw.source) ?? "Google Shopping";
    const productId = asText(raw.product_id) ?? `${index}`;

    if (!title) {
      addReason(discard, "missing_title");
      return;
    }
    if (!image && !link) {
      addReason(discard, "missing_thumbnail_and_link");
      return;
    }

    candidates.push({
      id: `serp-${productId}-${index}`,
      title,
      source,
      price,
      image,
      link,
      linkType,
      rankScore: 0,
      rankReason: "需自行確認"
    });
  });

  return {
    candidates,
    debug: {
      serpRawCount: items.length,
      serpMappedCount: candidates.length,
      serpFirstRawKeys: firstRaw ? Object.keys(firstRaw) : [],
      serpDiscardReason: discard,
      firstRawResultPreview: firstRaw
        ? {
            title: firstRaw.title,
            product_link: firstRaw.product_link,
            link: firstRaw.link,
            serpapi_product_api: firstRaw.serpapi_product_api,
            source: firstRaw.source,
            price: firstRaw.price,
            extracted_price: firstRaw.extracted_price,
            thumbnail: firstRaw.thumbnail,
            product_id: firstRaw.product_id
          }
        : undefined
    }
  };
}

export async function searchSerpApi(query: string, apiKey: string): Promise<SerpMappedResult> {
  const params = new URLSearchParams({
    engine: "google_shopping",
    q: query,
    api_key: apiKey,
    gl: "tw",
    hl: "zh-tw",
    num: "20"
  });
  const response = await fetch(`https://serpapi.com/search.json?${params.toString()}`, {
    headers: { Accept: "application/json" },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`SerpAPI HTTP ${response.status}`);
  }

  const payload = (await response.json()) as { shopping_results?: unknown[] };
  return mapSerpShoppingResults(payload.shopping_results ?? []);
}
