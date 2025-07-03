import { useState, useEffect } from 'react';
import { useTelegramWebApp } from './useTelegramWebApp';
import { apiRequest } from '@/lib/queryClient';

export interface User {
  id: number;
  username: string;
  telegramId?: string;
}

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { user: telegramUser, isInitialized } = useTelegramWebApp();

  useEffect(() => {
    if (!isInitialized) return;

    const authenticateUser = async () => {
      try {
        if (telegramUser) {
          // Authenticate via Telegram
          const response = await apiRequest("POST", "/api/auth/telegram", {
            telegramUser
          });
          const data = await response.json();
          setUser(data.user);
        } else {
          // Fallback to demo user for development
          setUser({ id: 1, username: 'demo_user' });
        }
      } catch (error) {
        console.error('Authentication failed:', error);
        // Fallback to demo user
        setUser({ id: 1, username: 'demo_user' });
      } finally {
        setIsLoading(false);
      }
    };

    authenticateUser();
  }, [telegramUser, isInitialized]);

  return { user, isLoading };
}