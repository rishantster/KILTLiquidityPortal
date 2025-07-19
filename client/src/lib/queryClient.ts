import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { safeFetch } from "./browser-compatibility";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest<T = unknown>(
  url: string,
  options?: {
    method?: string;
    data?: unknown;
  }
): Promise<T> {
  const headers: HeadersInit = options?.data ? { "Content-Type": "application/json" } : {};
  
  // Add admin token for admin routes
  if (url.includes('/api/admin/')) {
    const adminToken = localStorage.getItem('admin-token');
    if (adminToken) {
      headers.Authorization = `Bearer ${adminToken}`;
    }
  }

  try {
    const res = await safeFetch(url, {
      method: options?.method || 'GET',
      headers,
      body: options?.data ? JSON.stringify(options.data) : undefined,
      credentials: "include",
    });

    await throwIfResNotOk(res);
    return await res.json();
  } catch (error) {
    // Enhanced error handling for Replit environment
    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        console.warn('Request timed out:', url);
        throw new Error('Request timeout - please check your connection');
      }
      
      if (error.message.includes('CORS')) {
        console.warn('CORS error for:', url);
        throw new Error('Network error - please refresh the page');
      }
    }
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const headers: HeadersInit = { "Content-Type": "application/json" };
    
    // Add admin token for admin routes
    if (typeof queryKey[0] === 'string' && queryKey[0].includes('/api/admin/')) {
      const adminToken = localStorage.getItem('admin-token');
      if (adminToken) {
        headers.Authorization = `Bearer ${adminToken}`;
      }
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    try {
      const res = await fetch(queryKey[0] as string, {
        credentials: "include",
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      
      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }

      await throwIfResNotOk(res);
      return await res.json();
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        console.warn('Request timed out:', queryKey[0]);
        throw new Error('Request timeout');
      }
      throw error;
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: (failureCount, error) => {
        // Retry network errors but not other types of errors
        if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
          return failureCount < 2;
        }
        if (error instanceof Error && error.message.includes('Request timeout')) {
          return failureCount < 1;
        }
        return false;
      },
      onError: (error) => {
        // Silently handle AbortError to prevent unhandled promise rejections
        if (error instanceof Error && error.name === 'AbortError') {
          return; // Don't log abort errors
        }
        console.error('Query error:', error);
      },
    },
    mutations: {
      retry: false,
      onError: (error) => {
        // Silently handle AbortError to prevent unhandled promise rejections
        if (error instanceof Error && error.name === 'AbortError') {
          return; // Don't log abort errors
        }
        console.error('Mutation error:', error);
      },
    },
  },
});
