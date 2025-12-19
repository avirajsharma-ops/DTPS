'use client';

import { useEffect, useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { ResponsiveLayout } from '@/components/client/layouts';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Send, 
  Paperclip, 
  Image as ImageIcon, 
  Phone, 
  Video,
  MoreVertical,
  Check,
  CheckCheck,
  Clock
} from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';

interface Message {
  id: string;
  content: string;
  senderId: string;
  senderName: string;
  senderRole: 'client' | 'dietitian';
  timestamp: Date;
  status: 'sent' | 'delivered' | 'read';
  type: 'text' | 'image' | 'file';
}

interface Conversation {
  id: string;
  dietitianId: string;
  dietitianName: string;
  dietitianImage?: string;
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: number;
  isOnline: boolean;
}

export default function UserMessagesPage() {
  const { data: session } = useSession();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.id);
    }
  }, [selectedConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchConversations = async () => {
    try {
      const response = await fetch('/api/client/conversations');
      if (response.ok) {
        const data = await response.json();
        setConversations(data);
        if (data.length > 0) {
          setSelectedConversation(data[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (conversationId: string) => {
    try {
      const response = await fetch(`/api/client/messages?conversationId=${conversationId}`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    // Add optimistic message
    const optimisticMessage: Message = {
      id: Date.now().toString(),
      content: newMessage,
      senderId: session?.user?.id || '',
      senderName: session?.user?.name || '',
      senderRole: 'client',
      timestamp: new Date(),
      status: 'sent',
      type: 'text',
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setNewMessage('');

    // Send to server
    try {
      await fetch('/api/client/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: selectedConversation.id,
          content: newMessage,
        }),
      });
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  // Default data
  const defaultConversations: Conversation[] = [
    {
      id: '1',
      dietitianId: 'd1',
      dietitianName: 'Dr. Sarah Smith',
      lastMessage: 'Great progress! Keep up the good work.',
      lastMessageTime: new Date(),
      unreadCount: 2,
      isOnline: true,
    },
  ];

  const defaultMessages: Message[] = [
    {
      id: '1',
      content: 'Hello! How can I help you today?',
      senderId: 'd1',
      senderName: 'Dr. Sarah Smith',
      senderRole: 'dietitian',
      timestamp: new Date(Date.now() - 3600000 * 2),
      status: 'read',
      type: 'text',
    },
    {
      id: '2',
      content: 'Hi Dr. Smith! I wanted to ask about my meal plan for next week.',
      senderId: 'u1',
      senderName: 'Me',
      senderRole: 'client',
      timestamp: new Date(Date.now() - 3600000),
      status: 'read',
      type: 'text',
    },
    {
      id: '3',
      content: 'Of course! I\'ve prepared a new plan based on your progress. You\'re doing great with your protein intake. Let me adjust the carbs slightly for better energy levels.',
      senderId: 'd1',
      senderName: 'Dr. Sarah Smith',
      senderRole: 'dietitian',
      timestamp: new Date(Date.now() - 1800000),
      status: 'read',
      type: 'text',
    },
    {
      id: '4',
      content: 'Great progress! Keep up the good work. 🎉',
      senderId: 'd1',
      senderName: 'Dr. Sarah Smith',
      senderRole: 'dietitian',
      timestamp: new Date(),
      status: 'delivered',
      type: 'text',
    },
  ];

  const displayConversations = conversations.length > 0 ? conversations : defaultConversations;
  const displayMessages = messages.length > 0 ? messages : defaultMessages;
  const activeConversation = selectedConversation || displayConversations[0];

  const formatMessageDate = (date: Date) => {
    if (isToday(date)) return format(date, 'h:mm a');
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'MMM d');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <Check className="h-3 w-3 text-gray-400" />;
      case 'delivered':
        return <CheckCheck className="h-3 w-3 text-gray-400" />;
      case 'read':
        return <CheckCheck className="h-3 w-3 text-green-500" />;
      default:
        return <Clock className="h-3 w-3 text-gray-400" />;
    }
  };

  return (
    <ResponsiveLayout 
      title="Messages" 
      showBottomNav={false}
      className="p-0 md:p-6"
    >
      <div className="h-[calc(100vh-56px)] md:h-[calc(100vh-120px)] flex flex-col md:flex-row md:gap-4">
        {/* Conversations List - Hidden on mobile when conversation selected */}
        <div className={`md:w-80 flex-shrink-0 bg-white md:rounded-xl md:shadow-sm md:border border-gray-100 ${selectedConversation ? 'hidden md:block' : 'block'}`}>
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Conversations</h2>
          </div>
          <div className="overflow-y-auto">
            {displayConversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => setSelectedConversation(conv)}
                className={`w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors ${
                  activeConversation?.id === conv.id ? 'bg-green-50' : ''
                }`}
              >
                <div className="relative">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={conv.dietitianImage} />
                    <AvatarFallback className="bg-green-100 text-green-700">
                      {conv.dietitianName.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  {conv.isOnline && (
                    <span className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 rounded-full border-2 border-white" />
                  )}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-gray-900 truncate">{conv.dietitianName}</p>
                    <span className="text-xs text-gray-500">
                      {formatMessageDate(conv.lastMessageTime)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 truncate">{conv.lastMessage}</p>
                </div>
                {conv.unreadCount > 0 && (
                  <span className="h-5 w-5 bg-green-500 text-white text-xs rounded-full flex items-center justify-center">
                    {conv.unreadCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Chat Area */}
        <div className={`flex-1 flex flex-col bg-white md:rounded-xl md:shadow-sm md:border border-gray-100 ${!selectedConversation ? 'hidden md:flex' : 'flex'}`}>
          {/* Chat Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="icon" 
                className="md:hidden h-8 w-8"
                onClick={() => setSelectedConversation(null)}
              >
                ←
              </Button>
              <Avatar className="h-10 w-10">
                <AvatarImage src={activeConversation?.dietitianImage} />
                <AvatarFallback className="bg-green-100 text-green-700">
                  {activeConversation?.dietitianName.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-gray-900">{activeConversation?.dietitianName}</p>
                <p className="text-xs text-green-600">
                  {activeConversation?.isOnline ? 'Online' : 'Offline'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <Phone className="h-5 w-5 text-gray-600" />
              </Button>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <Video className="h-5 w-5 text-gray-600" />
              </Button>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <MoreVertical className="h-5 w-5 text-gray-600" />
              </Button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {displayMessages.map((message) => {
              const isOwn = message.senderRole === 'client';
              
              return (
                <div
                  key={message.id}
                  className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[80%] ${isOwn ? 'order-2' : ''}`}>
                    <div
                      className={`px-4 py-2 rounded-2xl ${
                        isOwn
                          ? 'bg-green-600 text-white rounded-br-md'
                          : 'bg-white text-gray-900 rounded-bl-md shadow-sm'
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                    </div>
                    <div className={`flex items-center gap-1 mt-1 ${isOwn ? 'justify-end' : ''}`}>
                      <span className="text-xs text-gray-400">
                        {format(message.timestamp, 'h:mm a')}
                      </span>
                      {isOwn && getStatusIcon(message.status)}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-gray-100 bg-white">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-10 w-10 flex-shrink-0">
                <Paperclip className="h-5 w-5 text-gray-600" />
              </Button>
              <Button variant="ghost" size="icon" className="h-10 w-10 flex-shrink-0">
                <ImageIcon className="h-5 w-5 text-gray-600" />
              </Button>
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 bg-gray-50 border-0 focus-visible:ring-1"
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              />
              <Button 
                size="icon" 
                className="h-10 w-10 bg-green-600 hover:bg-green-700 flex-shrink-0"
                onClick={handleSendMessage}
                disabled={!newMessage.trim()}
              >
                <Send className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </ResponsiveLayout>
  );
}
