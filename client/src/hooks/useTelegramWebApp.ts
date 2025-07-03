import { useEffect, useState } from 'react';
import WebApp from '@twa-dev/sdk';

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
    // Initialize Web App data
    const initData = WebApp.initDataUnsafe;
    const user = initData?.user || null;
    
    setWebAppData({
      user,
      isInitialized: !!user,
      colorScheme: WebApp.colorScheme,
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

    // Listen for theme changes
    WebApp.onEvent('themeChanged', () => {
      setWebAppData(prev => ({
        ...prev,
        colorScheme: WebApp.colorScheme,
        themeParams: {
          bg_color: WebApp.themeParams.bg_color || '#ffffff',
          text_color: WebApp.themeParams.text_color || '#000000',
          hint_color: WebApp.themeParams.hint_color || '#999999',
          link_color: WebApp.themeParams.link_color || '#0088cc',
          button_color: WebApp.themeParams.button_color || '#0088cc',
          button_text_color: WebApp.themeParams.button_text_color || '#ffffff',
          secondary_bg_color: WebApp.themeParams.secondary_bg_color || '#efeff4',
        },
      }));
    });
  }, []);

  const showAlert = (message: string) => {
    WebApp.showAlert(message);
  };

  const showConfirm = (message: string, callback: (confirmed: boolean) => void) => {
    WebApp.showConfirm(message, callback);
  };

  const showPopup = (params: {
    title?: string;
    message: string;
    buttons?: Array<{
      id: string;
      type: 'default' | 'ok' | 'close' | 'cancel' | 'destructive';
      text: string;
    }>;
  }, callback?: (buttonId?: string) => void) => {
    WebApp.showPopup(params, callback);
  };

  const hapticFeedback = (type: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => {
    WebApp.HapticFeedback.impactOccurred(type);
  };

  const close = () => {
    WebApp.close();
  };

  const sendData = (data: string) => {
    WebApp.sendData(data);
  };

  const openTelegramLink = (url: string) => {
    WebApp.openTelegramLink(url);
  };

  const openLink = (url: string) => {
    WebApp.openLink(url);
  };

  return {
    ...webAppData,
    showAlert,
    showConfirm,
    showPopup,
    hapticFeedback,
    close,
    sendData,
    openTelegramLink,
    openLink,
  };
}