import React, { useState, useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Send, MessageCircle } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { CLANS, RANKS } from '@shared/schema';
import type { ChatMessage, Character, GameState } from '@shared/schema';

interface ChatPanelProps {
  gameState: GameState;
}

export function ChatPanel({ gameState }: ChatPanelProps) {
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { character, location, chatMessages } = gameState;

  const sendMessageMutation = useMutation({
    mutationFn: async ({ locationId, characterId, message }: { locationId: number; characterId: number; message: string }) => {
      return await apiRequest('/api/chat/send', {
        method: 'POST',
        body: JSON.stringify({ locationId, characterId, message }),
      });
    },
    onSuccess: () => {
      setMessage('');
      setIsTyping(false);
      queryClient.invalidateQueries({ queryKey: ['/api/game-state'] });
    },
  });

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !character || !location) return;

    setIsTyping(true);
    sendMessageMutation.mutate({
      locationId: location.id,
      characterId: character.id,
      message: message.trim(),
    });
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('ru-RU', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getClanColor = (clan: string) => {
    switch (clan) {
      case 'thunder': return 'bg-green-500';
      case 'river': return 'bg-cyan-500';
      default: return 'bg-gray-500';
    }
  };

  const getClanEmoji = (clan: string) => {
    switch (clan) {
      case 'thunder': return '⚡';
      case 'river': return '🌊';
      default: return '🐱';
    }
  };

  if (!character || !location) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            Чат
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center text-muted-foreground">
          Выберите персонажа для участия в чате
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <MessageCircle className="w-5 h-5" />
          Чат: {location.name}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-4 space-y-4">
        {/* Messages Area */}
        <ScrollArea className="flex-1 h-64 pr-4" ref={scrollRef}>
          <div className="space-y-3">
            {chatMessages.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                Пока что никто не писал в чат этой локации
              </div>
            ) : (
              chatMessages.map((msg) => {
                // Find character info from playersInLocation
                const messageAuthor = gameState.playersInLocation.find(p => p.id === msg.characterId);
                
                return (
                  <div key={msg.id} className="flex flex-col space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant="outline" 
                        className={`${getClanColor(messageAuthor?.clan || 'neutral')} text-white px-2 py-1`}
                      >
                        {getClanEmoji(messageAuthor?.clan || 'neutral')} {messageAuthor?.name || 'Неизвестный'}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatTime(msg.createdAt)}
                      </span>
                    </div>
                    <div className="bg-muted rounded-lg p-2 ml-2">
                      <p className="text-sm">{msg.message}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>

        {/* Message Input */}
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Напишите сообщение..."
            maxLength={200}
            disabled={isTyping || sendMessageMutation.isPending}
            className="flex-1"
          />
          <Button 
            type="submit" 
            disabled={!message.trim() || isTyping || sendMessageMutation.isPending}
            size="icon"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
        
        {/* Character counter */}
        <div className="text-xs text-muted-foreground text-right">
          {message.length}/200
        </div>
      </CardContent>
    </Card>
  );
}