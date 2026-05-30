import type { Candidate, GuidedOption, SemanticContext } from "./types";

function mockTitles(ctx: SemanticContext, option?: GuidedOption): string[] {
  if (ctx.recipientAgeGroup === "child" && ctx.productCategory === "toy") {
    return ["柔軟陪伴娃娃禮盒", "兒童 DIY 手作材料組", "故事角色扮演積木盒", "安全耐玩益智拼圖"];
  }
  if (ctx.relationshipSubType === "father" || ctx.personality === "strict") {
    return ["低調皮革收納托盤", "耐用保溫杯禮盒", "簡潔按摩靠墊", "實用日常工具組"];
  }
  if (ctx.relationship === "supervisor") {
    return ["質感茶點禮盒", "桌邊香氛擴香石", "低調生活選品組", "手沖咖啡體驗禮盒"];
  }
  if (ctx.relationship === "sibling") {
    return ["粉色療癒小物禮盒", "可愛日常化妝包", "溫暖香氛卡片組", "粉紅手作飾品組"];
  }
  return [`${option?.label ?? "貼心"}選品禮盒`, "日常可用質感小物", "安全不踩雷禮物組", "有心意生活選品"];
}

export function buildLocalMockCandidates(ctx: SemanticContext, option?: GuidedOption): Candidate[] {
  return mockTitles(ctx, option).map((title, index) => ({
    id: `mock-${index}`,
    title,
    source: "Local Mock",
    price: index % 2 === 0 ? "Mock price" : undefined,
    image: `https://placehold.co/420x320/f5f7fb/1c2430?text=${encodeURIComponent("Local Mock")}`,
    link: undefined,
    isMock: true,
    rankScore: 40 - index,
    rankReason: "本地 mock，僅用於流程展示"
  }));
}
