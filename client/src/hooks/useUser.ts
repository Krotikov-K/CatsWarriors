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
  const authAttempted = useRef(false);

  useEffect(() => {
    const authenticateUser = async () => {
      if (!isInitialized || authAttempted.current) return;
      
      authAttempted.current = true;
      
      try {
        if (telegramUser?.id) {
          console.log('Authenticating Telegram user:', telegramUser.id);
          // Authenticate via Telegram
          const response = await apiRequest('POST', '/api/auth/telegram', {
            telegramUser
          });
          const data = await response.json();
          
          if (data.user) {
            console.log('Authentication successful, user:', data.user);
            setUser(data.user);
          } else {
            console.log('No user data returned from Telegram auth');
            // Create unique fallback based on Telegram ID if available
            const fallbackId = Math.abs(telegramUser.id % 1000) + 1000; // Generate unique ID from Telegram ID
            setUser({ id: fallbackId, username: `telegram_${telegramUser.id}` });
          }
        } else {
          console.log('No Telegram user detected, using development mode');
          // Use default user ID 1 for development (Кисяо)
          setUser({ id: 1, username: 'dev_user_kisyao' });
        }
      } catch (error) {
        console.error('Authentication failed:', error);
        // Use default user ID 1 for development fallback
        setUser({ id: 1, username: 'dev_user_kisyao' });
      } finally {
        setIsLoading(false);
      }
    };

    authenticateUser();
  }, [isInitialized, telegramUser]);

  return {
    user,
    isLoading
  };
}