export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      ...options,
      credentials: 'include',
      signal: options.signal || AbortSignal.timeout(20000),
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new ApiError(0, 'Cannot reach OpsBoard. Check your connection and try again.');
  }
  if (response.status === 204) return undefined as T;
  const body = await response
    .json()
    .catch(() => ({ error: 'The server returned an unexpected response.' }));
  if (!response.ok) {
    if (response.status === 401) window.dispatchEvent(new Event('opsboard:session-expired'));
    throw new ApiError(response.status, body.error || 'Request failed.');
  }
  return body;
}
export const json = (method: string, data?: unknown): RequestInit => ({
  method,
  ...(data !== undefined ? { body: JSON.stringify(data) } : {}),
});
