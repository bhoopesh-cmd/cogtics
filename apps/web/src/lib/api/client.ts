interface ApiResponse<T = unknown> {
  ok: boolean;
  status: number;
  data: T;
  error?: string;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl = '') {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    method: string,
    path: string,
    options: {
      body?: unknown;
      token?: string | null;
    } = {}
  ): Promise<ApiResponse<T>> {
    const headers: Record<string, string> = {};

    // Only set Content-Type if we have a body
    if (options.body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }

    if (options.token) {
      headers['Authorization'] = `Bearer ${options.token}`;
    }

    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers,
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      });

      let data: T;
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        data = await response.json();
      } else {
        data = (await response.text()) as unknown as T;
      }

      if (!response.ok) {
        const errorData = data as { message?: string; error?: string };
        return {
          ok: false,
          status: response.status,
          data,
          error: errorData.message || errorData.error || 'Request failed',
        };
      }

      return {
        ok: true,
        status: response.status,
        data,
      };
    } catch (error) {
      return {
        ok: false,
        status: 0,
        data: null as unknown as T,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  get<T>(path: string, token?: string | null): Promise<ApiResponse<T>> {
    return this.request<T>('GET', path, { token });
  }

  post<T>(path: string, body?: unknown, token?: string | null): Promise<ApiResponse<T>> {
    return this.request<T>('POST', path, { body, token });
  }

  patch<T>(path: string, body?: unknown, token?: string | null): Promise<ApiResponse<T>> {
    return this.request<T>('PATCH', path, { body, token });
  }

  delete<T>(path: string, token?: string | null): Promise<ApiResponse<T>> {
    return this.request<T>('DELETE', path, { token });
  }
}

export const apiClient = new ApiClient();

