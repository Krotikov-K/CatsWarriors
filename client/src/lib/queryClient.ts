import { QueryClient } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HTTP ${res.status}: ${body}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  body?: any
): Promise<Response> {
  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  // Add Telegram WebApp init data for authentication
  if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
    const webApp = window.Telegram.WebApp;
    const initData = webApp.initData;
    if (initData) {
      (options.headers as any)['x-telegram-init-data'] = initData;
    }
  }

  // Add development user ID for testing (from URL parameter)
  if (import.meta.env.DEV && typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search);
    const devUserId = urlParams.get('userId');
    if (devUserId) {
      (options.headers as any)['x-dev-user-id'] = devUserId;
    }
  }

  // Add admin authentication for admin endpoints
  if (url.includes('/api/admin/')) {
    const isAuthenticated = localStorage.getItem("adminAuthenticated");
    if (isAuthenticated) {
      (options.headers as any)['x-admin-password'] = '3138';
      
      // Add Telegram user ID if available
      if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
        const webApp = window.Telegram.WebApp;
        const initData = webApp.initData;
        if (initData) {
          const urlParams = new URLSearchParams(initData);
          const userParam = urlParams.get('user');
          if (userParam) {
            const user = JSON.parse(userParam);
            (options.headers as any)['x-telegram-user-id'] = user.id.toString();
          }
        }
      }
    }
  }

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  await throwIfResNotOk(response);
  return response;
}

type UnauthorizedBehavior = "returnNull" | "throw";

export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => (context: { queryKey: any[] }) => Promise<T> =
  ({ on401 }) =>
  async ({ queryKey }) => {
    const [url] = queryKey;
    try {
      const options: RequestInit = {
        headers: {}
      };

      // Add Telegram WebApp init data for authentication
      if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
        const webApp = window.Telegram.WebApp;
        const initData = webApp.initData;
        if (initData) {
          (options.headers as any)['x-telegram-init-data'] = initData;
        }
      }

      // Add development user ID for testing (from URL parameter)
      if (import.meta.env.DEV && typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        const devUserId = urlParams.get('userId');
        if (devUserId) {
          (options.headers as any)['x-dev-user-id'] = devUserId;
        }
      }

      // Add admin authentication for admin endpoints
      if (url.includes('/api/admin/')) {
        const isAuthenticated = localStorage.getItem("adminAuthenticated");
        if (isAuthenticated) {
          (options.headers as any)['x-admin-password'] = '3138';
          
          // Add Telegram user ID if available
          if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
            const webApp = window.Telegram.WebApp;
            const initData = webApp.initData;
            if (initData) {
              const urlParams = new URLSearchParams(initData);
              const userParam = urlParams.get('user');
              if (userParam) {
                const user = JSON.parse(userParam);
                (options.headers as any)['x-telegram-user-id'] = user.id.toString();
              }
            }
          }
        }
      }

      const res = await fetch(url, options);
      
      if (res.status === 401) {
        if (on401 === "returnNull") {
          return null as any;
        }
        throw new Error("Unauthorized");
      }

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      }

      return res.json();
    } catch (error) {
      if (on401 === "returnNull" && error instanceof Error && error.message.includes("401")) {
        return null as any;
      }
      throw error;
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      retry: (failureCount, error) => {
        // Don't retry on 401s
        if (error instanceof Error && error.message.includes("401")) {
          return false;
        }
        return failureCount < 3;
      },
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
      refetchInterval: false,
    },
  },
});