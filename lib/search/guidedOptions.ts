import type { GuidedOption, OptionId, ParsedIntent, SemanticContext } from "./types";

export const NARROWING_OPENING = "根據你剛剛描述的需求，我先幫你整理幾個可能比較接近的方向。";

type Direction = {
  description: string;
  reason: string;
  queryTerms: string[];
};

const OPTION_LABELS: Record<OptionId, string> = {
  A: "選項 A",
  B: "選項 B",
  C: "選項 C",
  D: "選項 D：重新整理方向"
};

function hasNegative(ctx: SemanticContext, keyword: string): boolean {
  return ctx.negativePreferences.some((item) => item.includes(keyword));
}

function baseProduct(ctx: SemanticContext): string {
  const map: Record<string, string> = {
    toy: "禮物 玩具",
    bag: "禮物 包包",
    beauty: "美妝 禮物",
    skincare: "保養品 禮物",
    fragrance: "香氛 禮物",
    accessory: "飾品 禮物",
    food: "點心 禮盒",
    home: "居家 禮物",
    tech: "實用 3C 禮物",
    unknown: "禮物"
  };
  return map[ctx.productCategory] ?? "禮物";
}

function audienceTerms(ctx: SemanticContext): string[] {
  const terms: string[] = [];
  if (ctx.recipientAgeGroup === "child") terms.push("兒童");
  if (ctx.recipientGender === "female") terms.push("女生");
  if (ctx.recipientGender === "male") terms.push("男生");
  if (ctx.relationshipSubType === "father") terms.push("父親");
  if (ctx.relationshipSubType.includes("sister")) terms.push("姊妹");
  if (ctx.relationship === "supervisor") terms.push("主管");
  return terms;
}

function applyExclusions(ctx: SemanticContext, terms: string[]): string[] {
  const exclusions = ctx.negativePreferences
    .map((item) => item.replace(/^不想要|^不要|^避免|^不喜歡/, "").trim())
    .filter(Boolean);
  return [...terms, ...exclusions.map((item) => `-${item}`)];
}

function makeQuery(ctx: SemanticContext, directionTerms: string[]): string {
  const parts = [baseProduct(ctx), ...audienceTerms(ctx), ...directionTerms].filter(Boolean);
  return applyExclusions(ctx, parts).slice(0, 10).join(" ");
}

function childToyDirections(ctx: SemanticContext): Direction[] {
  const robotNote = hasNegative(ctx, "機器人") ? "，並排除機器人類商品" : "";
  return [
    {
      description: `這組會先找偏可愛、陪伴型的玩具${robotNote}。`,
      reason: "搜尋會偏向娃娃、玩偶、陪伴互動類商品。",
      queryTerms: ["可愛", "陪伴", "娃娃", "女孩"]
    },
    {
      description: `這組會先找偏手作、創作型的玩具${robotNote}。`,
      reason: "搜尋會偏向 DIY、畫畫、拼貼、材料組類商品。",
      queryTerms: ["DIY", "手作", "創作", "女孩"]
    },
    {
      description: `這組會先找偏故事、角色扮演型的玩具${robotNote}。`,
      reason: "搜尋會偏向扮家家酒、故事組合、角色遊戲類商品。",
      queryTerms: ["故事", "扮家家酒", "角色", "女孩"]
    }
  ];
}

function siblingGiftDirections(ctx: SemanticContext): Direction[] {
  const color = /粉紅|粉色|pink/i.test(ctx.negativePreferences.join(" ")) ? "粉色" : "粉色";
  return [
    {
      description: `這組會先找偏${color}小物的商品。`,
      reason: "搜尋會偏向顏色明確、體積較小的禮物品項。",
      queryTerms: ["粉紅", "小物", "禮物"]
    },
    {
      description: "這組會先找偏配件類的商品。",
      reason: "搜尋會偏向飾品、化妝包、日常配件類商品。",
      queryTerms: ["配件", "飾品", "化妝包", "粉色"]
    },
    {
      description: "這組會先找偏日常可使用的商品。",
      reason: "搜尋會偏向杯子、收納、居家小物等生活用品。",
      queryTerms: ["日常", "實用", "粉紅", "禮物"]
    }
  ];
}

function fatherDirections(): Direction[] {
  return [
    {
      description: "這組會先找偏日常使用的商品。",
      reason: "搜尋會偏向杯具、收納、生活用品等常用類型。",
      queryTerms: ["父親", "日常", "實用"]
    },
    {
      description: "這組會先找偏耐用材質的商品。",
      reason: "搜尋會偏向皮革、金屬、保溫、工具類商品。",
      queryTerms: ["父親", "耐用", "材質"]
    },
    {
      description: "這組會先找偏不需複雜設定的商品。",
      reason: "搜尋會偏向拿到即可使用、操作簡單的品項。",
      queryTerms: ["父親", "簡單使用", "禮物"]
    }
  ];
}

function supervisorDirections(): Direction[] {
  return [
    {
      description: "這組會先找偏食品、茶點類的商品。",
      reason: "搜尋會偏向禮盒、茶、咖啡、點心等品項。",
      queryTerms: ["主管", "生日", "茶點", "禮盒"]
    },
    {
      description: "這組會先找偏桌邊或居家小物的商品。",
      reason: "搜尋會偏向桌上用品、擺放型、生活小物等品項。",
      queryTerms: ["主管", "生活小物", "生日"]
    },
    {
      description: "這組會先找偏放鬆、休息情境的商品。",
      reason: "搜尋會偏向香氛、按摩、咖啡茶飲等非商務品項。",
      queryTerms: ["主管", "放鬆", "不商務", "禮物"]
    }
  ];
}

function genericDirections(ctx: SemanticContext): Direction[] {
  const product = baseProduct(ctx);
  return [
    {
      description: "這組會先找比較接近第一種可能方向的商品。",
      reason: `搜尋會以「${product}」加上收禮對象線索作為主軸。`,
      queryTerms: ["禮物", "常見品項"]
    },
    {
      description: "這組會改用另一種角度搜尋，讓結果有明顯差異。",
      reason: "搜尋會換成不同商品群，避免只看到同一類結果。",
      queryTerms: ["不同類型", "禮物"]
    },
    {
      description: "這組會避開前兩組方向，嘗試找不同類型的商品。",
      reason: "搜尋會偏向替代品項，讓使用者用商品結果自行判斷。",
      queryTerms: ["替代", "選物", "禮物"]
    }
  ];
}

function chooseDirections(ctx: SemanticContext): Direction[] {
  if (ctx.recipientAgeGroup === "child" && ctx.productCategory === "toy") return childToyDirections(ctx);
  if (ctx.relationship === "sibling" || ctx.relationshipSubType.includes("sister")) return siblingGiftDirections(ctx);
  if (ctx.relationshipSubType === "father" || ctx.personality === "strict" || ctx.personality === "conservative") return fatherDirections();
  if (ctx.relationship === "supervisor" || ctx.socialPosition === "executive") return supervisorDirections();
  return genericDirections(ctx);
}

function dOption(): GuidedOption {
  return {
    id: "D",
    label: OPTION_LABELS.D,
    description: "如果都不太像，可以重新整理方向或換個描述方式試試看。",
    reason: "這個選項只會重新產生方向，不會搜尋商品。"
  };
}

export function generateGuidedOptions(parsedIntent: ParsedIntent, ctx: SemanticContext, regenCount = 0): GuidedOption[] {
  const directions = chooseDirections(ctx);
  const offset = regenCount % Math.max(directions.length, 1);
  const rotated = [...directions.slice(offset), ...directions.slice(0, offset)];
  const ids: OptionId[] = ["A", "B", "C"];
  const options = ids.map((id, index) => {
    const direction = rotated[index] ?? genericDirections(ctx)[index];
    const occasionTerm = ctx.occasion !== "unknown" ? ctx.occasion.replace("_", " ") : "";
    return {
      id,
      label: OPTION_LABELS[id],
      description: direction.description,
      reason: direction.reason,
      searchQuery: makeQuery(ctx, [...direction.queryTerms, occasionTerm, parsedIntent.normalizedNeed.slice(0, 30)])
    };
  });

  return [...options, dOption()];
}
