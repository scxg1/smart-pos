import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send, Bot, User, Sparkles, Loader2, RotateCcw, TrendingUp, Package,
  Users, DollarSign, AlertTriangle, BarChart2, Plus, Trash2, MessageSquare,
  PanelRightOpen, PanelRightClose, Clock, Hash, X, CheckCircle, XCircle,
  Zap, Activity, Shield, Crown, Paperclip, Mic, ChevronDown, FileSpreadsheet,
  Code, GraduationCap, PenTool, Coffee, Mail, Image as ImageIcon,
} from 'lucide-react';
import { api } from '../lib/api';
import { usePOSStore } from '../store/posStore';
import * as XLSX from 'xlsx';

interface ChatMessage {
  id?: number;
  session_id?: number;
  role: 'user' | 'assistant' | 'action';
  content: string;
  loading?: boolean;
  created_at?: string;
  actions?: any[];
  files?: File[];
}

interface ChatSession {
  id: number;
  title: string;
  msg_count: number;
  created_at: string;
  updated_at: string;
}

const SUGGESTIONS = [
  { icon: Code, text: 'أكواد' },
  { icon: GraduationCap, text: 'تعلم' },
  { icon: PenTool, text: 'كتابة' },
  { icon: Coffee, text: 'أشياء عامة' },
  { icon: FileSpreadsheet, text: 'تحليل البيانات' },
];

function ActionBadge({ action }: { action: any }) {
  const isSuccess = action.success;
  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium w-fit ${
      isSuccess
        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20'
        : 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400 border border-red-200 dark:border-red-500/20'
    }`}>
      {isSuccess ? <CheckCircle size={14} /> : <XCircle size={14} />}
      <span>{action.message}</span>
    </div>
  );
}

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === 'user';

  if (isUser) {
    return (
      <div className="flex justify-end w-full animate-fade-in-up mb-6">
         <div className="max-w-[80%] bg-slate-100 dark:bg-slate-800 px-5 py-3.5 rounded-3xl rounded-tl-sm text-[15px] leading-relaxed text-slate-800 dark:text-slate-200 shadow-sm border border-slate-200 dark:border-slate-700/50">
           {msg.content}
           {msg.files && msg.files.length > 0 && (
             <div className="mt-3 flex flex-wrap gap-2">
               {msg.files.map((f, i) => (
                 <div key={i} className="flex items-center gap-2 bg-white dark:bg-slate-700 px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-600 shadow-sm">
                   <FileSpreadsheet size={14} className="text-emerald-500" />
                   <span className="truncate max-w-[120px] font-medium" dir="ltr">{f.name}</span>
                 </div>
               ))}
             </div>
           )}
         </div>
      </div>
    );
  }

  // Assistant Bubble
  return (
    <div className="flex items-start gap-4 animate-fade-in-up w-full mb-6">
      <div className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 mt-1 bg-white dark:bg-slate-800 shadow-sm">
        <Sparkles size={16} className="text-orange-500" />
      </div>
      <div className="flex-1 min-w-0 flex flex-col gap-2">
        {msg.loading ? (
          <div className="h-8 flex items-center gap-1.5 px-2">
            <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600 animate-pulse" />
            <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600 animate-pulse delay-75" />
            <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600 animate-pulse delay-150" />
          </div>
        ) : (
          <div className="text-[15px] leading-relaxed text-slate-800 dark:text-slate-200 pt-1.5 whitespace-pre-wrap">
             {msg.content}
          </div>
        )}
        
        {msg.actions && msg.actions.length > 0 && (
          <div className="flex flex-col gap-1.5 w-full mt-2">
            {msg.actions.map((action: any, i: number) => (
              <ActionBadge key={i} action={action} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SessionItem({
  session,
  active,
  onSelect,
  onDelete,
}: {
  session: ChatSession;
  active: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const [hovering, setHovering] = useState(false);

  return (
    <div
      onClick={onSelect}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
        active
          ? 'bg-white dark:bg-slate-700 shadow-sm border border-slate-200 dark:border-slate-600'
          : 'hover:bg-slate-200/50 dark:hover:bg-slate-700/50 border border-transparent'
      }`}
    >
      <div className="flex-1 min-w-0">
        <p className={`text-[13px] truncate ${active ? 'text-slate-800 dark:text-white font-medium' : 'text-slate-600 dark:text-slate-300'}`}>
          {session.title}
        </p>
      </div>
      {(hovering || active) && (
        <button
          onClick={e => { e.stopPropagation(); onDelete(); }}
          className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-red-50 dark:hover:bg-red-500/10 text-slate-400 hover:text-red-500 transition-colors shrink-0"
        >
          <Trash2 size={14} />
        </button>
      )}
    </div>
  );
}

export default function AIPage() {
  const { 
    aiMessages: messages, 
    setAiMessages: setMessages, 
    aiActiveSessionId: activeSessionId, 
    setAiActiveSessionId: setActiveSessionId,
    fetchProducts,
    fetchCustomers
  } = usePOSStore();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [recording, setRecording] = useState(false);
  const [interimText, setInterimText] = useState('');
  
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const msgIdRef = useRef(0);
  const recognitionRef = useRef<any>(null);
  const finalTranscriptRef = useRef('');

  const loadSessions = useCallback(async () => {
    try {
      const data = await api.getChatSessions();
      setSessions(data);
    } catch {}
  }, []);

  useEffect(() => { loadSessions(); }, [loadSessions]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const stopRecognition = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }
    setRecording(false);
    setInterimText('');
  }, []);

  const sendRef = useRef<(text?: string, files?: File[]) => void>(() => {});

  const startRecognition = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('متصفحك لا يدعم التعرف على الصوت. استخدم Chrome أو Edge.');
      return;
    }

    if (recognitionRef.current) {
      stopRecognition();
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'ar-EG';
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    finalTranscriptRef.current = '';
    setInterimText('');
    setRecording(true);

    recognition.onresult = (event: any) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }
      if (final) {
        finalTranscriptRef.current += final;
      }
      setInterimText(finalTranscriptRef.current + interim);
    };

    recognition.onerror = (event: any) => {
      setRecording(false);
      setInterimText('');
      recognitionRef.current = null;
      if (event.error === 'not-allowed') {
        alert('يرجى السماح بالوصول إلى الميكروفون');
      }
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      setRecording(false);
      const text = finalTranscriptRef.current.trim();
      setInterimText('');
      if (text) {
        setInput(text);
        setTimeout(() => sendRef.current(text, []), 150);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [stopRecognition]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
    };
  }, []);

  const loadSession = useCallback(async (sessionId: number) => {
    try {
      const msgs = await api.getChatMessages(sessionId);
      setActiveSessionId(sessionId);
      setMessages(msgs.map((m: any) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        created_at: m.created_at,
      })));
    } catch {}
  }, []);

  const startNewChat = useCallback(async () => {
    setActiveSessionId(null);
    setMessages([]);
    setInput('');
    setSelectedFiles([]);
  }, []);

  const deleteSession = useCallback(async (id: number) => {
    try {
      await api.deleteChatSession(id);
      if (activeSessionId === id) {
        setActiveSessionId(null);
        setMessages([]);
      }
      await loadSessions();
    } catch {}
  }, [activeSessionId, loadSessions]);

  const send = async (text: string = input, files: File[] = selectedFiles) => {
    const q = text.trim();
    if ((!q && files.length === 0) || loading) return;

    let sessionId = activeSessionId;
    if (!sessionId) {
      try {
        const session = await api.createChatSession(q.slice(0, 50) || 'محادثة جديدة');
        sessionId = session.id;
        setActiveSessionId(session.id);
        await loadSessions();
      } catch { return; }
    }

    setInput('');
    setSelectedFiles([]);
    
    const userMsg: ChatMessage = { id: ++msgIdRef.current, role: 'user', content: q, files };
    const loadingMsg: ChatMessage = { id: ++msgIdRef.current, role: 'assistant', content: '', loading: true };

    setMessages(prev => [...prev, userMsg, loadingMsg]);
    setLoading(true);

    try {
      let filesContext = '';
      if (files.length > 0) {
        for (const file of files) {
          try {
            const buffer = await file.arrayBuffer();
            let text = '';
            if (file.name.endsWith('.csv') || file.name.endsWith('.txt')) {
              text = new TextDecoder().decode(buffer);
            } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
              const wb = XLSX.read(buffer, { type: 'array' });
              const wsName = wb.SheetNames[0];
              const ws = wb.Sheets[wsName];
              text = XLSX.utils.sheet_to_csv(ws);
            }
            if (text) {
              filesContext += `\n\n--- محتوى الملف: ${file.name} ---\n${text.slice(0, 15000)}`; // limit size
            }
          } catch (e) {
            console.error('Failed to parse file', e);
          }
        }
      }

      const history = [...messages].map(m => ({ role: m.role, content: m.content }));
      history.push({ role: 'user', content: q + filesContext });
      
      const { reply, actions } = await api.sendChat(history, sessionId!);

      setMessages(prev => {
        const newMsgs = prev.map(m =>
          m.id === loadingMsg.id
            ? { ...m, content: reply, loading: false, created_at: new Date().toISOString(), actions: actions || [] }
            : m
        );
        return newMsgs;
      });
      loadSessions();
      
      if (actions && actions.length > 0) {
        fetchProducts();
        fetchCustomers();
      }
    } catch {
      setMessages(prev => prev.map(m =>
        m.id === loadingMsg.id
          ? { ...m, content: 'عذراً، حدث خطأ في الاتصال. يرجى المحاولة مرة أخرى.', loading: false }
          : m
      ));
    }
    setLoading(false);
  };

  sendRef.current = send;

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const isEmpty = messages.length === 0;

  const renderChatInput = () => (
    <div className="relative w-full max-w-3xl mx-auto shadow-sm rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 transition-all focus-within:ring-4 focus-within:ring-slate-100 dark:focus-within:ring-slate-800 focus-within:border-slate-300 dark:focus-within:border-slate-600">
      <div className="flex flex-col">
        {selectedFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 px-4 pt-4">
            {selectedFiles.map((file, i) => (
              <div key={i} className="flex items-center gap-2 bg-slate-100 dark:bg-slate-700 px-3 py-1.5 rounded-xl text-sm border border-slate-200 dark:border-slate-600">
                 <FileSpreadsheet size={16} className="text-emerald-500" />
                 <span className="truncate max-w-[150px] text-slate-700 dark:text-slate-200" dir="ltr">{file.name}</span>
                 <button onClick={() => setSelectedFiles(prev => prev.filter((_, idx) => idx !== i))} className="text-slate-400 hover:text-red-500"><X size={14} /></button>
              </div>
            ))}
          </div>
        )}
        
        {recording && interimText && (
          <div className="px-5 pt-4 pb-1">
            <div className="flex items-center gap-2 text-red-500 text-xs font-medium mb-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              جاري الاستماع...
            </div>
            <p className="text-[15px] leading-relaxed text-slate-700 dark:text-slate-300">{interimText}</p>
          </div>
        )}
        <textarea
          ref={inputRef}
          className="w-full bg-transparent resize-none outline-none px-5 py-4 text-[15px] leading-relaxed text-slate-800 dark:text-slate-200 placeholder-slate-400"
          placeholder={recording ? 'جاري الاستماع...' : 'اكتب / للأوامر أو اسأل عن أي شيء...'}
          rows={selectedFiles.length > 0 ? 2 : 3}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          disabled={loading || recording}
          style={{ fieldSizing: 'content', minHeight: '80px', maxHeight: '200px' } as any}
        />
        
        <div className="flex items-center justify-between px-3 pb-3">
          <div className="flex items-center gap-1">
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              multiple 
              accept=".xlsx,.xls,.csv,.pdf,.png,.jpg"
              onChange={(e) => {
                if (e.target.files) {
                  setSelectedFiles(prev => [...prev, ...Array.from(e.target.files!)]);
                }
                e.target.value = ''; // reset
              }}
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              title="إرفاق ملف"
            >
              <Plus size={22} />
            </button>
          </div>
          <div className="flex items-center gap-3">
             <div className="flex items-center gap-1.5 text-[13px] text-slate-500 font-medium cursor-pointer hover:text-slate-700 dark:hover:text-slate-300 px-2 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
               <span>المدير الذكي 4.0</span>
               <ChevronDown size={14} />
             </div>
              <button
                onClick={startRecognition}
                className={`transition-all w-8 h-8 flex items-center justify-center rounded-full ${
                  recording
                    ? 'mic-recording text-white'
                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
                title={recording ? 'إيقاف التسجيل' : 'تسجيل صوتي'}
              >
                <Mic size={18} />
              </button>
             
             <button
               onClick={() => send()}
               disabled={(!input.trim() && selectedFiles.length === 0) || loading}
               className={`w-9 h-9 flex items-center justify-center rounded-full transition-all ${
                 (!input.trim() && selectedFiles.length === 0) || loading 
                   ? 'bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-slate-500' 
                   : 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:scale-105 shadow-md'
               }`}
             >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} className="rotate-180 transform -translate-x-0.5" />}
             </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-full bg-white dark:bg-slate-900">
      {sidebarOpen && (
        <div className="w-72 bg-slate-50/50 dark:bg-slate-800/50 border-l border-slate-200 dark:border-slate-700 flex flex-col shrink-0">
          <div className="p-4">
            <button
              onClick={startNewChat}
              className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-medium hover:border-violet-300 hover:shadow-sm transition-all text-slate-700 dark:text-slate-200"
            >
              <span className="flex items-center gap-2">
                <Sparkles size={16} className="text-orange-500" />
                محادثة جديدة
              </span>
              <Plus size={18} className="text-slate-400" />
            </button>
          </div>

          <div className="px-4 pb-2">
            <h3 className="text-xs font-semibold text-slate-400 dark:text-slate-500 mb-3 px-1">سجل المحادثات</h3>
          </div>

          <div className="flex-1 overflow-y-auto px-2 space-y-0.5">
            {sessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <MessageSquare size={24} className="text-slate-300 dark:text-slate-600 mb-2" />
                <p className="text-xs text-slate-400 dark:text-slate-500">لا توجد محادثات سابقة</p>
              </div>
            ) : (
              sessions.map(s => (
                <SessionItem
                  key={s.id}
                  session={s}
                  active={activeSessionId === s.id}
                  onSelect={() => loadSession(s.id)}
                  onDelete={() => deleteSession(s.id)}
                />
              ))
            )}
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0 h-full relative">
        <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-10 h-10 rounded-full bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 shadow-sm transition-colors"
          >
            {sidebarOpen ? <PanelRightClose size={18} /> : <PanelRightOpen size={18} />}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 flex flex-col pt-16">
          {isEmpty ? (
            <div className="flex-1 flex flex-col items-center justify-center w-full max-w-3xl mx-auto pb-20">
              <div className="flex items-center gap-3 mb-8">
                <Sparkles className="text-orange-500" size={32} />
                <h1 className="text-3xl font-serif text-slate-800 dark:text-slate-100">
                  كيف يمكنني مساعدتك اليوم؟
                </h1>
              </div>
              
              {renderChatInput()}

              <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
                {SUGGESTIONS.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => send(s.text, [])}
                    className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm text-sm font-medium text-slate-600 dark:text-slate-300"
                  >
                    <s.icon size={16} className="text-slate-400" />
                    {s.text}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex-1 w-full max-w-3xl mx-auto py-8 space-y-6">
              {messages.map(msg => <MessageBubble key={msg.id || Math.random()} msg={msg} />)}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {!isEmpty && (
          <div className="shrink-0 px-4 pb-6 pt-2 w-full max-w-3xl mx-auto bg-gradient-to-t from-white dark:from-slate-900 to-transparent">
             {renderChatInput()}
             <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center mt-3">يمكن لمدير النظام معالجة البيانات وتحليل الملفات والإجابة عن الأسئلة.</p>
          </div>
        )}
      </div>
    </div>
  );
}
