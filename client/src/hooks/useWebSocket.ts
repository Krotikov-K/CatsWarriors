import { useEffect, useState, useRef } from "react";
import { type WebSocketMessage } from "@shared/schema";

export function useWebSocket(characterId: number | null) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const ws = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = () => {
    if (!characterId) return;

    try {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      // В Replit используем тот же хост, что и для HTTP
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      console.log('Connecting to WebSocket:', wsUrl);
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        setIsConnected(true);
        reconnectAttempts.current = 0;
        
        // Authenticate with character ID
        if (ws.current && characterId) {
          ws.current.send(JSON.stringify({
            type: 'auth',
            data: { characterId },
            timestamp: new Date().toISOString()
          }));
        }
      };

      ws.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          setLastMessage(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.current.onclose = () => {
        setIsConnected(false);
        
        // Attempt to reconnect
        if (reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++;
          setTimeout(() => {
            connect();
          }, Math.pow(2, reconnectAttempts.current) * 1000); // Exponential backoff
        }
      };

      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
    }
  };

  useEffect(() => {
    if (characterId) {
      connect();
    }

    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [characterId]);

  // Heartbeat to keep connection alive
  useEffect(() => {
    if (!isConnected) return;

    const heartbeat = setInterval(() => {
      if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify({
          type: 'heartbeat',
          data: {},
          timestamp: new Date().toISOString()
        }));
      }
    }, 30000); // Send heartbeat every 30 seconds

    return () => clearInterval(heartbeat);
  }, [isConnected]);

  const sendMessage = (message: WebSocketMessage) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected');
    }
  };

  return {
    isConnected,
    lastMessage,
    sendMessage
  };
}