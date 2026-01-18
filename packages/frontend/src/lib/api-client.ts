/**
 * Centralized API client for consistent error handling and request/response management
 */

const API_BASE_URL = '/api';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public response?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean>;
}

/**
 * Generic API client with consistent error handling
 */
class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Build URL with query parameters
   */
  private buildUrl(path: string, params?: Record<string, string | number | boolean>): string {
    const url = new URL(path, window.location.origin + this.baseUrl);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, String(value));
      });
    }

    return url.toString();
  }

  /**
   * Handle API response and parse JSON
   */
  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      let errorMessage = `Request failed: ${response.statusText}`;
      let errorData: unknown;

      try {
        errorData = await response.json();
        if (errorData && typeof errorData === 'object' && 'error' in errorData) {
          errorMessage = String(errorData.error);
        }
      } catch {
        // If JSON parsing fails, use status text
      }

      throw new ApiError(errorMessage, response.status, errorData);
    }

    return response.json();
  }

  /**
   * Make a GET request
   */
  async get<T>(path: string, options?: RequestOptions): Promise<T> {
    const url = this.buildUrl(path, options?.params);
    const response = await fetch(url, {
      ...options,
      method: 'GET',
    });
    return this.handleResponse<T>(response);
  }

  /**
   * Make a POST request
   */
  async post<T>(path: string, data?: unknown, options?: RequestOptions): Promise<T> {
    const url = this.buildUrl(path, options?.params);
    const response = await fetch(url, {
      ...options,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
    });
    return this.handleResponse<T>(response);
  }

  /**
   * Make a PUT request
   */
  async put<T>(path: string, data?: unknown, options?: RequestOptions): Promise<T> {
    const url = this.buildUrl(path, options?.params);
    const response = await fetch(url, {
      ...options,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
    });
    return this.handleResponse<T>(response);
  }

  /**
   * Make a DELETE request
   */
  async delete<T>(path: string, options?: RequestOptions): Promise<T> {
    const url = this.buildUrl(path, options?.params);
    const response = await fetch(url, {
      ...options,
      method: 'DELETE',
    });
    return this.handleResponse<T>(response);
  }

  /**
   * Upload a file with multipart/form-data
   */
  async upload<T>(path: string, formData: FormData, options?: RequestOptions): Promise<T> {
    const url = this.buildUrl(path, options?.params);
    const response = await fetch(url, {
      ...options,
      method: 'POST',
      body: formData,
      // Don't set Content-Type header - browser will set it with boundary
    });
    return this.handleResponse<T>(response);
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Export type-safe API methods using generated types
export { API_BASE_URL };
