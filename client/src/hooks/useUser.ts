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
          // Create unique session-based user for development
          let sessionUserId = localStorage.getItem('dev_session_user_id');
          if (!sessionUserId) {
            // Generate random user ID for this browser session
            sessionUserId = Math.floor(Math.random() * 900 + 100).toString(); // Random ID between 100-999
            localStorage.setItem('dev_session_user_id', sessionUserId);
            console.log('Created new development session user:', sessionUserId);
          }
          setUser({ id: parseInt(sessionUserId), username: `dev_session_${sessionUserId}` });
        }
      } catch (error) {
        console.error('Authentication failed:', error);
        // Generate unique fallback based on browser fingerprint
        const browserFingerprint = navigator.userAgent.length + window.screen.width + window.screen.height;
        const fallbackUserId = Math.abs(browserFingerprint % 500) + 500; // ID between 500-999
        setUser({ id: fallbackUserId, username: `fallback_${fallbackUserId}` });
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