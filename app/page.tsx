"use client";

import { useMemo, useState } from "react";
import type { GuidedOption, SearchApiResponse } from "@/lib/search/types";

function linkLabel(linkType?: string): string {
  if (linkType === "google_shopping") return "查看 Google 商品頁";
  if (linkType === "serpapi_product_api") return "查看商品資料";
  return "查看商品頁";
}

export default function Home() {
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState<SearchApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [regenCount, setRegenCount] = useState(0);
  const [status, setStatus] = useState("");
  const [debugOpen, setDebugOpen] = useState(false);

  const options = response?.mode === "narrowing" ? response.options : [];
  const debug = response?.debug;

  async function callSearch(body: Record<string, unknown>) {
    setLoading(true);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const data = (await res.json()) as SearchApiResponse;
      setResponse(data);
      return data;
    } finally {
      setLoading(false);
    }
  }

  async function startNarrowing(nextQuery = query) {
    setStatus("");
    setRegenCount(0);
    await callSearch({ query: nextQuery, stage: "narrowing", regenCount: 0 });
  }

  async function selectOption(option: GuidedOption) {
    if (option.id === "D") {
      const nextRegen = regenCount + 1;
      setRegenCount(nextRegen);
      setStatus("已重新整理方向");
      await callSearch({ query, stage: "narrowing", selectedOptionId: "D", selectedOption: option, regenCount: nextRegen });
      return;
    }
    setStatus("");
    await callSearch({ query, stage: "search", selectedOptionId: option.id, selectedOption: option, regenCount });
  }

  const debugText = useMemo(() => (debug ? JSON.stringify(debug, null, 2) : ""), [debug]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-8 md:px-8">
      <section className="mb-6">
        <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-moss">V2C Clean Build</p>
        <h1 className="text-3xl font-semibold text-ink md:text-4xl">AI Guided Commerce</h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
          先理解購物語境，再用 A/B/C/D 快速收斂；只有選 A/B/C 才會進入商品搜尋。
        </p>
      </section>

      <section className="rounded-lg border border-line bg-white p-5 shadow-soft">
        <label htmlFor="need" className="mb-3 block text-sm font-semibold text-ink">
          你的需求
        </label>
        <textarea
          id="need"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="min-h-32 w-full resize-y rounded-lg border border-line bg-mist p-4 text-base leading-7 text-ink outline-none transition focus:border-moss focus:bg-white focus:ring-4 focus:ring-moss/10"
          placeholder="例如：我想幫主管買生日禮物，但不要太商務"
        />
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={() => startNarrowing()}
            disabled={loading || !query.trim()}
            className="rounded-lg bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-moss disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "整理中..." : "幫我整理方向"}
          </button>
        </div>
      </section>

      {response?.mode === "blocked" ? (
        <section className="mt-6 rounded-lg border border-coral/30 bg-coral/10 p-5 text-coral">{response.reason}</section>
      ) : null}

      {options.length ? (
        <section className="mt-6">
          <div className="mb-4 flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-ink">方向收斂</h2>
              <p className="mt-1 text-sm text-slate-600">{response?.mode === "narrowing" ? response.opening : ""}</p>
            </div>
            {status ? <p className="text-sm font-medium text-moss">{status}</p> : null}
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {options.map((option) => (
              <button
                type="button"
                key={`${option.id}-${option.label}-${regenCount}`}
                onClick={() => selectOption(option)}
                disabled={loading}
                className="group flex min-h-64 flex-col rounded-lg border border-line bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-moss hover:shadow-soft disabled:cursor-wait disabled:opacity-70"
              >
                <div className="mb-4 flex items-center justify-between">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-mist text-sm font-bold text-ink group-hover:bg-moss group-hover:text-white">
                    {option.id}
                  </span>
                  {option.id === "D" ? <span className="text-xs font-semibold text-coral">不搜尋</span> : <span className="text-xs font-semibold text-moss">可搜尋</span>}
                </div>
                <h3 className="text-lg font-semibold text-ink">{option.label}</h3>
                <p className="mt-3 flex-1 text-sm leading-6 text-slate-600">{option.description}</p>
                <p className="mt-4 text-sm leading-6 text-slate-500">{option.reason}</p>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {response?.mode === "results" ? (
        <section className="mt-8 space-y-6">
          {response.notice ? <div className="rounded-lg border border-coral/30 bg-coral/10 p-4 text-sm font-medium text-coral">{response.notice}</div> : null}

          <div>
            <h2 className="mb-4 text-xl font-semibold text-ink">商品卡</h2>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {response.candidates.map((candidate) => (
                <article key={candidate.id} className="overflow-hidden rounded-lg border border-line bg-white shadow-sm">
                  <div className="aspect-[4/3] bg-mist">
                    {candidate.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={candidate.image} alt={candidate.title} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center px-4 text-center text-sm text-slate-500">沒有圖片</div>
                    )}
                  </div>
                  <div className="p-4">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-moss">{candidate.source}</span>
                      {candidate.isMock ? <span className="rounded-full bg-coral/10 px-2 py-1 text-xs font-semibold text-coral">Local Mock</span> : null}
                    </div>
                    <h3 className="line-clamp-3 min-h-16 text-sm font-semibold leading-5 text-ink">{candidate.title}</h3>
                    <p className="mt-3 text-sm text-slate-600">{candidate.price ?? "價格待確認"}</p>
                    {candidate.link ? (
                      <a href={candidate.link} target="_blank" rel="noreferrer" className="mt-4 inline-flex rounded-lg border border-ink px-3 py-2 text-sm font-semibold text-ink transition hover:bg-ink hover:text-white">
                        {linkLabel(candidate.linkType)}
                      </a>
                    ) : (
                      <span className="mt-4 inline-flex rounded-lg border border-line px-3 py-2 text-sm font-semibold text-slate-400">沒有連結</span>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-line bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold text-ink">比較表</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{response.comparisonSummary}</p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-line text-slate-500">
                    <th className="py-3 pr-4">商品</th>
                    <th className="py-3 pr-4">價格</th>
                    <th className="py-3 pr-4">適合情境</th>
                    <th className="py-3 pr-4">注意事項</th>
                  </tr>
                </thead>
                <tbody>
                  {response.comparisonTable.map((row) => (
                    <tr key={row.item} className="border-b border-line/70">
                      <td className="py-3 pr-4 font-medium text-ink">{row.item}</td>
                      <td className="py-3 pr-4 text-slate-600">{row.price}</td>
                      <td className="py-3 pr-4 text-slate-600">{row.bestFor}</td>
                      <td className="py-3 pr-4 text-slate-600">{row.caution}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      ) : null}

      {debug ? (
        <section className="mt-8 rounded-lg border border-line bg-white">
          <button type="button" onClick={() => setDebugOpen((value) => !value)} className="flex w-full items-center justify-between px-5 py-4 text-left font-semibold text-ink">
            Debug
            <span className="text-sm text-slate-500">{debugOpen ? "收合" : "展開"}</span>
          </button>
          {debugOpen ? <pre className="max-h-[520px] overflow-auto border-t border-line bg-slate-950 p-5 text-xs leading-5 text-slate-100">{debugText}</pre> : null}
        </section>
      ) : null}
    </main>
  );
}
