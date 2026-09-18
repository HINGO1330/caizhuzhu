function text(value) {
  return String(value ?? "").trim();
}

export function createStepOrganizerClient({ endpoint, fetch = globalThis.fetch }) {
  const url = text(endpoint);
  return {
    async organize(rawText, accessToken) {
      const textToOrganize = text(rawText);
      if (!textToOrganize) throw new Error("步骤原文不能为空");
      if (textToOrganize.length > 3000) throw new Error("步骤原文不能超过 3000 字");
      if (!url) throw new Error("智能整理服务尚未配置");
      if (!text(accessToken)) throw new Error("请先登录共享账号后再使用智能整理");
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ text: textToOrganize }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? "智能整理暂时不可用");
      const steps = Array.isArray(payload.steps) ? payload.steps.map(text).filter(Boolean) : [];
      if (!steps.length) throw new Error("智能整理没有返回可用步骤");
      return steps;
    },
  };
}
