import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { messagesService, InterventionMessage } from '@/services/messages/messages.service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Send, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface InterventionChatProps {
  interventionId: string;
  userId: string;
  userRole: 'technician' | 'client';
}

export function InterventionChat({ interventionId, userId, userRole }: InterventionChatProps) {
  const [messages, setMessages] = useState<InterventionMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchMessages = async () => {
    try {
      const data = await messagesService.getMessages(interventionId);
      setMessages(data);
      // Mark messages as read
      await messagesService.markAsRead(interventionId, userId);
    } catch (err) {
      console.error('Error fetching messages:', err);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, [interventionId, userId]);

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel(`messages-${interventionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'intervention_messages',
          filter: `intervention_id=eq.${interventionId}`,
        },
        (payload) => {
          const newMsg = payload.new as {
            id: string;
            intervention_id: string;
            sender_id: string;
            sender_role: string;
            message: string;
            is_read: boolean;
            created_at: string;
          };
          setMessages((prev) => [
            ...prev,
            {
              id: newMsg.id,
              interventionId: newMsg.intervention_id,
              senderId: newMsg.sender_id,
              senderRole: newMsg.sender_role as 'technician' | 'client',
              message: newMsg.message,
              isRead: newMsg.is_read,
              createdAt: newMsg.created_at,
            },
          ]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [interventionId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim()) return;

    setIsSending(true);
    try {
      await messagesService.sendMessage({
        interventionId,
        senderId: userId,
        senderRole: userRole,
        message: newMessage.trim(),
      });
      setNewMessage('');
    } catch (err) {
      console.error('Error sending message:', err);
      toast.error('Erreur lors de l\'envoi du message');
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Card className="flex flex-col h-[400px]">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          Messages avec le client
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-0">
        <ScrollArea ref={scrollRef} className="flex-1 px-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <MessageSquare className="h-8 w-8 mb-2" />
              <p className="text-sm">Aucun message</p>
              <p className="text-xs">Commencez la conversation</p>
            </div>
          ) : (
            <div className="space-y-3 py-4">
              {messages.map((msg) => {
                const isOwn = msg.senderId === userId;
                return (
                  <div
                    key={msg.id}
                    className={cn(
                      'flex items-end gap-2',
                      isOwn ? 'justify-end' : 'justify-start'
                    )}
                  >
                    {!isOwn && (
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs">
                          {msg.senderRole === 'client' ? 'CL' : 'TE'}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div
                      className={cn(
                        'max-w-[70%] rounded-lg px-3 py-2 text-sm',
                        isOwn
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      )}
                    >
                      <p>{msg.message}</p>
                      <p
                        className={cn(
                          'text-xs mt-1',
                          isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'
                        )}
                      >
                        {new Date(msg.createdAt).toLocaleTimeString('fr-FR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    {isOwn && (
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                          MO
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        <div className="p-4 border-t">
          <div className="flex gap-2">
            <Input
              placeholder="Votre message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isSending}
            />
            <Button onClick={handleSend} disabled={isSending || !newMessage.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
