'use client';

import { useEffect, useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import PageTransition from '@/components/animations/PageTransition';
import { useTheme } from '@/contexts/ThemeContext';
import { useUnreadCountsSafe } from '@/contexts/UnreadCountContext';
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
  Clock,
  ArrowLeft,
  User,
  Loader2
} from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import { toast } from 'sonner';
import SpoonGifLoader from '@/components/ui/SpoonGifLoader';

interface MessageUser {
  _id: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  role: string;
}

interface Message {
  _id: string;
  content: string;
  sender: MessageUser;
  receiver: MessageUser;
  type: string;
  isRead: boolean;
  createdAt: string;
}

interface Conversation {
  _id: string;
  user: MessageUser;
  lastMessage: {
    content: string;
    type: string;
    createdAt: string;
    isRead: boolean;
  } | null;
  unreadCount: number;
}

export default function UserMessagesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { isDarkMode } = useTheme();
  const { refreshCounts } = useUnreadCountsSafe();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user) {
      fetchConversations();
    }
  }, [session]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation._id);
    }
  }, [selectedConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Poll for new messages when in a conversation
  useEffect(() => {
    if (selectedConversation) {
      const interval = setInterval(() => {
        fetchMessages(selectedConversation._id, false);
      }, 3000); // Poll every 3 seconds for faster updates
      return () => clearInterval(interval);
    }
  }, [selectedConversation]);

  // Poll for conversation updates (new messages indicator)
  useEffect(() => {
    if (session?.user) {
      const interval = setInterval(() => {
        fetchConversationsQuiet();
      }, 10000); // Poll every 10 seconds for conversation list
      return () => clearInterval(interval);
    }
  }, [session]);

  const fetchConversationsQuiet = async () => {
    try {
      const response = await fetch('/api/client/messages/conversations');
      if (response.ok) {
        const data = await response.json();
        setConversations(data.conversations || []);
      }
    } catch (error) {
      // Silent fail for background polling
    }
  };

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/client/messages/conversations');
      if (response.ok) {
        const data = await response.json();
        setConversations(data.conversations || []);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (userId: string, showLoader = true) => {
    try {
      if (showLoader) setLoadingMessages(true);
      const response = await fetch(`/api/client/messages?conversationWith=${userId}`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
        // Refresh unread counts after fetching messages (which auto-marks as read)
        await refreshCounts();
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoadingMessages(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || sending) return;

    setSending(true);
    try {
      const response = await fetch('/api/client/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientId: selectedConversation._id,
          content: newMessage.trim(),
          type: 'text'
        })
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(prev => [...prev, data.message]);
        setNewMessage('');
        inputRef.current?.focus();
      } else {
        toast.error('Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const formatMessageDate = (dateString: string) => {
    const date = new Date(dateString);
    if (isToday(date)) return format(date, 'h:mm a');
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'MMM d');
  };

  const formatMessageTime = (dateString: string) => {
    return format(new Date(dateString), 'h:mm a');
  };

  const getStatusIcon = (isRead: boolean, isOwn: boolean) => {
    if (!isOwn) return null;
    if (isRead) {
      return <CheckCheck className="h-3 w-3 text-green-500" />;
    }
    return <Check className="h-3 w-3 text-gray-400" />;
  };

  if (loading) {
    return (
      <div className={`fixed inset-0 flex items-center justify-center z-[100] ${isDarkMode ? 'bg-gray-950' : 'bg-white'}`}>
        <SpoonGifLoader size="lg" />
      </div>
    );
  }

  return (
    <PageTransition>
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-950' : 'bg-[#ECE5DD]'}`}>
      <div className="h-screen md:h-[calc(100vh-120px)] flex flex-col md:flex-row md:gap-4 md:p-6">
        {/* Conversations List - Hidden on mobile when conversation selected */}
        <div
          className={`md:w-80 shrink-0 md:rounded-xl md:shadow-sm md:border ${
            isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'
          } ${selectedConversation ? 'hidden md:block' : 'block'}`}
        >
          {/* Header */}
          <div
            className={`p-4 border-b flex items-center gap-3 bg-[#075E54] md:rounded-t-xl ${
              isDarkMode ? 'md:bg-gray-900 border-gray-800' : 'md:bg-white border-gray-100'
            }`}
          >
            <Link href="/user" className="p-2 -ml-2 md:hidden">
              <ArrowLeft className="w-5 h-5 text-white md:text-gray-700" />
            </Link>
            <h2 className={`font-bold text-lg text-white ${isDarkMode ? 'md:text-white' : 'md:text-[#075E54]'}`}>Messages</h2>
          </div>
          <div className="overflow-y-auto">
            {conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4">
                <div className="w-16 h-16 bg-[#075E54]/10 rounded-full flex items-center justify-center mb-4">
                  <Send className="w-8 h-8 text-[#075E54]" />
                </div>
                <h3 className={`font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>No conversations yet</h3>
                <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-500'} text-sm text-center`}>
                  Your conversations with your dietitian will appear here
                </p>
              </div>
            ) : (
              conversations.map((conv) => (
                <button
                  key={conv._id}
                  onClick={() => setSelectedConversation(conv)}
                  className={`w-full flex items-center gap-3 p-4 transition-colors border-b ${
                    isDarkMode ? 'border-gray-800 hover:bg-gray-800' : 'border-gray-100 hover:bg-gray-50'
                  } ${
                    selectedConversation?._id === conv._id ? 'bg-[#075E54]/5' : ''
                  }`}
                >
                  <div className="relative">
                    <div className="h-12 w-12 rounded-full bg-[#075E54]/10 flex items-center justify-center overflow-hidden">
                      {conv.user.avatar ? (
                        <img src={conv.user.avatar} alt={conv.user.firstName} loading="lazy" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-5 h-5 text-[#075E54]" />
                      )}
                    </div>
                    {conv.unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 h-5 w-5 bg-[#25D366] text-white text-xs font-semibold rounded-full flex items-center justify-center">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center justify-between">
                      <p className={`font-medium truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        {conv.user.firstName} {conv.user.lastName}
                      </p>
                      {conv.lastMessage && (
                        <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {formatMessageDate(conv.lastMessage.createdAt)}
                        </span>
                      )}
                    </div>
                    <p
                      className={`text-sm truncate ${
                        conv.unreadCount > 0
                          ? isDarkMode
                            ? 'text-white font-medium'
                            : 'text-gray-900 font-medium'
                          : isDarkMode
                            ? 'text-gray-300'
                            : 'text-gray-500'
                      }`}
                    >
                      {conv.lastMessage?.content || 'Start a conversation'}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div
          className={`flex-1 flex flex-col md:rounded-xl md:shadow-sm md:border ${
            isDarkMode ? 'border-gray-800' : 'border-gray-100'
          } ${!selectedConversation ? 'hidden md:flex' : 'flex fixed inset-0 z-50 md:relative md:z-auto'}`}
        >
          {selectedConversation ? (
            <div className="flex flex-col h-dvh md:h-full">
              {/* Chat Header - WhatsApp Style - Fixed at top */}
              <div
                className={`flex items-center justify-between p-3 bg-[#075E54] text-white md:border-b md:rounded-t-xl shrink-0 ${
                  isDarkMode ? 'md:bg-gray-900 md:text-white md:border-gray-800' : 'md:bg-white md:text-gray-900 md:border-gray-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <button 
                    className="p-2 -ml-2 md:hidden hover:bg-white/10 rounded-full"
                    onClick={() => setSelectedConversation(null)}
                  >
                    <ArrowLeft className="w-5 h-5 text-white" />
                  </button>
                  <div className="h-10 w-10 rounded-full bg-white/20 md:bg-[#075E54]/10 flex items-center justify-center overflow-hidden">
                    {selectedConversation.user.avatar ? (
                      <img src={selectedConversation.user.avatar} alt={selectedConversation.user.firstName} loading="lazy" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-5 h-5 text-white md:text-[#075E54]" />
                    )}
                  </div>
                  <div>
                    <p className={`font-medium text-white ${isDarkMode ? 'md:text-white' : 'md:text-gray-900'}`}>
                      {selectedConversation.user.firstName} {selectedConversation.user.lastName}
                    </p>
                    <p className="text-xs text-white/80 md:text-[#25D366] capitalize">
                      {selectedConversation.user.role === 'dietitian' ? 'Your Dietitian' : selectedConversation.user.role}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-white/10 md:hover:bg-gray-100">
                    <Phone className="h-5 w-5 text-white md:text-[#075E54]" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-white/10 md:hover:bg-gray-100">
                    <Video className="h-5 w-5 text-white md:text-[#075E54]" />
                  </Button>
                </div>
              </div>

              {/* Messages - WhatsApp Style - Scrollable area */}
              <div 
                className="flex-1 overflow-y-auto p-4 space-y-2"
                style={{
                  backgroundColor: isDarkMode ? '#0B141A' : '#ECE5DD',
                  backgroundImage: isDarkMode
                    ? 'url("data:image/svg+xml,%3Csvg width=\'100\' height=\'100\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M0 0h100v100H0z\' fill=\'%230B141A\'/%3E%3Cpath d=\'M20 20h60v60H20z\' fill=\'%23FFFFFF\' opacity=\'.03\'/%3E%3C/svg%3E")'
                    : 'url("data:image/svg+xml,%3Csvg width=\'100\' height=\'100\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M0 0h100v100H0z\' fill=\'%23ECE5DD\'/%3E%3Cpath d=\'M20 20h60v60H20z\' fill=\'%23D9D9D9\' opacity=\'.05\'/%3E%3C/svg%3E")',
                  backgroundSize: '300px 300px'
                }}
              >
                {loadingMessages ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full py-12">
                    <div className={`rounded-2xl p-6 shadow-sm ${isDarkMode ? 'bg-gray-900/80' : 'bg-white/80'}`}>
                      <div className="w-16 h-16 bg-[#075E54]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Send className="w-8 h-8 text-[#075E54]" />
                      </div>
                      <h3 className={`font-semibold mb-1 text-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Start a conversation</h3>
                      <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-500'} text-sm text-center`}>
                        Send a message to {selectedConversation.user.firstName}
                      </p>
                    </div>
                  </div>
                ) : (
                  messages.map((message) => {
                    const isOwn = message.sender._id === session?.user?.id;
                    
                    return (
                      <div
                        key={message._id}
                        className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-1`}
                      >
                        <div className={`max-w-[85%] sm:max-w-[75%] ${isOwn ? 'order-2' : ''}`}>
                          <div
                            className={`px-3 py-2 rounded-lg shadow-sm inline-block ${
                              isOwn
                                ? isDarkMode
                                  ? 'bg-emerald-700 text-white rounded-tr-none'
                                  : 'bg-[#DCF8C6] text-gray-900 rounded-tr-none'
                                : isDarkMode
                                  ? 'bg-gray-800 text-white rounded-tl-none'
                                  : 'bg-white text-gray-900 rounded-tl-none'
                            }`}
                          >
                            <p className="text-[14px] sm:text-[15px] leading-relaxed whitespace-pre-wrap wrap-break-word">{message.content}</p>
                            <div className={`flex items-center justify-end gap-1 mt-1`}>
                              <span className={`text-[10px] sm:text-[11px] ${isDarkMode ? 'text-gray-200' : 'text-gray-500'}`}>
                                {formatMessageTime(message.createdAt)}
                              </span>
                              {getStatusIcon(message.isRead, isOwn)}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area - WhatsApp Style - Fixed at bottom */}
              <div
                className={`p-2 sm:p-3 md:border-t md:rounded-b-xl shrink-0 ${
                  isDarkMode ? 'bg-gray-900 md:bg-gray-900 md:border-gray-800' : 'bg-[#F0F0F0] md:bg-white md:border-gray-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`h-10 w-10 shrink-0 rounded-full ${isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-200'}`}
                  >
                    <Paperclip className={`h-5 w-5 ${isDarkMode ? 'text-gray-200' : 'text-gray-600'}`} />
                  </Button>
                  <div className={`flex-1 rounded-3xl flex items-center px-4 py-2 shadow-sm ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                    <Input
                      ref={inputRef}
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type a message..."
                      className={`flex-1 border-0 bg-transparent focus-visible:ring-0 text-[14px] sm:text-[15px] p-0 ${isDarkMode ? 'text-white placeholder:text-gray-400' : 'text-gray-900'}`}
                      onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                    />
                  </div>
                  <Button 
                    size="icon" 
                    className="h-10 w-10 bg-[#075E54] hover:bg-[#064e47] shrink-0 rounded-full shadow-lg"
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || sending}
                  >
                    <Send className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className={`flex-1 flex items-center justify-center ${isDarkMode ? 'bg-gray-950' : 'bg-[#ECE5DD]'}`}>
              <div className={`text-center rounded-2xl p-8 shadow-sm ${isDarkMode ? 'bg-gray-900/80' : 'bg-white/80'}`}>
                <div className="w-16 h-16 bg-[#075E54]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Send className="w-8 h-8 text-[#075E54]" />
                </div>
                <h3 className={`font-semibold mb-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Select a conversation</h3>
                <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-500'} text-sm`}>Choose a conversation from the list to start chatting</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
    </PageTransition>
  );
}