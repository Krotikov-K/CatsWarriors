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
            console.log('No user data returned, using fallback');
            setUser({ id: 1, username: 'demo_user' });
          }
        } else {
          console.log('No Telegram user, using fallback for development');
          // Try to find any existing user for development
          try {
            const response = await fetch('/api/characters?userId=2');
            if (response.ok) {
              setUser({ id: 2, username: 'dev_user_2' });
            } else {
              setUser({ id: 3, username: 'dev_user_3' });
            }
          } catch {
            setUser({ id: 3, username: 'dev_user_3' });
          }
        }
      } catch (error) {
        console.error('Authentication failed:', error);
        // Try different user IDs for development based on session
        const sessionUserId = parseInt(localStorage.getItem('dev_user_id') || '2');
        localStorage.setItem('dev_user_id', sessionUserId.toString());
        setUser({ id: sessionUserId, username: `dev_user_${sessionUserId}` });
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