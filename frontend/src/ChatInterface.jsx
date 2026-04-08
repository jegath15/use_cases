import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, User, Bot, Loader2, ShieldCheck, 
  HelpCircle, MessageSquare, Plus, History, 
  Trash2, Globe, FileText, Upload, ChevronLeft, 
  ChevronRight, X, Download, Database
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001').replace(/\/$/, '');

const ChatInterface = () => {
  // State
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userRole, setUserRole] = useState('Employee');
  const [language, setLanguage] = useState('en');
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [showHistory, setShowHistory] = useState(true);
  const [showDocs, setShowDocs] = useState(false);
  
  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Translations
  const t = {
    en: {
      title: "HR Assistant",
      secure: "Secure Corporate AI",
      placeholder: "Ask anything about HR policies...",
      newChat: "New Chat",
      history: "Chat History",
      knowledge: "Knowledge Base",
      upload: "Upload Policy (PDF)",
      thinking: "Assistant is thinking...",
      role: "User Role",
      noSessions: "No past sessions",
      noDocs: "No documents uploaded",
      delete: "Delete"
    },
    ar: {
      title: "مساعد الموارد البشرية",
      secure: "ذكاء اصطناعي مؤسسي آمن",
      placeholder: "اسأل أي شيء عن سياسات الموارد البشرية...",
      newChat: "محادثة جديدة",
      history: "سجل المحادثات",
      knowledge: "قاعدة المعرفة",
      upload: "رفع سياسة (PDF)",
      thinking: "المساعد يفكر...",
      role: "دور المستخدم",
      noSessions: "لا توجد جلسات سابقة",
      noDocs: "لم يتم رفع مستندات",
      delete: "حذف"
    }
  };

  const curr = t[language];

  // Logic
  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    fetchSessions();
    fetchDocuments();
  }, []);

  const fetchSessions = async () => {
    try {
      const res = await axios.get(`${API_BASE}/history/sessions`);
      setSessions(res.data);
    } catch (err) {
      console.error("Failed to fetch sessions", err);
    }
  };

  const fetchDocuments = async () => {
    try {
      const res = await axios.get(`${API_BASE}/documents`);
      setDocuments(res.data);
    } catch (err) {
      console.error("Failed to fetch documents", err);
    }
  };

  const loadSession = async (sessionId) => {
    setActiveSessionId(sessionId);
    setIsLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/history/sessions/${sessionId}/messages`);
      setMessages(res.data);
    } catch (err) {
      console.error("Failed to load session", err);
    } finally {
      setIsLoading(false);
    }
  };

  const startNewChat = () => {
    setActiveSessionId(null);
    setMessages([]);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await axios.post(`${API_BASE}/chat`, {
        message: input,
        role: userRole,
        session_id: activeSessionId,
        language: language
      });

      if (!activeSessionId) {
        setActiveSessionId(response.data.session_id);
        fetchSessions();
      }

      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: response.data.response 
      }]);
    } catch (error) {
      console.error('Chat Error:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `Error: ${error.response?.data?.detail || error.message}`, 
        isError: true 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      await axios.post(`${API_BASE}/documents/upload`, formData);
      fetchDocuments();
      alert("Document uploaded and indexed!");
    } catch (err) {
      alert("Upload failed: " + (err.response?.data?.detail || err.message));
    }
  };

  const deleteDocument = async (name) => {
    if (!confirm(`Delete ${name}?`)) return;
    try {
      await axios.delete(`${API_BASE}/documents/${name}`);
      fetchDocuments();
    } catch (err) {
      console.error("Delete failed", err);
    }
  };

  const deleteSession = async (id, e) => {
    e.stopPropagation();
    if (!confirm("Delete this conversation?")) return;
    try {
      await axios.delete(`${API_BASE}/history/sessions/${id}`);
      if (activeSessionId === id) startNewChat();
      fetchSessions();
    } catch (err) {
      console.error("Delete session failed", err);
    }
  };

  return (
    <div className="premium-container flex h-screen w-full overflow-hidden text-slate-200" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      
      {/* Sidebar: History */}
      <AnimatePresence>
        {showHistory && (
          <motion.div 
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="glass-morphism h-full flex flex-col border-r border-white/5"
          >
            <div className="p-6">
              <button 
                onClick={startNewChat}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 py-3 rounded-xl transition-all shadow-lg active:scale-95"
              >
                <Plus size={18} /> {curr.newChat}
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto px-4 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-widest px-2 mb-2">
                <History size={14} /> {curr.history}
              </div>
              {sessions.length === 0 && <p className="text-xs text-slate-600 px-2 italic">{curr.noSessions}</p>}
              {sessions.map(s => (
                <div 
                  key={s.id}
                  onClick={() => loadSession(s.id)}
                  className={`group relative p-3 rounded-xl cursor-pointer transition-all hover:bg-white/5 ${activeSessionId === s.id ? 'active-sidebar-item' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    <MessageSquare size={16} className={activeSessionId === s.id ? "text-indigo-400" : "text-slate-500"} />
                    <p className="text-sm truncate pr-6">{s.title}</p>
                  </div>
                  <button 
                    onClick={(e) => deleteSession(s.id, e)}
                    className="absolute right-2 top-3 opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-opacity"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-900/50">
        
        {/* Header */}
        <header className="glass-morphism p-4 flex justify-between items-center shadow-md z-10">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setShowHistory(!showHistory)}
              className="p-2 hover:bg-white/5 rounded-lg text-slate-400"
            >
              <History size={20} />
            </button>
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-indigo-500 to-purple-500 p-2.5 rounded-xl shadow-lg shadow-indigo-500/20">
                <Bot className="text-white w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                  {curr.title}
                </h1>
                <p className="text-[10px] text-indigo-400/80 flex items-center gap-1 font-medium">
                  <ShieldCheck className="w-2.5 h-2.5" /> {curr.secure.toUpperCase()}
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex bg-slate-800/80 p-1 rounded-xl border border-white/5">
              <button 
                onClick={() => setLanguage('en')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${language === 'en' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}
              >
                <Globe size={14} /> EN
              </button>
              <button 
                onClick={() => setLanguage('ar')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${language === 'ar' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}
              >
                <Globe size={14} /> AR
              </button>
            </div>
            <button 
              onClick={() => setShowDocs(!showDocs)}
              className={`p-2 rounded-lg transition-colors ${showDocs ? 'bg-indigo-600 text-white' : 'hover:bg-white/5 text-slate-400'}`}
            >
              <Database size={20} />
            </button>
          </div>
        </header>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-6 md:px-12 space-y-8 scroll-smooth">
          <AnimatePresence initial={false}>
            {messages.length === 0 && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="h-full flex flex-col items-center justify-center text-center space-y-6 max-w-md mx-auto"
              >
                <div className="w-20 h-20 rounded-3xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                  <MessageSquare size={40} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">{language === 'en' ? 'Welcome!' : 'أهلاً بك!'}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    {language === 'en' 
                      ? 'I can help you with leave applications, company policies, insurance, and more. Try asking about "Annual Leave".' 
                      : 'يمكنني مساعدتك في طلبات الإجازات، سياسات الشركة، التأمين، وأكثر من ذلك. جرب السؤال عن "الإجازة السنوية".'}
                  </p>
                </div>
              </motion.div>
            )}
            {messages.map((msg, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex max-w-[80%] gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${
                    msg.role === 'user' ? 'bg-indigo-600' : 'bg-slate-800 border border-white/5'
                  }`}>
                    {msg.role === 'user' ? <User size={20} /> : <Bot size={20} />}
                  </div>
                  
                  <div className={`p-4 md:p-5 rounded-2xl shadow-xl leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user' 
                    ? 'bg-indigo-600 text-white rounded-tr-none shadow-indigo-500/10' 
                    : 'glass-morphism rounded-tl-none border-l-4 border-l-indigo-500 text-slate-200'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              </motion.div>
            ))}
            {isLoading && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                <div className="flex gap-4 items-center glass-morphism p-4 rounded-2xl border-l-4 border-l-indigo-500 text-slate-400 shadow-xl">
                  <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
                  <span className="text-sm font-medium">{curr.thinking}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={chatEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-6 md:px-12 pb-8">
          <form onSubmit={handleSend} className="max-w-4xl mx-auto relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl blur opacity-10 group-focus-within:opacity-20 transition duration-500"></div>
            <div className="relative flex gap-3 bg-slate-800/80 p-2 rounded-2xl border border-white/10 shadow-2xl backdrop-blur-xl">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={curr.placeholder}
                className="flex-1 bg-transparent border-none focus:ring-0 text-slate-200 px-4 py-3 placeholder-slate-500 outline-none text-sm md:text-base"
              />
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-500 text-white p-3 rounded-xl transition-all shadow-lg hover:shadow-indigo-500/30 flex items-center justify-center disabled:opacity-50 active:scale-95"
                disabled={!input.trim() || isLoading}
              >
                <Send size={20} />
              </button>
            </div>
          </form>
          <div className="mt-4 flex justify-center gap-6 text-[10px] text-slate-500 font-medium uppercase tracking-widest">
            <span className="hover:text-indigo-400 cursor-pointer transition-colors px-2 py-1 rounded-md hover:bg-white/5"># {language === 'en' ? 'Leave' : 'الإجازات'}</span>
            <span className="hover:text-indigo-400 cursor-pointer transition-colors px-2 py-1 rounded-md hover:bg-white/5"># {language === 'en' ? 'Policy' : 'السياسات'}</span>
            <span className="hover:text-indigo-400 cursor-pointer transition-colors px-2 py-1 rounded-md hover:bg-white/5"># {language === 'en' ? 'FAQ' : 'الأسئلة الشائعة'}</span>
          </div>
        </div>
      </div>

      {/* Sidebar: Knowledge Base */}
      <AnimatePresence>
        {showDocs && (
          <motion.div 
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="glass-morphism h-full flex flex-col border-l border-white/5"
          >
            <div className="p-6 border-b border-white/5 flex justify-between items-center">
              <h2 className="font-bold flex items-center gap-2">
                <Database size={18} className="text-indigo-400" /> {curr.knowledge}
              </h2>
              <button onClick={() => setShowDocs(false)} className="hover:text-white text-slate-500"><X size={18} /></button>
            </div>
            
            <div className="p-6">
              <div 
                onClick={() => fileInputRef.current.click()}
                className="cursor-pointer border-2 border-dashed border-white/10 hover:border-indigo-500/50 rounded-2xl p-6 transition-all bg-white/5 text-center flex flex-col items-center gap-3 group active:scale-[0.98]"
              >
                <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-all">
                  <Upload size={24} />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold">{curr.upload}</p>
                  <p className="text-[10px] text-slate-500 font-medium">MAX 50MB · PDF ONLY</p>
                </div>
                <input type="file" ref={fileInputRef} className="hidden" accept=".pdf" onChange={handleFileUpload} />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{language === 'en' ? 'DOCUMENTS' : 'المستندات'}</span>
                <span className="text-[10px] bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full font-bold">{documents.length}</span>
              </div>
              
              {documents.length === 0 && <p className="text-xs text-slate-600 italic mt-4">{curr.noDocs}</p>}
              
              {documents.map((doc, i) => (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  key={doc.name} 
                  className="flex items-center gap-3 p-3 bg-slate-800/40 border border-white/5 rounded-xl group hover:border-white/20 transition-all shadow-lg"
                >
                  <div className="p-2 bg-slate-900 rounded-lg text-slate-400">
                    <FileText size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold truncate text-slate-200">{doc.name}</p>
                    <p className="text-[10px] text-slate-500 font-medium uppercase">{(doc.size / 1024).toFixed(0)} KB</p>
                  </div>
                  <button 
                    onClick={() => deleteDocument(doc.name)}
                    className="p-1.5 opacity-0 group-hover:opacity-100 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                    title={curr.delete}
                  >
                    <Trash2 size={14} />
                  </button>
                </motion.div>
              ))}
            </div>

            <div className="p-6 bg-indigo-600/5 m-4 rounded-2xl border border-indigo-500/10">
              <div className="flex gap-3 mb-2">
                <HelpCircle size={16} className="text-indigo-400" />
                <h4 className="text-xs font-bold">{language === 'en' ? 'Smart RAG' : 'استرجاع ذكي'}</h4>
              </div>
              <p className="text-[10px] text-slate-400 leading-relaxed font-medium">
                {language === 'en' 
                  ? 'All documents are automatically chunked and vector-indexed for semantic retrieval.' 
                  : 'تتم تجزئة وفهرسة جميع المستندات تلقائيًا للاسترجاع الدلالي.'}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ChatInterface;
