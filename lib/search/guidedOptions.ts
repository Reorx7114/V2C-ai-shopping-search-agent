import type { GuidedOption, OptionId, ParsedIntent, SemanticContext } from "./types";

export const NARROWING_OPENING = "根據你剛剛描述的需求，我先幫你整理幾個可能比較接近的方向。";

type Direction = {
  label: string;
  description: string;
  reason: string;
  queryTerms: string[];
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
  if (ctx.recipientAgeGroup === "child") terms.push("兒童", "安全");
  if (ctx.recipientGender === "female") terms.push("女生");
  if (ctx.recipientGender === "male") terms.push("男生");
  if (ctx.relationshipSubType === "father") terms.push("父親");
  if (ctx.relationshipSubType.includes("sister")) terms.push("姊妹");
  if (ctx.relationship === "supervisor") terms.push("主管");
  return terms;
}

function applyExclusions(ctx: SemanticContext, terms: string[]): string[] {
  const exclusions = ctx.negativePreferences.map((item) => item.replace(/^不想要|^不要|^避免|^不喜歡/, "").trim()).filter(Boolean);
  return [...terms, ...exclusions.map((item) => `-${item}`)];
}

function makeQuery(ctx: SemanticContext, directionTerms: string[]): string {
  const parts = [baseProduct(ctx), ...audienceTerms(ctx), ...directionTerms].filter(Boolean);
  return applyExclusions(ctx, parts).slice(0, 10).join(" ");
}

function childToyDirections(ctx: SemanticContext): Direction[] {
  const notRobot = hasNegative(ctx, "機器人");
  return [
    {
      label: "可愛陪伴型",
      description: "偏向柔和、親近、有陪伴感的玩具，不靠聲光機械感取勝。",
      reason: notRobot ? "你有提到不要機器人，所以這個方向避開科技造型，改用更溫和的陪伴感。" : "適合想先抓住孩子喜歡、也讓大人覺得安心的方向。",
      queryTerms: ["可愛", "陪伴", "娃娃"]
    },
    {
      label: "創作手作型",
      description: "讓小朋友可以畫、貼、拼、做出自己的小作品，互動性比較長久。",
      reason: "這類玩具不只是拆開就結束，能把注意力放在創作過程和成就感。",
      queryTerms: ["手作", "創作", "DIY"]
    },
    {
      label: "故事想像與安全耐玩",
      description: "偏向角色扮演、情境遊戲或故事組合，同時把材質、尺寸與耐用度放進篩選。",
      reason: "如果需求還很模糊，故事型玩具容易延伸玩法；安全耐玩則能降低踩雷風險。",
      queryTerms: ["故事", "想像力", "安全", "耐玩"]
    }
  ];
}

function spouseLowKeyDirections(): Direction[] {
  return [
    {
      label: "精緻不浮誇",
      description: "有儀式感，但外觀與價格感不會太張揚。",
      reason: "適合想表達心意，又不希望禮物看起來太炫耀的生日場合。",
      queryTerms: ["精緻", "低調", "生日"]
    },
    {
      label: "日常耐看型",
      description: "能常常用到、搭配壓力低，久看也不容易膩。",
      reason: "日常可用會讓禮物更自然地進入生活，而不是只在當天有存在感。",
      queryTerms: ["日常", "耐看", "質感"]
    },
    {
      label: "低調儀式感",
      description: "小而完整的心意組合，重點放在細節和被記得的感覺。",
      reason: "不走奢華路線時，細節與情緒分寸會比價格更重要。",
      queryTerms: ["儀式感", "不浮誇", "貼心"]
    },
    {
      label: "重新整理方向",
      description: "",
      reason: "",
      queryTerms: []
    }
  ];
}

function fatherStrictDirections(): Direction[] {
  return [
    {
      label: "實用耐用型",
      description: "選能被真正使用、品質穩、維護麻煩少的禮物。",
      reason: "個性嚴謹或保守的長輩，通常更容易接受功能明確的東西。",
      queryTerms: ["父親", "實用", "耐用"]
    },
    {
      label: "低調有份量",
      description: "外觀不招搖，但材質、手感或品牌可信度要站得住。",
      reason: "這能保留送禮的份量，同時避開太花俏造成的排斥感。",
      queryTerms: ["低調", "質感", "長輩"]
    },
    {
      label: "不打擾習慣",
      description: "挑不需要改變生活方式、拿到就知道怎麼用的品項。",
      reason: "頑固或嚴謹的人對新奇感未必買單，降低使用門檻會更穩。",
      queryTerms: ["容易使用", "日常", "父親節"]
    },
    {
      label: "保守安全牌",
      description: "以成熟、穩定、少踩雷為主，適合還不確定喜好時先收斂。",
      reason: "先排除太潮、太複雜或太個性的選項，可以更快逼近可送範圍。",
      queryTerms: ["成熟", "安全牌", "禮物"]
    }
  ];
}

function workplaceNotBusinessDirections(): Direction[] {
  return [
    {
      label: "穩重但不商務",
      description: "有禮貌、有分寸，但不會像辦公室用品或制式公關禮。",
      reason: "你特別排除太商務，所以重點會放在職場可接受、但仍有生活感。",
      queryTerms: ["主管", "穩重", "不商務"]
    },
    {
      label: "質感不正式",
      description: "看起來有品味，但不會讓收禮的人感到壓力。",
      reason: "主管禮物需要避免過度親密，質感和距離感要同時顧到。",
      queryTerms: ["質感", "生日", "不正式"]
    },
    {
      label: "日常可用安全禮",
      description: "偏向桌邊、居家或日常放得住的物品，降低喜好不合的風險。",
      reason: "不知道主管私下偏好時，日常可用比強烈風格更安全。",
      queryTerms: ["日常可用", "安全送禮", "主管生日"]
    },
    {
      label: "輕鬆生活感",
      description: "從放鬆、休息、品味小物切入，避開工作符號。",
      reason: "這能把禮物從上下級關係中拿出來一點，但仍保持得體。",
      queryTerms: ["生活感", "放鬆", "禮物"]
    }
  ];
}

function siblingWarmDirections(ctx: SemanticContext): Direction[] {
  return [
    {
      label: "粉色療癒小物",
      description: "從她喜歡的粉紅色切入，選可愛但不幼稚、拿到會開心的小物。",
      reason: "你提到很久沒見，顏色偏好是很好的情感入口，比泛泛的禮物更貼近她。",
      queryTerms: ["粉紅", "療癒", "女生禮物"]
    },
    {
      label: "久別重逢心意",
      description: "偏向能表達想念、關心與重新靠近的禮物，不只是好看而已。",
      reason: "這個情境的重點不是隆重，而是讓她感覺你有把她記在心上。",
      queryTerms: ["貼心", "溫暖", "姊妹禮物"]
    },
    {
      label: "可愛實用平衡",
      description: "保留粉紅與可愛感，同時挑日常能用、不容易閒置的品項。",
      reason: "如果不確定她現在的生活風格，實用性可以讓禮物更穩。",
      queryTerms: ["可愛", "實用", "粉色"]
    },
    {
      label: "小驚喜組合",
      description: "用小型組合創造打開時的驚喜感，適合補上久未見面的情緒。",
      reason: "多個小元素能比單一大物件更容易傳達「我有想過你」。",
      queryTerms: ["小禮盒", "粉紅", "驚喜"]
    }
  ];
}

function genericDirections(ctx: SemanticContext): Direction[] {
  const tone = {
    safe: "安全穩妥",
    thoughtful: "貼心有感",
    cute: "可愛療癒",
    warm: "溫暖心意",
    elegant: "優雅耐看",
    practical: "實用耐用",
    playful: "有趣互動",
    premium: "質感升級",
    low_key: "低調耐看",
    creative: "創意手作",
    unknown: "不踩雷"
  }[ctx.emotionalTone];
  return [
    {
      label: `${tone}方向`,
      description: "先以收禮者容易接受的風格收斂，避免一開始就跳到太窄的商品。",
      reason: "需求還有模糊處，先抓情緒與使用場景會比只抓關鍵字更準。",
      queryTerms: [tone, "禮物"]
    },
    {
      label: "日常可用方向",
      description: "挑能融入生活的品項，降低只被收起來的機率。",
      reason: "當偏好資訊不足時，日常使用頻率是很重要的篩選條件。",
      queryTerms: ["日常", "實用", "禮物"]
    },
    {
      label: "有心意但不冒險",
      description: "保留一點情緒與設計感，但不走太強烈個人風格。",
      reason: "這能讓禮物看起來不是隨便買，也不會太容易踩雷。",
      queryTerms: ["貼心", "安全牌", "質感"]
    },
    {
      label: "重新整理方向",
      description: "",
      reason: "",
      queryTerms: []
    }
  ];
}

function chooseDirections(ctx: SemanticContext): Direction[] {
  if (ctx.recipientAgeGroup === "child" && ctx.productCategory === "toy") return childToyDirections(ctx);
  if ((ctx.relationship === "spouse" || ctx.relationshipSubType === "wife") && hasNegative(ctx, "奢華")) return spouseLowKeyDirections();
  if (ctx.relationshipSubType === "father" || ctx.personality === "strict" || ctx.personality === "conservative") return fatherStrictDirections();
  if (ctx.relationship === "supervisor" || ctx.socialPosition === "executive") return workplaceNotBusinessDirections();
  if (ctx.relationship === "sibling" || ctx.relationshipSubType.includes("sister")) return siblingWarmDirections(ctx);
  return genericDirections(ctx);
}

function dOption(regenCount: number): GuidedOption {
  const variants = [
    {
      description: "我會換一個角度重新整理，不進行商品搜尋。",
      reason: "如果這四個方向還沒對上感覺，先重排語境比直接搜尋更有效。"
    },
    {
      description: "改用收禮者個性與場合重新排序方向，這一步不搜尋商品。",
      reason: "這次會刻意避開上一輪的表達方式，讓 A/B/C 有明顯變化。"
    },
    {
      description: "從風格、使用情境和避雷點重新組合，暫不進入搜尋。",
      reason: "當你還沒確定方向時，多一輪收斂可以減少後面商品雜訊。"
    }
  ];
  const variant = variants[regenCount % variants.length];
  return { id: "D", label: "重新整理方向", ...variant };
}

export function generateGuidedOptions(parsedIntent: ParsedIntent, ctx: SemanticContext, regenCount = 0): GuidedOption[] {
  const directions = chooseDirections(ctx);
  const offset = regenCount % Math.max(directions.length, 1);
  const rotated = [...directions.slice(offset), ...directions.slice(0, offset)];
  const ids: OptionId[] = ["A", "B", "C"];
  const options = ids.map((id, index) => {
    const direction = rotated[index] ?? directions[index] ?? genericDirections(ctx)[index];
    const occasionTerm = ctx.occasion !== "unknown" ? ctx.occasion.replace("_", " ") : "";
    return {
      id,
      label: direction.label,
      description: direction.description,
      reason: direction.reason,
      searchQuery: makeQuery(ctx, [...direction.queryTerms, occasionTerm, parsedIntent.normalizedNeed.slice(0, 30)])
    };
  });

  return [...options, dOption(regenCount)];
}
