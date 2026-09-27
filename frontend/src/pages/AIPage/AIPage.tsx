import { useState, useRef, useEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import type { AppDispatch } from '@/store/configureStore';
import { fetchAIChat } from '@/store/modules/ai';
import type { AIChatMessage, ChatSession } from '@/types/ai';
import { 
    Sparkles, 
    Plus, 
    Globe, 
    ArrowRight, 
    Copy, 
    CheckSquare, 
    FileText,
    History,
    Blocks,
    Edit,
    Search,
    Sun,
    Bell,
    Lightbulb,
    PanelLeftClose,
    PanelLeftOpen,
    Trash2
} from 'lucide-react';

export default function AIPage() {
    const dispatch = useDispatch<AppDispatch>();
    const { t } = useTranslation('common');
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    
    const [sessions, setSessions] = useState<ChatSession[]>(() => {
        const saved = localStorage.getItem('flowise_ai_sessions');
        if (saved) return JSON.parse(saved);
        return [{
            id: 'default',
            title: t('ai.newConversation'),
            messages: [],
            timestamp: Date.now()
        }];
    });

    const [activeSessionId, setActiveSessionId] = useState<string>(() => {
        const lastActive = localStorage.getItem('flowise_ai_active_session');
        const savedSessions = localStorage.getItem('flowise_ai_sessions');
        const parsedSessions = savedSessions ? JSON.parse(savedSessions) : [];
        
        if (parsedSessions.length > 0) {
            const sessionExists = parsedSessions.some((s: ChatSession) => s.id === lastActive);
            return sessionExists ? lastActive! : parsedSessions[0].id;
        }
        return 'default';
    });

    const [inputValue, setInputValue] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0];
    const messages = useMemo(() => activeSession?.messages || [], [activeSession?.messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        localStorage.setItem('flowise_ai_sessions', JSON.stringify(sessions));
        localStorage.setItem('flowise_ai_active_session', activeSessionId);
    }, [sessions, activeSessionId]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleNewChat = () => {
        const newId = Date.now().toString();
        const newSession: ChatSession = {
            id: newId,
            title: t('ai.newConversation'),
            messages: [],
            timestamp: Date.now()
        };
        setSessions([newSession, ...sessions]);
        setActiveSessionId(newId);
    };

    const handleDeleteSession = (sessionId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const updatedSessions = sessions.filter(s => s.id !== sessionId);
        
        if (updatedSessions.length === 0) {
            const newId = Date.now().toString();
            const newSession = { id: newId, title: t('ai.newConversation'), messages: [], timestamp: Date.now() };
            setSessions([newSession]);
            setActiveSessionId(newId);
        } else {
            setSessions(updatedSessions);
            if (activeSessionId === sessionId) {
                setActiveSessionId(updatedSessions[0].id);
            }
        }
    };

    const handleSendMessage = async (forceText?: string) => {
        const text = forceText || inputValue.trim();
        if (!text || isGenerating) return;

        const userMessage: AIChatMessage = { id: Date.now().toString(), role: 'user', content: text };
        
        setSessions(prev => prev.map(s => {
            if (s.id === activeSessionId) {
                const newTitle = s.messages.length === 0 
                    ? (text.length > 25 ? text.substring(0, 25) + '...' : text)
                    : s.title;
                return { ...s, title: newTitle, messages: [...s.messages, userMessage] };
            }
            return s;
        }));

        setInputValue('');
        setIsGenerating(true);

        const aiMessageId = (Date.now() + 1).toString();
        
        setSessions(prev => prev.map(s => 
            s.id === activeSessionId 
                ? { ...s, messages: [...s.messages, { id: aiMessageId, role: 'ai', content: '', isSearching: true, isStreaming: true }] } 
                : s
        ));

        try {
            const chatHistory = messages.slice(-5).map(msg => ({
                role: msg.role === 'user' ? 'user' as const : 'ai' as const,
                content: msg.content
            }));

            const response = await dispatch(fetchAIChat({ message: text, history: chatHistory })).unwrap();

            const fullResponse = response.response;
            const words = fullResponse.split(' ');
            let currentText = '';

            setSessions(prev => prev.map(s => 
                s.id === activeSessionId 
                    ? { ...s, messages: s.messages.map(m => m.id === aiMessageId ? { ...m, isSearching: false, isStreaming: true } : m) } 
                    : s
            ));

            for (let i = 0; i < words.length; i++) {
                await new Promise(r => setTimeout(r, 30));
                currentText += words[i] + ' ';
                setSessions(prev => prev.map(s => 
                    s.id === activeSessionId 
                        ? { ...s, messages: s.messages.map(m => m.id === aiMessageId ? { ...m, content: currentText } : m) } 
                        : s
                ));
            }

            setSessions(prev => prev.map(s => 
                s.id === activeSessionId 
                    ? { ...s, 
                        title: response.suggestedTitle || s.title, // Cập nhật tiêu đề từ AI
                        messages: s.messages.map(m => m.id === aiMessageId ? { 
                            ...m, 
                            content: fullResponse, 
                            isStreaming: false,
                            followUps: response.suggestions || []
                        } : m) } 
                    : s
            ));

        } catch { 
            setSessions(prev => prev.map(s => 
                s.id === activeSessionId 
                    ? { ...s, messages: s.messages.map(m => m.id === aiMessageId ? { 
                        ...m, 
                        content: "Rất tiếc, AI đang gặp lỗi kết nối. Vui lòng thử lại sau.", 
                        isSearching: false,
                        isStreaming: false 
                    } : m) } 
                    : s
            ));
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="relative flex h-screen w-full bg-[var(--color-surface-hover)] font-['Plus_Jakarta_Sans',sans-serif]">
            
            <div 
                className={`flex shrink-0 flex-col bg-[var(--color-surface-container-low)] transition-all duration-300 ease-in-out z-30 ${
                    isSidebarOpen ? 'w-60 border-r border-[var(--color-border-light)] opacity-100' : 'w-0 border-none opacity-0 overflow-hidden'
                }`}
            >
                <div className="flex h-12 w-60 items-center justify-between px-4 pb-2 pt-4">
                    <span className="text-[14px] font-extrabold text-[var(--color-on-surface)]">AI</span>
                    <div className="flex items-center gap-1.5">
                        <button 
                            className="flex h-6 w-6 items-center justify-center rounded text-[var(--color-text-tertiary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-secondary)] transition-colors border-none bg-transparent cursor-pointer"
                            onClick={() => setIsSidebarOpen(false)}
                            title={t('buttons.close')}
                        >
                            <PanelLeftClose size={14} />
                        </button>
                        <button className="flex h-6 w-6 items-center justify-center rounded border border-[var(--color-border-light)] bg-[var(--color-surface-container-lowest)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]">
                            <Edit size={13} />
                        </button>
                    </div>
                </div>

                <div className="flex w-60 flex-col gap-0.5 px-2 mt-2">
                    <div className="flex cursor-pointer items-center gap-2.5 rounded-lg bg-[var(--color-primary-bg)] px-2.5 py-1.5 text-[13px] font-semibold text-[var(--color-primary)]">
                        <div className="flex items-center justify-center">
                            <Sparkles size={14} className="text-[#e84393]" />
                        </div>
                        <span>{t('ai.askOrCreate')}</span>
                    </div>
                </div>
                <div className="mt-6 flex flex-1 flex-col px-2 overflow-y-auto scrollbar-thin">
                    <div className="mb-1 px-2.5 text-[11px] font-extrabold text-[var(--color-text-tertiary)] uppercase tracking-[0.05em]">
                        {t('ai.recentChats')}
                    </div>
                    <button 
                        onClick={handleNewChat}
                        className="mb-2 flex cursor-pointer items-center gap-2.5 rounded-lg border border-dashed border-[var(--color-border)] px-2.5 py-1.5 text-[13px] font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-all bg-transparent"
                    >
                        <Plus size={14} />
                        <span>{t('ai.newConversation')}</span>
                    </button>

                    <div className="flex flex-col gap-0.5">
                        {sessions
                            .filter(session => session.messages.length > 0) // Chỉ hiện session đã có tin nhắn
                            .map((session) => (
                                <div 
                                    key={session.id}
                                    onClick={() => setActiveSessionId(session.id)}
                                    className={`group relative flex items-center justify-between rounded-lg px-2.5 py-1.5 transition-all cursor-pointer ${
                                        activeSessionId === session.id 
                                        ? 'bg-[var(--color-surface-container-high)] text-[var(--color-on-surface)]' 
                                        : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-on-surface)]'
                                    }`}
                                >
                                <div className="flex items-center gap-2 overflow-hidden">
                                    <History size={14} className="shrink-0 opacity-70" />
                                    <span className="truncate text-[13px] font-semibold leading-tight">{session.title}</span>
                                </div>
                                
                                <button 
                                    onClick={(e) => handleDeleteSession(session.id, e)}
                                    className={`flex h-6 w-6 items-center justify-center rounded text-[var(--color-text-tertiary)] hover:bg-red-50 hover:text-red-500 transition-all ${
                                        activeSessionId === session.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                                    }`}
                                    title="Delete chat"
                                >
                                    <Trash2 size={13} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Main Area */}
            <div className="relative flex flex-1 w-full flex-col bg-[var(--color-surface-container-lowest)] overflow-hidden items-center group/main">
                
                {/* Floating Open Sidebar Button (visible when sidebar is closed) */}
                {!isSidebarOpen && (
                    <button 
                        className="absolute left-4 top-4 z-50 flex h-7 w-7 items-center justify-center rounded-md bg-[var(--color-surface-container-lowest)] border border-[var(--color-border-light)] text-[var(--color-text-secondary)] opacity-60 shadow-sm transition-all hover:bg-[var(--color-surface-hover)] hover:opacity-100"
                        onClick={() => setIsSidebarOpen(true)}
                        title="Open sidebar"
                    >
                        <PanelLeftOpen size={14} />
                    </button>
                )}
                
                {messages.length === 0 ? (
                    // ==========================================
                    // EMPTY STATE (CENTERED HUB UI)
                    // ==========================================
                    <div className="flex h-full w-full flex-col items-center justify-center relative">
                        {/* Top Gradient Blur matching ClickUp Brain */}
                        <div className="absolute top-0 left-0 right-0 h-64 bg-linear-to-b from-[#e84393]/8 via-[#7c5cfc]/8 to-transparent pointer-events-none blur-3xl opacity-60" />

                        <div className="z-10 flex w-full max-w-3xl flex-col items-center px-6">
                            {/* Giant Brain Logo */}
                            <div className="flex items-center justify-center gap-3 mb-10 w-full animate-in fade-in zoom-in duration-500">
                                <Sparkles size={40} className="text-[#e84393]" fill="#e84393" strokeWidth={1} />
                                <span className="text-[40px] font-bold text-[var(--color-on-surface)] tracking-tight">FlowiseAI<sup className="text-lg text-[var(--color-text-tertiary)] font-medium ml-1">™</sup></span>
                            </div>

                            {/* Centered Composer */}
                            <div className="relative w-full rounded-3xl p-0.5 bg-linear-to-r from-[#e3e8f8] via-[#fdecf5] to-[#f0ebff] shadow-[0_8px_30px_rgb(0,0,0,0.06)]">
                                {/* floating tabs */}
                                <div className="absolute -top-7.5 left-6 flex">
                                    <div className="flex h-8 items-center gap-1.5 rounded-t-xl bg-[var(--color-surface-container-lowest)] px-4 text-[13px] font-bold text-[var(--color-primary)] shadow-[0_-2px_10px_rgb(0,0,0,0.02)]">
                                        <Sparkles size={12} className="text-[#e84393]" fill="#e84393" /> Ask
                                    </div>
                                    <div className="flex h-8 items-center gap-1.5 rounded-t-xl px-4 text-[13px] font-semibold text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] cursor-pointer">
                                        <Blocks size={12} /> Agents
                                    </div>
                                </div>

                                <div className="flex flex-col rounded-[22px] bg-[var(--color-surface-container-lowest)] pt-4 pb-2 px-3">
                                    <input
                                        value={inputValue}
                                        onChange={(e) => setInputValue(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleSendMessage();
                                            }
                                        }}
                                        placeholder={t('ai.inputPlaceholder')}
                                        autoFocus
                                        className="min-h-17.5 max-h-50 w-full resize-none border-none bg-transparent px-3 py-1 text-[15px] font-medium text-[var(--color-on-surface)] outline-none placeholder:text-[var(--color-text-tertiary)] scrollbar-hide"
                                    />
                                    
                                    <div className="mt-3 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <button className="flex h-7 w-7 items-center justify-center rounded bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-hover)]">
                                                <Plus size={14} />
                                            </button>
                                            <div className="flex cursor-pointer items-center gap-1.5 px-2 rounded hover:bg-[var(--color-surface-hover)] py-1 transition-colors">
                                                <Sparkles size={14} className="text-[#e84393]" fill="#e84393" strokeWidth={1} />
                                                <span className="text-[13px] font-bold text-[var(--color-text-secondary)]">FlowiseAI</span>
                                                <ArrowRight size={10} className="rotate-90 ml-0.5 text-[var(--color-text-tertiary)]" />
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <button className="flex items-center gap-1.5 px-2 py-1.5 rounded text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] transition-colors">
                                                <Globe size={14} />
                                            </button>
                                            
                                            <button 
                                                onClick={() => handleSendMessage()}
                                                disabled={!inputValue.trim() || isGenerating}
                                                className={`flex h-8 w-8 items-center justify-center rounded-full transition-all ${
                                                    inputValue.trim() 
                                                        ? 'bg-[var(--color-surface-container-high)] text-[var(--color-on-surface)] hover:bg-[#dcdfe4]' 
                                                        : 'bg-[var(--color-surface-hover)] text-[var(--color-text-tertiary)]'
                                                }`}
                                            >
                                                <ArrowRight size={14} strokeWidth={2.5} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6 flex w-full gap-3 justify-center text-left">
                                <button className="flex flex-1 flex-col justify-start rounded-xl border border-[var(--color-border-light)] bg-[var(--color-surface-container-lowest)] p-3 shadow-sm hover:border-[var(--color-border)] hover:-translate-y-0.5 transition-all" onClick={() => handleSendMessage("Create Task")}>
                                    <Sun size={14} className="mb-2 text-[var(--color-text-secondary)]" />
                                    <span className="text-[12px] font-extrabold text-[var(--color-on-surface)] mb-0.5">Create Task</span>
                                    <span className="text-[11px] font-medium text-[var(--color-text-tertiary)]">Add new action item</span>
                                </button>
                                <button className="flex flex-1 flex-col justify-start rounded-xl border border-[var(--color-border-light)] bg-[var(--color-surface-container-lowest)] p-3 shadow-sm hover:border-[var(--color-border)] hover:-translate-y-0.5 transition-all" onClick={() => handleSendMessage("Set Reminder")}>
                                    <Bell size={14} className="mb-2 text-[var(--color-text-secondary)]" />
                                    <span className="text-[12px] font-extrabold text-[var(--color-on-surface)] mb-0.5">Set Reminder</span>
                                    <span className="text-[11px] font-medium text-[var(--color-text-tertiary)]">Remind about task</span>
                                </button>
                                <button className="flex flex-1 flex-col justify-start rounded-xl border border-[var(--color-border-light)] bg-[var(--color-surface-container-lowest)] p-3 shadow-sm hover:border-[var(--color-border)] hover:-translate-y-0.5 transition-all" onClick={() => handleSendMessage("Brainstorm Ideas")}>
                                    <Lightbulb size={14} className="mb-2 text-[var(--color-text-secondary)]" />
                                    <span className="text-[12px] font-extrabold text-[var(--color-on-surface)] mb-0.5">Brainstorm Ideas</span>
                                    <span className="text-[11px] font-medium text-[var(--color-text-tertiary)]">Generate new concepts</span>
                                </button>
                                <button className="flex flex-1 flex-col justify-start rounded-xl border border-[var(--color-border-light)] bg-[var(--color-surface-container-lowest)] p-3 shadow-sm hover:border-[var(--color-border)] hover:-translate-y-0.5 transition-all" onClick={() => handleSendMessage("Find Tasks")}>
                                    <Search size={14} className="mb-2 text-[var(--color-text-secondary)]" />
                                    <span className="text-[12px] font-extrabold text-[var(--color-on-surface)] mb-0.5">Find Tasks</span>
                                    <span className="text-[11px] font-medium text-[var(--color-text-tertiary)]">Search for overdue tasks</span>
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="absolute top-0 left-0 right-0 h-64 bg-linear-to-b from-[#e84393]/3 via-[#7c5cfc]/3 to-transparent pointer-events-none" />

                        <div className="flex-1 w-full overflow-y-auto px-10 pb-40 pt-10 scrollbar-hide z-10 flex flex-col items-center">
                            <div className="w-full max-w-4xl flex flex-col gap-6">
                                {messages.map((message) => (
                                    <div 
                                        key={message.id} 
                                        className={`flex w-full ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                    >
                                        {message.role === 'user' ? (
                                            <div className="max-w-[70%] rounded-2xl bg-[var(--color-surface-container-high)] px-4 py-2.5 text-[14px] font-medium text-[var(--color-on-surface)]">
                                                {message.content}
                                            </div>
                                        ) : (
                                            <div className="flex w-full max-w-[85%] flex-col">
                                                <div className="mb-2 flex items-center gap-1.5">
                                                    <Sparkles size={16} className="text-[#e84393]" fill="#e84393" strokeWidth={1} />
                                                    <span className="text-[14px] font-bold text-[var(--color-on-surface)]">FlowiseAI</span>
                                                </div>
                                                
                                                {message.isSearching ? (
                                                    <div className="flex items-center gap-2 rounded-lg bg-linear-to-r from-[#e3e8f8]/30 to-transparent py-2 px-3 animate-pulse w-max">
                                                        <Search size={14} className="text-[var(--color-accent)] animate-spin-slow" />
                                                        <span className="text-[13px] font-semibold text-[var(--color-accent)]">Flowise thinking...</span>
                                                    </div>
                                                ) : (
                                                    <div className="text-[14px] font-medium leading-[1.6] text-[var(--color-on-surface)] markdown-content overflow-hidden">
                                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                            {message.content + (message.isStreaming ? ' █' : '')}
                                                        </ReactMarkdown>
                                                    </div>
                                                )}
                                                
                                                {!message.isStreaming && !message.isSearching && (
                                                    <div className="mt-3 flex items-center gap-1">
                                                        <button className="flex h-7 w-7 items-center justify-center rounded text-[var(--color-text-tertiary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-secondary)] transition-colors">
                                                            <Copy size={13} />
                                                        </button>
                                                        <button className="flex h-7 w-7 items-center justify-center rounded text-[var(--color-text-tertiary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-secondary)] transition-colors">
                                                            <CheckSquare size={13} />
                                                        </button>
                                                        <button className="flex h-7 w-7 items-center justify-center rounded text-[var(--color-text-tertiary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-secondary)] transition-colors">
                                                            <FileText size={13} />
                                                        </button>
                                                    </div>
                                                )}

                                                {/* Follow-ups Section */}
                                                {!message.isStreaming && !message.isSearching && message.followUps && message.followUps.length > 0 && (
                                                    <div className="mt-5 w-max">
                                                        <div className="flex flex-col gap-2">
                                                            {message.followUps.map((prompt, idx) => (
                                                                <button 
                                                                    key={idx}
                                                                    onClick={() => handleSendMessage(prompt)}
                                                                    className="flex items-center gap-1.5 rounded-full border border-[var(--color-border-light)] bg-[var(--color-surface-container-lowest)] px-3 py-1.5 text-left text-[13px] font-medium text-[var(--color-text-secondary)] shadow-[0_2px_4px_rgb(0,0,0,0.02)] transition-all hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] hover:shadow-sm"
                                                                >
                                                                    <span className="text-[var(--color-text-tertiary)]">↳</span> {prompt}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                                <div ref={messagesEndRef} />
                            </div>
                        </div>

                        {/* Floating Input Composer at Bottom */}
                        <div className="absolute bottom-6 left-0 right-0 z-20 flex justify-center w-full px-8">
                            <div className="w-full max-w-4xl relative rounded-3xl p-0.5 bg-linear-to-r from-[#e3e8f8] via-[#fdecf5] to-[#f0ebff] shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                                <div className="flex flex-col rounded-[22px] bg-[var(--color-surface-container-lowest)] pt-2.5 pb-2 px-3">
                                    <textarea
                                        value={inputValue}
                                        onChange={(e) => setInputValue(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleSendMessage();
                                            }
                                        }}
                                        placeholder="Tell AI what to do next"
                                        className="min-h-11 max-h-50 w-full resize-none border-none bg-transparent px-2 py-1 text-[14px] font-medium text-[var(--color-on-surface)] outline-none placeholder:text-[var(--color-text-tertiary)] scrollbar-hide"
                                    />
                                    
                                    <div className="mt-2 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <button className="flex h-7 w-7 items-center justify-center rounded bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-hover)]">
                                                <Plus size={14} />
                                            </button>
                                            <div className="flex items-center gap-1.5 px-2">
                                                <Sparkles size={14} className="text-[#e84393]" fill="#e84393" strokeWidth={1} />
                                                <span className="text-[13px] font-bold text-[var(--color-text-secondary)]">FlowiseAI</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <button className="flex items-center gap-1.5 px-2 py-1.5 rounded hover:bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] transition-colors">
                                                <Globe size={13} />
                                                <span className="text-[12px] font-semibold">All sources</span>
                                                <ArrowRight size={10} className="rotate-90 ml-0.5" />
                                            </button>
                                            
                                            <button 
                                                onClick={() => handleSendMessage()}
                                                disabled={!inputValue.trim() || isGenerating}
                                                className={`flex h-7 w-7 items-center justify-center rounded-full transition-all ${
                                                    inputValue.trim() 
                                                        ? 'bg-[var(--color-surface-container-high)] text-[var(--color-on-surface)] hover:bg-[#dcdfe4]' 
                                                        : 'bg-[var(--color-surface-hover)] text-[var(--color-text-tertiary)]'
                                                }`}
                                            >
                                                <ArrowRight size={14} strokeWidth={2.5} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
