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

  useEffect(() => {
    // Простая аутентификация для разработки
    setUser({ id: 1, username: 'demo_user' });
    setIsLoading(false);
  }, []);

  return {
    user,
    isLoading
  };
}