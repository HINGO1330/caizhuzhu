import test from "node:test";
import assert from "node:assert/strict";

import { createStepOrganizerClient } from "../src/ai.js";

test("AI step organizer sends only the raw step text with the authenticated session", async () => {
  const requests = [];
  const client = createStepOrganizerClient({
    endpoint: "https://ai.example.workers.dev/organize-steps",
    fetch: async (url, options) => {
      requests.push({ url, options });
      return new Response(JSON.stringify({ steps: ["鸡蛋打散", "热锅下油"] }), { status: 200 });
    },
  });

  const steps = await client.organize("鸡蛋打散后热锅下油", "session-token");

  assert.deepEqual(steps, ["鸡蛋打散", "热锅下油"]);
  assert.equal(requests[0].url, "https://ai.example.workers.dev/organize-steps");
  assert.equal(requests[0].options.headers.Authorization, "Bearer session-token");
  assert.deepEqual(JSON.parse(requests[0].options.body), { text: "鸡蛋打散后热锅下油" });
});

test("AI step organizer rejects empty text before making a paid request", async () => {
  const client = createStepOrganizerClient({ endpoint: "https://ai.example.workers.dev/organize-steps", fetch: async () => assert.fail("should not request") });

  await assert.rejects(() => client.organize("  ", "session-token"), /步骤原文不能为空/);
});
