const SESSION_KEY = "session";

export function getSession(): string | null {
  return localStorage.getItem(SESSION_KEY);
}

export function setSession(token: string): void {
  localStorage.setItem(SESSION_KEY, token);
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
}

export async function api<T>(path: string, method: string = "GET", body?: unknown): Promise<T> {
  const headers: Record<string, string> = {};
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  const session: string | null = getSession();
  if (session !== null) {
    headers["X-Session"] = session;
  }
  const res = await fetch(`/api${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    let message = `Request ${method} ${path} failed with status ${res.status}`;
    try {
      const errBody = (await res.json()) as { error?: string };
      if (typeof errBody.error === "string") {
        message = errBody.error;
      }
    } catch {}
    throw new Error(message);
  }
  return (await res.json()) as T;
}
