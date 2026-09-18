import test from "node:test";
import assert from "node:assert/strict";

import { createCloudClient, createCloudSessionStore } from "../src/cloud.js";
import { createMemoryStorage } from "../src/storage.js";

test("cloud client uses the configured Supabase project and authenticated backup endpoint", async () => {
  const requests = [];
  const cloud = createCloudClient({
    url: "https://example.supabase.co",
    publishableKey: "public-key",
    fetch: async (url, options) => {
      requests.push({ url, options });
      return new Response(JSON.stringify([{ state: { version: 1, recipes: [] } }]), { status: 200 });
    },
  });

  const state = await cloud.fetchState("access-token");

  assert.deepEqual(state, { version: 1, recipes: [] });
  assert.equal(requests[0].url, "https://example.supabase.co/rest/v1/app_states?select=state");
  assert.equal(requests[0].options.headers.apikey, "public-key");
  assert.equal(requests[0].options.headers.Authorization, "Bearer access-token");
});

test("cloud client upserts the current shared account state", async () => {
  const requests = [];
  const cloud = createCloudClient({
    url: "https://example.supabase.co/",
    publishableKey: "public-key",
    fetch: async (url, options) => {
      requests.push({ url, options });
      return new Response("", { status: 201 });
    },
  });
  const state = { version: 1, recipes: [{ id: "recipe-1" }] };

  await cloud.saveState("access-token", state);

  assert.equal(requests[0].url, "https://example.supabase.co/rest/v1/app_states?on_conflict=user_id");
  assert.equal(requests[0].options.method, "POST");
  assert.equal(requests[0].options.headers.Prefer, "resolution=merge-duplicates,return=minimal");
  assert.deepEqual(JSON.parse(requests[0].options.body), { state });
});

test("cloud client signs the shared account in with email and password", async () => {
  const requests = [];
  const cloud = createCloudClient({
    url: "https://example.supabase.co",
    publishableKey: "public-key",
    fetch: async (url, options) => {
      requests.push({ url, options });
      return new Response(JSON.stringify({ access_token: "session-token", user: { id: "user-1" } }), { status: 200 });
    },
  });

  const session = await cloud.signIn("kitchen@example.com", "shared-password");

  assert.equal(session.access_token, "session-token");
  assert.equal(requests[0].url, "https://example.supabase.co/auth/v1/token?grant_type=password");
  assert.equal(requests[0].options.method, "POST");
  assert.deepEqual(JSON.parse(requests[0].options.body), { email: "kitchen@example.com", password: "shared-password" });
});

test("cloud session store restores a previously authenticated shared account", () => {
  const sessions = createCloudSessionStore(createMemoryStorage());

  sessions.save({ access_token: "saved-token", refresh_token: "refresh-token" });

  assert.deepEqual(sessions.load(), { access_token: "saved-token", refresh_token: "refresh-token" });
});

test("cloud client refreshes an expired session before the next backup", async () => {
  const cloud = createCloudClient({
    url: "https://example.supabase.co",
    publishableKey: "public-key",
    fetch: async () => new Response(JSON.stringify({ access_token: "fresh-token", refresh_token: "fresh-refresh" }), { status: 200 }),
  });

  const session = await cloud.refreshSession("expired-refresh");

  assert.equal(session.access_token, "fresh-token");
});
