import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Loader2, Bot, User, ImagePlus, X } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const PYTHON_API_URL = import.meta.env.VITE_PYTHON_API_URL || 'http://localhost:8001';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  imageUrl?: string;
}

export default function StudentChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Hello! I\'m your campus assistant. Ask me anything about the campus facilities, academics, or any issues you\'re facing. You can also attach images when reporting issues!',
      sender: 'bot',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Scroll to bottom when messages change
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  useEffect(() => {
    // Load session from localStorage with user isolation
    // This runs whenever token changes (user logs in/out)
    const token = localStorage.getItem('student_token');
    
    // If no token, reset to initial greeting
    if (!token) {
      setMessages([
        {
          id: '1',
          text: 'Hello! I\'m your campus assistant. Ask me anything about the campus facilities, academics, or any issues you\'re facing. You can also attach images when reporting issues!',
          sender: 'bot',
          timestamp: new Date()
        }
      ]);
      setSessionId(null);
      return;
    }
    
    const userKey = `chat_session_id_${token.substring(0, 20)}`;
    const messagesKey = `chat_messages_${token.substring(0, 20)}`;
    
    const savedSessionId = localStorage.getItem(userKey);
    const savedMessages = localStorage.getItem(messagesKey);
    
    if (savedSessionId) {
      setSessionId(savedSessionId);
    } else {
      setSessionId(null);
    }
    
    if (savedMessages) {
      try {
        const parsed = JSON.parse(savedMessages);
        setMessages(parsed.map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp)
        })));
      } catch (error) {
        console.error('Error loading messages:', error);
        // If error, reset to initial greeting
        setMessages([
          {
            id: '1',
            text: 'Hello! I\'m your campus assistant. Ask me anything about the campus facilities, academics, or any issues you\'re facing. You can also attach images when reporting issues!',
            sender: 'bot',
            timestamp: new Date()
          }
        ]);
      }
    } else {
      // No saved messages for this user, show greeting
      setMessages([
        {
          id: '1',
          text: 'Hello! I\'m your campus assistant. Ask me anything about the campus facilities, academics, or any issues you\'re facing. You can also attach images when reporting issues!',
          sender: 'bot',
          timestamp: new Date()
        }
      ]);
    }
  }, []);

  useEffect(() => {
    // Save messages to localStorage with user isolation
    if (messages.length > 1) {
      const token = localStorage.getItem('student_token');
      const messagesKey = token ? `chat_messages_${token.substring(0, 20)}` : 'chat_messages';
      localStorage.setItem(messagesKey, JSON.stringify(messages));
    }
  }, [messages]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size should be less than 5MB');
        return;
      }
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSend = async () => {
    if ((!input.trim() && !selectedImage) || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: input,
      sender: 'user',
      timestamp: new Date(),
      imageUrl: imagePreview || undefined
    };

    setMessages(prev => [...prev, userMessage]);
    const messageText = input;
    setInput('');
    const imageToSend = selectedImage;
    removeImage();
    setLoading(true);

    try {
      const token = localStorage.getItem('student_token');
      
      // Always use Python API for chat (supports both text and images)
      const formData = new FormData();
      formData.append('question', messageText);
      if (imageToSend) {
        formData.append('image', imageToSend);
      }
      if (sessionId) {
        formData.append('sessionId', sessionId);
      }

      const response = await axios.post(
        `${PYTHON_API_URL}/chat`,
        formData,
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response.data.answer,
        sender: 'bot',
        timestamp: new Date()
      };

      if (response.data.sessionId) {
        setSessionId(response.data.sessionId);
        const userKey = token ? `chat_session_id_${token.substring(0, 20)}` : 'chat_session_id';
        localStorage.setItem(userKey, response.data.sessionId);
      }

      setMessages(prev => [...prev, botMessage]);
    } catch (error: any) {
      console.error('Chat error:', error);
      toast.error(error.response?.data?.error || 'Failed to send message');
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Sorry, I encountered an error. Please try again.',
        sender: 'bot',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: '1',
        text: 'Hello! I\'m your campus assistant. Ask me anything about the campus facilities, academics, or any issues you\'re facing.',
        sender: 'bot',
        timestamp: new Date()
      }
    ]);
    setSessionId(null);
    localStorage.removeItem('chat_session_id');
    localStorage.removeItem('chat_messages');
    toast.success('Chat cleared');
  };

  return (
    <Card className="h-[calc(100vh-220px)] flex flex-col">
      <CardHeader className="border-b">
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Campus Assistant
          </CardTitle>
          <Button variant="outline" size="sm" onClick={clearChat}>
            Clear Chat
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 overflow-hidden p-0 flex flex-col">
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4" ref={scrollRef}>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback className={message.sender === 'bot' ? 'bg-primary text-primary-foreground' : 'bg-muted'}>
                    {message.sender === 'bot' ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
                  </AvatarFallback>
                </Avatar>
                <div
                  className={`flex flex-col gap-1 max-w-[80%] ${
                    message.sender === 'user' ? 'items-end' : 'items-start'
                  }`}
                >
                  <div
                    className={`rounded-lg px-4 py-2 ${
                      message.sender === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    {message.imageUrl && (
                      <img 
                        src={message.imageUrl} 
                        alt="Uploaded" 
                        className="max-w-xs rounded mb-2"
                      />
                    )}
                    <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    <Bot className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="bg-muted rounded-lg px-4 py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
      <CardFooter className="border-t flex flex-col gap-2">
        {imagePreview && (
          <div className="relative inline-block w-full">
            <img 
              src={imagePreview} 
              alt="Preview" 
              className="max-h-24 rounded border"
            />
            <Button
              size="icon"
              variant="destructive"
              className="absolute -top-2 -right-2 h-6 w-6"
              onClick={removeImage}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}
        <div className="flex gap-2 w-full">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
          />
          <Button
            variant="outline"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            title="Attach image"
          >
            <ImagePlus className="h-4 w-4" />
          </Button>
          <Input
            placeholder="Type your message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={loading}
            className="flex-1"
          />
          <Button onClick={handleSend} disabled={loading || (!input.trim() && !selectedImage)}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
