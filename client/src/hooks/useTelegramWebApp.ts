import { useState, useEffect } from 'react';

declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        initDataUnsafe: {
          user?: TelegramUser;
        };
        colorScheme: 'light' | 'dark';
        themeParams: {
          bg_color?: string;
          text_color?: string;
          hint_color?: string;
          link_color?: string;
          button_color?: string;
          button_text_color?: string;
          secondary_bg_color?: string;
        };
        HapticFeedback: {
          impactOccurred: (style: 'light' | 'medium' | 'heavy') => void;
        };
        onEvent: (eventType: string, callback: () => void) => void;
      };
    };
  }
}

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  photo_url?: string;
}

export interface TelegramWebAppData {
  user: TelegramUser | null;
  isInitialized: boolean;
  colorScheme: 'light' | 'dark';
  themeParams: {
    bg_color: string;
    text_color: string;
    hint_color: string;
    link_color: string;
    button_color: string;
    button_text_color: string;
    secondary_bg_color: string;
  };
}

export function useTelegramWebApp() {
  const [webAppData, setWebAppData] = useState<TelegramWebAppData>({
    user: null,
    isInitialized: false,
    colorScheme: 'light',
    themeParams: {
      bg_color: '#ffffff',
      text_color: '#000000',
      hint_color: '#999999',
      link_color: '#0088cc',
      button_color: '#0088cc',
      button_text_color: '#ffffff',
      secondary_bg_color: '#efeff4',
    },
  });

  useEffect(() => {
    try {
      const WebApp = window.Telegram?.WebApp;
      
      if (WebApp) {
        // Initialize Web App data
        const initData = WebApp.initDataUnsafe;
        const user = initData?.user || null;
        
        setWebAppData({
          user,
          isInitialized: true,
          colorScheme: WebApp.colorScheme || 'light',
          themeParams: {
            bg_color: WebApp.themeParams.bg_color || '#ffffff',
            text_color: WebApp.themeParams.text_color || '#000000',
            hint_color: WebApp.themeParams.hint_color || '#999999',
            link_color: WebApp.themeParams.link_color || '#0088cc',
            button_color: WebApp.themeParams.button_color || '#0088cc',
            button_text_color: WebApp.themeParams.button_text_color || '#ffffff',
            secondary_bg_color: WebApp.themeParams.secondary_bg_color || '#efeff4',
          },
        });
      } else {
        // For development/testing - always initialize
        console.log('Telegram Web App not available, initializing in development mode');
        setWebAppData(prev => ({
          ...prev,
          isInitialized: true
        }));
      }
    } catch (error) {
      console.log('Error initializing Telegram Web App, using development mode');
      // For development/testing - always initialize
      setWebAppData(prev => ({
        ...prev,
        isInitialized: true
      }));
    }
  }, []);

  const hapticFeedback = (style: 'light' | 'medium' | 'heavy') => {
    const WebApp = window.Telegram?.WebApp;
    if (WebApp?.HapticFeedback) {
      WebApp.HapticFeedback.impactOccurred(style);
    }
  };

  return {
    ...webAppData,
    hapticFeedback,
  };
}