function requireValue(value, label) {
  if (!value?.trim()) throw new Error(`缺少 Supabase ${label}`);
  return value.trim().replace(/\/$/, "");
}

const SESSION_KEY = "caizhuzhu.preview.cloud-session.v1";

export function createCloudSessionStore(storage = localStorage) {
  return {
    load() {
      try {
        const session = JSON.parse(storage.getItem(SESSION_KEY) ?? "null");
        return session?.access_token ? session : null;
      } catch {
        return null;
      }
    },
    save(session) {
      storage.setItem(SESSION_KEY, JSON.stringify(session));
    },
    clear() {
      storage.removeItem(SESSION_KEY);
    },
  };
}

export function createCloudClient({ url, publishableKey, fetch = globalThis.fetch }) {
  const baseURL = requireValue(url, "Project URL");
  const apiKey = requireValue(publishableKey, "publishable key");

  async function request(path, options = {}, accessToken) {
    const response = await fetch(`${baseURL}${path}`, {
      ...options,
      headers: {
        apikey: apiKey,
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...(options.headers ?? {}),
      },
    });
    if (!response.ok) throw new Error("云端服务暂时无法访问");
    return response;
  }

  return {
    async signIn(email, password) {
      const response = await request("/auth/v1/token?grant_type=password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      return response.json();
    },
    async refreshSession(refreshToken) {
      const response = await request("/auth/v1/token?grant_type=refresh_token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      return response.json();
    },
    async fetchState(accessToken) {
      const response = await request("/rest/v1/app_states?select=state", {}, accessToken);
      const rows = await response.json();
      return rows[0]?.state ?? null;
    },
    async saveState(accessToken, state) {
      await request("/rest/v1/app_states?on_conflict=user_id", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Prefer: "resolution=merge-duplicates,return=minimal",
        },
        body: JSON.stringify({ state }),
      }, accessToken);
    },
  };
}
