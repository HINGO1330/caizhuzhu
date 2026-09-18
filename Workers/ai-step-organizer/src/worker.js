const STEP_SCHEMA = {
  type: "object",
  properties: {
    steps: { type: "array", minItems: 1, maxItems: 20, items: { type: "string" } },
  },
  required: ["steps"],
  additionalProperties: false,
};

function json(body, status, origin) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": origin, Vary: "Origin" },
  });
}

function allowedOrigin(request, env) {
  const origin = request.headers.get("Origin") ?? "";
  return origin && origin === env.ALLOWED_ORIGIN ? origin : null;
}

function cleanSteps(value) {
  return Array.isArray(value)
    ? value.map((item) => String(item ?? "").trim()).filter(Boolean).slice(0, 20)
    : [];
}

async function currentUser(request, env, fetch) {
  const authorization = request.headers.get("Authorization") ?? "";
  if (!authorization.startsWith("Bearer ")) return null;
  const response = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: env.SUPABASE_PUBLISHABLE_KEY, Authorization: authorization },
  });
  return response.ok ? response.json() : null;
}

async function withinDailyLimit(userId, env) {
  if (!env.AI_USAGE) return true;
  const key = `step-organizer:${userId}:${new Date().toISOString().slice(0, 10)}`;
  const used = Number(await env.AI_USAGE.get(key) ?? 0);
  const limit = Number(env.DAILY_LIMIT ?? 10);
  if (used >= limit) return false;
  await env.AI_USAGE.put(key, String(used + 1), { expirationTtl: 86_400 });
  return true;
}

export function createWorker({ fetch = globalThis.fetch } = {}) {
  return {
    async fetch(request, env) {
      const origin = allowedOrigin(request, env);
      if (request.method === "OPTIONS") {
        return origin
          ? new Response(null, { status: 204, headers: { "Access-Control-Allow-Origin": origin, "Access-Control-Allow-Headers": "Authorization, Content-Type", "Access-Control-Allow-Methods": "POST, OPTIONS", Vary: "Origin" } })
          : new Response(null, { status: 403 });
      }
      if (!origin) return json({ error: "不允许的来源" }, 403, env.ALLOWED_ORIGIN);
      if (request.method !== "POST" || new URL(request.url).pathname !== "/organize-steps") return json({ error: "未找到接口" }, 404, origin);

      const user = await currentUser(request, env, fetch);
      if (!user?.id) return json({ error: "请先登录共享账号" }, 401, origin);

      const body = await request.json().catch(() => null);
      const text = String(body?.text ?? "").trim();
      if (!text) return json({ error: "步骤原文不能为空" }, 400, origin);
      if (text.length > 3000) return json({ error: "步骤原文不能超过 3000 字" }, 400, origin);
      if (!await withinDailyLimit(user.id, env)) return json({ error: "今日智能整理次数已用完，请使用本地拆分或明天再试" }, 429, origin);

      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: env.OPENAI_MODEL,
          store: false,
          instructions: "你是中文家庭菜谱步骤编辑器。只将用户提供的原文整理为清晰、可执行的烹饪步骤。不得编造食材、数量、时间、温度、工具或原文未提及的事实。保留原意，合并重复表述。",
          input: text,
          max_output_tokens: 600,
          text: { format: { type: "json_schema", name: "recipe_steps", strict: true, schema: STEP_SCHEMA } },
        }),
      });
      if (!response.ok) return json({ error: "智能整理暂时不可用，请稍后重试" }, 502, origin);
      const payload = await response.json();
      let result;
      try { result = JSON.parse(payload.output_text ?? "{}"); } catch { result = {}; }
      const steps = cleanSteps(result.steps);
      return steps.length
        ? json({ steps }, 200, origin)
        : json({ error: "智能整理没有返回可用步骤" }, 502, origin);
    },
  };
}

export default createWorker();
