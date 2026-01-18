/**
 * Centralized API client for consistent error handling and request/response management
 */

const API_BASE_URL = '/api';
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

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
    const fullPath = `${this.baseUrl}${path}`;
    const url = new URL(fullPath, window.location.origin);

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

    // Check for empty response
    const contentLength = response.headers.get('content-length');
    if (contentLength === '0' || response.status === 204) {
      throw new ApiError('Empty response received', response.status);
    }

    // Check content type
    const contentType = response.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      const text = await response.text();
      console.error('Non-JSON response:', { contentType, status: response.status, body: text.substring(0, 200) });
      throw new ApiError(
        `Expected JSON but got ${contentType || 'unknown content type'}`,
        response.status,
        text.substring(0, 500)
      );
    }

    try {
      return await response.json();
    } catch (error) {
      const text = await response.text();
      console.error('JSON parsing failed:', { error, body: text.substring(0, 200) });
      throw new ApiError(
        `Failed to parse JSON response: ${error instanceof Error ? error.message : 'Unknown error'}`,
        response.status,
        text.substring(0, 500)
      );
    }
  }

  /**
   * Retry a request with exponential backoff
   */
  private async retryRequest<T>(
    requestFn: () => Promise<Response>,
    retries: number = MAX_RETRIES
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await requestFn();
        
        // Only retry on 5xx errors or network failures
        if (response.status >= 500 && response.status < 600 && attempt < retries) {
          console.warn(`Request failed with ${response.status}, retrying (${attempt + 1}/${retries})...`);
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * (attempt + 1)));
          continue;
        }
        
        return this.handleResponse<T>(response);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Only retry on network errors
        if (attempt < retries && (error instanceof TypeError || lastError.message.includes('fetch'))) {
          console.warn(`Network error, retrying (${attempt + 1}/${retries})...`, lastError.message);
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * (attempt + 1)));
          continue;
        }
        
        throw error;
      }
    }

    throw lastError || new Error('Request failed after retries');
  }

  /**
   * Make a GET request
   */
  async get<T>(path: string, options?: RequestOptions): Promise<T> {
    const url = this.buildUrl(path, options?.params);
    return this.retryRequest<T>(() => 
      fetch(url, {
        ...options,
        method: 'GET',
      })
    );
  }

  /**
   * Make a POST request
   */
  async post<T>(path: string, data?: unknown, options?: RequestOptions): Promise<T> {
    const url = this.buildUrl(path, options?.params);
    return this.retryRequest<T>(() =>
      fetch(url, {
        ...options,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        body: data ? JSON.stringify(data) : undefined,
      })
    );
  }

  /**
   * Make a PUT request
   */
  async put<T>(path: string, data?: unknown, options?: RequestOptions): Promise<T> {
    const url = this.buildUrl(path, options?.params);
    return this.retryRequest<T>(() =>
      fetch(url, {
        ...options,
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        body: data ? JSON.stringify(data) : undefined,
      })
    );
  }

  /**
   * Make a DELETE request
   */
  async delete<T>(path: string, options?: RequestOptions): Promise<T> {
    const url = this.buildUrl(path, options?.params);
    return this.retryRequest<T>(() =>
      fetch(url, {
        ...options,
        method: 'DELETE',
      })
    );
  }

  /**
   * Upload a file with multipart/form-data
   */
  async upload<T>(path: string, formData: FormData, options?: RequestOptions): Promise<T> {
    const url = this.buildUrl(path, options?.params);
    return this.retryRequest<T>(() =>
      fetch(url, {
        ...options,
        method: 'POST',
        body: formData,
        // Don't set Content-Type header - browser will set it with boundary
      })
    );
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Export type-safe API methods using generated types
export { API_BASE_URL };
