import { QueryClient, QueryFunction } from "@tanstack/react-query";

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
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      if (!controller.signal.aborted) {
        controller.abort();
      }
    }, 30000); // 30 second timeout for position loading

    const res = await fetch(url, {
      method: options?.method || 'GET',
      headers,
      body: options?.data ? JSON.stringify(options.data) : undefined,
      credentials: "include",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    await throwIfResNotOk(res);
    return await res.json();
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn('Request timed out:', url);
      throw new Error('Request timeout');
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
    const timeoutId = setTimeout(() => {
      if (!controller.signal.aborted) {
        controller.abort();
      }
    }, 15000); // 15 second timeout for query functions

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
        // Don't throw for program-analytics timeouts, return fallback data
        if (typeof queryKey[0] === 'string' && queryKey[0].includes('program-analytics')) {
          return {
            totalLiquidity: 0,
            participantCount: 0,
            averageAPR: 0,
            totalRewardsDistributed: 0
          };
        }
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
      staleTime: 1000 * 60 * 2, // 2 minutes - more aggressive caching
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

    },
    mutations: {
      retry: false,

    },
  },
});
