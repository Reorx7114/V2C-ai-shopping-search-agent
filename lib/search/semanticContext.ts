import OpenAI from "openai";
import { emptySemanticContext, type ParsedIntent, type SemanticContext } from "./types";

const allowedKeys = Object.keys(emptySemanticContext) as Array<keyof SemanticContext>;

function extractNegativePreferences(input: string): string[] {
  const results = new Set<string>();
  const patterns = [/不要[^，。,.\s]+/g, /不想要[^，。,.\s]+/g, /避免[^，。,.\s]+/g, /不喜歡[^，。,.\s]+/g];
  for (const pattern of patterns) {
    for (const match of input.matchAll(pattern)) {
      results.add(match[0].trim());
    }
  }
  return Array.from(results);
}

function heuristicContext(input: string): SemanticContext {
  const text = input.toLowerCase();
  const ctx: SemanticContext = { ...emptySemanticContext, negativePreferences: extractNegativePreferences(input) };

  if (/小女生|女孩|女兒|妹妹|姊|姐|老婆|妻|女友|媽媽|母親/.test(input)) ctx.recipientGender = "female";
  if (/男生|男孩|兒子|哥哥|弟弟|老公|丈夫|男友|爸爸|父親|父/.test(input)) ctx.recipientGender = "male";
  if (/小朋友|小孩|兒童|孩子|小女生|小男生/.test(input)) ctx.recipientAgeGroup = "child";
  if (/青少年|國中|高中|teen/.test(text)) ctx.recipientAgeGroup = "teenager";
  if (/長輩|父親|爸爸|媽媽|母親|爺爺|奶奶|外公|外婆/.test(input)) ctx.recipientAgeGroup = "adult";
  if (/嬰兒|幼兒|寶寶/.test(input)) ctx.recipientAgeGroup = "toddler";
  if (/退休|老人|高齡|銀髮/.test(input)) ctx.recipientAgeGroup = "senior";

  if (/父親|爸爸|父/.test(input)) {
    ctx.relationship = "parent";
    ctx.relationshipSubType = "father";
    ctx.recipientGender = "male";
    ctx.socialPosition = "elder";
  } else if (/母親|媽媽|母/.test(input)) {
    ctx.relationship = "parent";
    ctx.relationshipSubType = "mother";
    ctx.recipientGender = "female";
    ctx.socialPosition = "elder";
  } else if (/老婆|妻子|太太/.test(input)) {
    ctx.relationship = "spouse";
    ctx.relationshipSubType = "wife";
    ctx.recipientGender = "female";
  } else if (/老公|丈夫|先生/.test(input)) {
    ctx.relationship = "spouse";
    ctx.relationshipSubType = "husband";
    ctx.recipientGender = "male";
  } else if (/女友|女朋友/.test(input)) {
    ctx.relationship = "partner";
    ctx.relationshipSubType = "girlfriend";
    ctx.recipientGender = "female";
  } else if (/男友|男朋友/.test(input)) {
    ctx.relationship = "partner";
    ctx.relationshipSubType = "boyfriend";
    ctx.recipientGender = "male";
  } else if (/妹妹/.test(input)) {
    ctx.relationship = "sibling";
    ctx.relationshipSubType = "younger_sister";
    ctx.recipientGender = "female";
  } else if (/姐姐|姊姊/.test(input)) {
    ctx.relationship = "sibling";
    ctx.relationshipSubType = "older_sister";
    ctx.recipientGender = "female";
  } else if (/哥哥/.test(input)) {
    ctx.relationship = "sibling";
    ctx.relationshipSubType = "older_brother";
    ctx.recipientGender = "male";
  } else if (/弟弟/.test(input)) {
    ctx.relationship = "sibling";
    ctx.relationshipSubType = "younger_brother";
    ctx.recipientGender = "male";
  } else if (/主管|上司|老闆/.test(input)) {
    ctx.relationship = "supervisor";
    ctx.socialPosition = /執行長|總經理|董事|高階/.test(input) ? "executive" : "supervisor";
  } else if (/同事/.test(input)) {
    ctx.relationship = "coworker";
    ctx.socialPosition = "peer";
  } else if (/自己|自用|我用/.test(input)) {
    ctx.relationship = "self";
    ctx.occasion = "self_use";
  }

  if (/生日/.test(input)) ctx.occasion = "birthday";
  else if (/週年|紀念日/.test(input)) ctx.occasion = "anniversary";
  else if (/聖誕|過年|節日|母親節|父親節/.test(input)) ctx.occasion = "holiday";
  else if (/主管|同事|客戶|職場|公司/.test(input)) ctx.occasion = "workplace_gift";
  else if (/禮物|送/.test(input) && ctx.occasion === "unknown") ctx.occasion = "casual_gift";

  if (/玩具|積木|娃娃|手作|拼圖/.test(input)) ctx.productCategory = "toy";
  else if (/包|包包|背包|提袋/.test(input)) ctx.productCategory = "bag";
  else if (/保養|乳液|精華|面膜/.test(input)) ctx.productCategory = "skincare";
  else if (/香水|香氛/.test(input)) ctx.productCategory = "fragrance";
  else if (/飾品|項鍊|耳環|手鍊/.test(input)) ctx.productCategory = "accessory";
  else if (/餅乾|甜點|食物|食品|茶|咖啡/.test(input)) ctx.productCategory = "food";
  else if (/家居|居家|杯|燈|毯/.test(input)) ctx.productCategory = "home";
  else if (/3c|科技|耳機|鍵盤|充電/.test(text)) ctx.productCategory = "tech";

  if (/頑固|嚴謹|嚴肅|嚴格/.test(input)) ctx.personality = "strict";
  else if (/保守|傳統/.test(input)) ctx.personality = "conservative";
  else if (/活潑|好玩|有趣/.test(input)) ctx.personality = "playful";
  else if (/實用|耐用/.test(input)) ctx.personality = "practical";
  else if (/時尚|流行|粉紅|可愛/.test(input)) ctx.personality = "fashionable";
  else if (/低調|不浮誇|不要浮誇|不要奢華/.test(input)) ctx.personality = "low_key";
  else if (/挑剔/.test(input)) ctx.personality = "picky";

  if (/可愛|粉紅|小女生/.test(input)) ctx.emotionalTone = "cute";
  else if (/很久沒見|心意|貼心/.test(input)) ctx.emotionalTone = "thoughtful";
  else if (/溫暖|暖/.test(input)) ctx.emotionalTone = "warm";
  else if (/實用|耐用|父親|嚴謹/.test(input)) ctx.emotionalTone = "practical";
  else if (/低調|不浮誇|不要奢華/.test(input)) ctx.emotionalTone = "low_key";
  else if (/創作|手作|想像/.test(input)) ctx.emotionalTone = "creative";
  else if (/主管|客戶/.test(input)) ctx.emotionalTone = "safe";

  return ctx;
}

function sanitizeContext(value: unknown, fallback: SemanticContext): SemanticContext {
  if (!value || typeof value !== "object") return fallback;
  const source = value as Partial<Record<keyof SemanticContext, unknown>>;
  const ctx: SemanticContext = { ...fallback };
  for (const key of allowedKeys) {
    const next = source[key];
    if (key === "negativePreferences") {
      ctx.negativePreferences = Array.isArray(next) ? next.map(String).filter(Boolean).slice(0, 8) : fallback.negativePreferences;
    } else if (typeof next === "string" && next) {
      (ctx[key] as string) = next;
    }
  }
  return ctx;
}

export async function parseIntentAndSemanticContext(input: string): Promise<{
  parsedIntent: ParsedIntent;
  semanticContext: SemanticContext;
}> {
  const fallbackContext = heuristicContext(input);
  const fallbackIntent: ParsedIntent = {
    rawNeed: input,
    normalizedNeed: input.trim(),
    giftIntent: /送|禮物|買給|幫/.test(input),
    locale: "zh-TW",
    parserSource: "heuristic"
  };

  if (!process.env.OPENAI_API_KEY) {
    return { parsedIntent: fallbackIntent, semanticContext: fallbackContext };
  }

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      response_format: { type: "json_object" },
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "You parse Taiwanese Mandarin shopping needs into JSON. Return only valid JSON with parsedIntent and semanticContext. Use only the enum values requested by the schema. Preserve user-stated negative preferences verbatim in Chinese."
        },
        {
          role: "user",
          content: `Input: ${input}\nSchema keys: parsedIntent { rawNeed, normalizedNeed, giftIntent, locale } semanticContext { recipientGender, recipientAgeGroup, relationship, relationshipSubType, socialPosition, occasion, personality, productCategory, negativePreferences, emotionalTone }`
        }
      ]
    });
    const raw = completion.choices[0]?.message.content;
    const parsed = raw ? JSON.parse(raw) : {};
    return {
      parsedIntent: {
        ...fallbackIntent,
        ...(parsed.parsedIntent ?? {}),
        rawNeed: input,
        locale: "zh-TW",
        parserSource: "openai"
      },
      semanticContext: sanitizeContext(parsed.semanticContext, fallbackContext)
    };
  } catch {
    return { parsedIntent: fallbackIntent, semanticContext: fallbackContext };
  }
}
