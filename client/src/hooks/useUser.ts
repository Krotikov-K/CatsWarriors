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
  const { user: telegramUser, isInitialized } = useTelegramWebApp();
  const hasAuthenticatedRef = useRef(false);

  useEffect(() => {
    const authenticateUser = async () => {
      if (hasAuthenticatedRef.current) return;
      hasAuthenticatedRef.current = true;
      
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
          console.log('No Telegram user, using demo user for development');
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

    // In development, always authenticate after a short delay
    if (isInitialized) {
      authenticateUser();
    } else {
      // For browser development without Telegram, auto-authenticate
      setTimeout(() => {
        authenticateUser();
      }, 100);
    }
  }, [isInitialized, telegramUser]);

  return {
    user,
    isLoading
  };
}