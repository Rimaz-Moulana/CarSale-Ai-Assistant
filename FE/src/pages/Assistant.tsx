import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, Bot, User, MessageSquare, Plus, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { AIChatService } from '@/services/AIChatService';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const suggestedQuestions = [
  "How many cars are available?",
  "What is today's revenue?",
  "Show low stock vehicles.",
  "Which supplier supplied the most vehicles?",
  "Show monthly sales report.",
  "Can we purchase 20 more Toyota vehicles?"
];

const mockHistory = [
  { id: '1', title: 'Q3 Revenue Projection' },
  { id: '2', title: 'Supplier Analysis' },
  { id: '3', title: 'Inventory Reorder Draft' },
];

export function Assistant() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = async (text: string) => {
    if (!text.trim()) return;

    const newUserMsg: Message = { id: Date.now().toString(), role: 'user', content: text };
    const updatedHistory = [...messages, newUserMsg];
    setMessages(updatedHistory);
    setInput('');
    setIsTyping(true);

    try {
      const response = await AIChatService.sendMessage(text, updatedHistory);
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: response.content }]);
    } catch (error) {
      console.error("AI Chat Error:", error);
      toast.error("Failed to connect to AI server");
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: "Sorry, I'm having trouble connecting to the server right now." }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      className="flex h-[calc(100vh-6rem)] bg-background overflow-hidden border border-border rounded-xl shadow-sm"
    >
      
      {/* Left Pane - History Sidebar */}
      <div className="w-64 border-r border-border bg-card hidden md:flex flex-col">
        <div className="p-4 border-b border-border">
          <Button variant="outline" className="w-full justify-start text-sm" onClick={() => { setMessages([]); toast.success('Started a new chat'); }}>
            <Plus className="w-4 h-4 mr-2" />
            New Chat
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          <div className="text-xs font-semibold text-slate-500 mb-2 px-2 pt-2">Recent Chats</div>
          {mockHistory.map(chat => (
            <button key={chat.id} className="w-full flex items-center gap-2 px-2 py-2 text-sm text-left rounded-md hover:bg-muted transition-colors text-slate-700 dark:text-slate-300">
              <MessageSquare className="w-4 h-4 text-slate-400" />
              <span className="truncate">{chat.title}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Right Pane - Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-background">
        
        {/* Chat Header */}
        <div className="h-14 border-b border-border flex items-center justify-between px-6 bg-card/50 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
              <Bot className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">CEO AI Assistant</h3>
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                Status: Online
              </div>
            </div>
          </div>
          <div className="text-xs text-slate-500 font-medium px-2 py-1 rounded-md bg-muted">
            Model: Enterprise-GPT-v4
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center max-w-2xl mx-auto text-center space-y-8 animate-in fade-in duration-500">
              <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-2">
                <Bot className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-2">How can I help you today?</h2>
                <p className="text-slate-500 text-sm">I can provide instant insights on sales, inventory, and procurement metrics.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                {suggestedQuestions.map((q, i) => (
                  <Card key={i} className="hover:border-blue-500 hover:shadow-sm transition-all cursor-pointer bg-card/50" onClick={() => handleSend(q)}>
                    <CardContent className="p-3 text-sm text-left flex items-center text-slate-700 dark:text-slate-300">
                      {q}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-6">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex gap-4 ${msg.role === 'assistant' ? '' : 'flex-row-reverse'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    msg.role === 'assistant' ? 'bg-blue-100 dark:bg-blue-900/50' : 'bg-slate-200 dark:bg-slate-700'
                  }`}>
                    {msg.role === 'assistant' ? (
                      <Bot className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    ) : (
                      <User className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                    )}
                  </div>
                  <div className={`flex flex-col gap-1 max-w-[80%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                    <div className="text-xs font-semibold text-slate-500 px-1">
                      {msg.role === 'assistant' ? 'CEO AI Assistant' : 'You'}
                    </div>
                    <div className={`px-4 py-2.5 rounded-2xl text-sm whitespace-pre-wrap ${
                      msg.role === 'user' 
                        ? 'bg-blue-600 text-white rounded-tr-sm' 
                        : 'bg-card border border-border shadow-sm rounded-tl-sm text-slate-800 dark:text-slate-200'
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                </div>
              ))}
              
              {isTyping && (
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center shrink-0">
                    <Bot className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex flex-col gap-1 items-start">
                    <div className="text-xs font-semibold text-slate-500 px-1">CEO AI Assistant</div>
                    <div className="px-4 py-3 rounded-2xl bg-card border border-border shadow-sm rounded-tl-sm flex items-center gap-1">
                      <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 bg-background border-t border-border">
          <div className="max-w-3xl mx-auto relative flex items-center">
            <Button variant="ghost" size="icon" className="absolute left-2 text-slate-400 hover:text-slate-600 z-10 rounded-full">
              <Mic className="w-5 h-5" />
            </Button>
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSend(input);
              }}
              placeholder="Ask the CEO AI Assistant anything..."
              className="pl-12 pr-12 py-6 rounded-full shadow-sm bg-card border-slate-300 dark:border-slate-700 text-sm focus-visible:ring-blue-500"
            />
            <Button 
              size="icon" 
              className="absolute right-2 rounded-full w-8 h-8 bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
              onClick={() => handleSend(input)}
              disabled={!input.trim() || isTyping}
            >
              <Send className="w-4 h-4 ml-0.5" />
            </Button>
          </div>
          <div className="text-center mt-2">
            <span className="text-[10px] text-slate-400">Enterprise-GPT-v4 can make mistakes. Verify critical financial decisions.</span>
          </div>
        </div>

      </div>
    </motion.div>
  );
}
