const blockedPatterns = [
  /武器|槍|爆裂物|炸藥|毒品|自殺|自殘|跟蹤|偷拍|竊聽|偽造證件/i,
  /weapon|gun|explosive|bomb|drugs|suicide|self[-\s]?harm|stalk|spy camera|fake id/i
];

export function safetyCheck(input: string): { ok: true } | { ok: false; reason: string } {
  const text = input.trim();
  if (!text) {
    return { ok: false, reason: "請先輸入想整理的購物需求。" };
  }
  if (text.length > 1200) {
    return { ok: false, reason: "需求文字太長，請先縮短到 1200 字以內。" };
  }
  if (blockedPatterns.some((pattern) => pattern.test(text))) {
    return { ok: false, reason: "這個需求可能涉及不安全或不適合協助的商品方向，因此已停止處理。" };
  }
  return { ok: true };
}

export function postParseSafetyCheck(normalizedNeed: string): { ok: true } | { ok: false; reason: string } {
  return safetyCheck(normalizedNeed);
}

export function preSerpSafetyCheck(searchQuery: string): { ok: true } | { ok: false; reason: string } {
  return safetyCheck(searchQuery);
}
