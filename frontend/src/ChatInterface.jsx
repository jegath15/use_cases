import React, { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, Loader2, ShieldCheck, HelpCircle, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

const ChatInterface = () => {
  const [messages, setMessages] = useState([
    { id: 1, role: 'assistant', content: 'Hello! I am your AI HR Assistant. How can I help you today?', subText: 'I have access to the company handbook and leave policies.' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userRole, setUserRole] = useState('Employee');
  const chatEndRef = useRef(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = { id: Date.now(), role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || 'https://use-cases-47cp.onrender.com').replace(/\/$/, '');
      const response = await axios.post(`${apiBaseUrl}/chat`, {
        message: input,
        role: userRole
      });

      setMessages(prev => [...prev, { 
        id: Date.now() + 1, 
        role: 'assistant', 
        content: response.data.response 
      }]);
    } catch (error) {
      setMessages(prev => [...prev, { 
        id: Date.now() + 1, 
        role: 'assistant', 
        content: 'Sorry, I encountered an error. Is the backend running?', 
        isError: true 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="premium-container flex flex-col h-screen max-w-4xl mx-auto p-4 md:p-8 w-full">
      {/* Header */}
      <header className="glass-morphism rounded-3xl p-6 mb-6 flex justify-between items-center shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="bg-indigo-500/20 p-3 rounded-2xl">
            <Bot className="text-indigo-400 w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              HR Assistant
            </h1>
            <p className="text-xs text-slate-400 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> Secure Corporate AI
            </p>
          </div>
        </div>
        
        <div className="flex bg-slate-800/50 p-1 rounded-xl glass-morphism">
          {['Employee', 'Manager', 'Admin'].map(role => (
            <button
              key={role}
              onClick={() => setUserRole(role)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                userRole === role 
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' 
                : 'text-slate-400 hover:text-white'
              }`}
            >
              {role}
            </button>
          ))}
        </div>
      </header>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto mb-6 px-2 space-y-6">
        <AnimatePresence>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex max-w-[85%] gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${
                  msg.role === 'user' ? 'bg-indigo-600' : 'bg-slate-800'
                }`}>
                  {msg.role === 'user' ? <User size={20} /> : <Bot size={20} />}
                </div>
                
                <div className={`p-5 rounded-3xl shadow-xl ${
                  msg.role === 'user' 
                  ? 'bg-indigo-600 text-white rounded-tr-none' 
                  : 'glass-morphism rounded-tl-none border-l-4 border-l-indigo-500'
                }`}>
                  <p className="leading-relaxed whitespace-pre-wrap text-slate-200">{msg.content}</p>
                  {msg.subText && <p className="mt-3 text-xs text-indigo-300 font-medium">{msg.subText}</p>}
                </div>
              </div>
            </motion.div>
          ))}
          {isLoading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
              <div className="flex gap-4 items-center glass-morphism p-4 rounded-2xl border-l-4 border-l-indigo-500">
                <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
                <span className="text-sm font-medium text-slate-400">Assistant is thinking...</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={chatEndRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={handleSend} className="relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-3xl blur opacity-20 group-focus-within:opacity-40 transition duration-1000"></div>
        <div className="relative flex gap-4 bg-slate-900 rounded-2xl p-2.5 border border-slate-700/50 shadow-2xl">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything about HR policies..."
            className="flex-1 bg-transparent border-none focus:ring-0 text-slate-200 px-4 py-3 placeholder-slate-500 outline-none"
          />
          <button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-500 text-white p-3.5 rounded-xl transition-all shadow-lg hover:shadow-indigo-500/30 flex items-center justify-center disabled:opacity-50"
            disabled={!input.trim() || isLoading}
          >
            <Send size={20} />
          </button>
        </div>
        
        <div className="flex gap-6 mt-4 px-4">
          <div className="flex items-center gap-2 text-xs text-slate-500 hover:text-indigo-400 transition-colors cursor-pointer">
            <HelpCircle size={14} /> Leave Policy
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 hover:text-indigo-400 transition-colors cursor-pointer">
            <MessageSquare size={14} /> FAQ
          </div>
        </div>
      </form>
    </div>
  );
};

export default ChatInterface;
