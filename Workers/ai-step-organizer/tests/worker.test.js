import test from "node:test";
import assert from "node:assert/strict";

import { createWorker } from "../src/worker.js";

const env = {
  ALLOWED_ORIGIN: "https://hingo1330.github.io",
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_PUBLISHABLE_KEY: "public-key",
  OPENAI_API_KEY: "secret-key",
  OPENAI_MODEL: "small-text-model",
  DAILY_LIMIT: "10",
};

test("worker rejects an unauthenticated AI request before contacting an AI provider", async () => {
  const calls = [];
  const worker = createWorker({ fetch: async (...args) => { calls.push(args); return new Response("unexpected"); } });

  const response = await worker.fetch(new Request("https://worker.example/organize-steps", {
    method: "POST", headers: { Origin: env.ALLOWED_ORIGIN, "Content-Type": "application/json" }, body: JSON.stringify({ text: "鸡蛋打散" }),
  }), env);

  assert.equal(response.status, 401);
  assert.equal(calls.length, 0);
});

test("worker verifies the shared account and returns only structured recipe steps", async () => {
  const calls = [];
  const worker = createWorker({
    fetch: async (url, options) => {
      calls.push({ url, options });
      if (url === "https://example.supabase.co/auth/v1/user") return new Response(JSON.stringify({ id: "shared-user" }), { status: 200 });
      return new Response(JSON.stringify({ output_text: JSON.stringify({ steps: ["鸡蛋打散", "热锅下油翻炒"] }) }), { status: 200 });
    },
  });
  const response = await worker.fetch(new Request("https://worker.example/organize-steps", {
    method: "POST",
    headers: { Origin: env.ALLOWED_ORIGIN, Authorization: "Bearer access-token", "Content-Type": "application/json" },
    body: JSON.stringify({ text: "鸡蛋打散后热锅下油翻炒" }),
  }), env);

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { steps: ["鸡蛋打散", "热锅下油翻炒"] });
  const openAIRequest = calls[1];
  assert.equal(openAIRequest.url, "https://api.openai.com/v1/responses");
  assert.equal(JSON.parse(openAIRequest.options.body).store, false);
});
