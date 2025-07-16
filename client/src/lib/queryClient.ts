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

  const res = await fetch(url, {
    method: options?.method || 'GET',
    headers,
    body: options?.data ? JSON.stringify(options.data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return await res.json();
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

    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
      headers,
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
