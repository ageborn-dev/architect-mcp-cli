import axios, { AxiosInstance, AxiosError } from "axios";

let client: AxiosInstance | null = null;

export function getServerUrl(): string {
  return process.env.ARCHITECT_SERVER || "http://localhost:3001";
}

export function createClient(): AxiosInstance {
  if (client) return client;

  client = axios.create({
    baseURL: `${getServerUrl()}/api`,
    timeout: 15000,
    headers: {
      "Content-Type": "application/json",
    },
  });

  return client;
}

export function resetClient(): void {
  client = null;
}

export async function apiGet<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
  const c = createClient();
  try {
    const res = await c.get<T>(endpoint, { params });
    return res.data;
  } catch (err) {
    throw formatError(err);
  }
}

export async function apiDelete<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
  const c = createClient();
  try {
    const res = await c.delete<T>(endpoint, { params });
    return res.data;
  } catch (err) {
    throw formatError(err);
  }
}

export async function apiPost<T>(endpoint: string, body?: Record<string, any>): Promise<T> {
  const c = createClient();
  try {
    const res = await c.post<T>(endpoint, body);
    return res.data;
  } catch (err) {
    throw formatError(err);
  }
}

function formatError(err: unknown): Error {
  if (err instanceof AxiosError) {
    if (err.code === "ECONNREFUSED" || err.code === "ECONNRESET") {
      return new Error(
        `Cannot connect to Architect server at ${getServerUrl()}.\n` +
        `Make sure the server is running or set ARCHITECT_SERVER env variable.`
      );
    }
    if (err.response) {
      const msg = err.response.data?.error || err.response.data?.message || err.message;
      return new Error(`Server error (${err.response.status}): ${msg}`);
    }
    return new Error(`Request failed: ${err.message}`);
  }
  return err instanceof Error ? err : new Error(String(err));
}

