import { useState, useEffect, useRef } from 'react';
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
  const { user: telegramUser, isReady } = useTelegramWebApp();
  const authAttempted = useRef(false);

  useEffect(() => {
    const authenticateUser = async () => {
      if (!isReady || authAttempted.current) return;
      
      authAttempted.current = true;
      
      try {
        if (telegramUser) {
          // Authenticate via Telegram
          const response = await apiRequest('POST', '/api/auth/telegram', {
            telegramUser
          });
          const data = await response.json();
          
          if (data.user) {
            setUser(data.user);
          } else {
            // Fallback for development
            setUser({ id: 1, username: 'demo_user' });
          }
        } else {
          // Fallback for development without Telegram
          setUser({ id: 1, username: 'demo_user' });
        }
      } catch (error) {
        console.error('Authentication failed:', error);
        // Fallback for development
        setUser({ id: 1, username: 'demo_user' });
      } finally {
        setIsLoading(false);
      }
    };

    authenticateUser();
  }, [isReady, telegramUser]);

  return {
    user,
    isLoading
  };
}