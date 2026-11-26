import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { message as antdMessage, Tag, Button } from 'antd';
import type { AppDispatch } from '@/store/configureStore';
import { fetchAIChat } from '@/store/modules/ai';
import type { AIChatMessage, ChatSession } from '@/types/ai';
import {
    workWithAI,
    listAiActions,
    applyAiAction,
    cancelAiAction,
    type AiWorkAction,
} from '@/api/ai';
import { 
    Sparkles, 
    Plus, 
    Globe, 
    ArrowRight, 
    Copy, 
    CheckSquare, 
    FileText,
    History,
    Edit,
    Search,
    PanelLeftClose,
    PanelLeftOpen,
    Trash2,
    AlertTriangle,
    Wrench,
    Bot,
    CheckCircle2,
    XCircle,
    ListChecks
} from 'lucide-react';
import { ActionCard } from '@/components/ActionCard';

interface WorkMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    action?: AiWorkAction | null;
}

export default function AIPage() {
    const dispatch = useDispatch<AppDispatch>();
    const { t } = useTranslation('common');
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [aiMode, setAiMode] = useState<'ask' | 'work'>('ask');
    const [workMessages, setWorkMessages] = useState<WorkMessage[]>([]);
    const [workActions, setWorkActions] = useState<AiWorkAction[]>([]);
    const [showActionHistory, setShowActionHistory] = useState(false);
    const [processingActionId, setProcessingActionId] = useState<number | null>(null);
    
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
    }, [messages, workMessages]);

    const loadWorkActions = useCallback(async () => {
        try {
            const res = await listAiActions();
            if (Array.isArray(res?.data)) {
                setWorkActions(res.data);
            }
        } catch {
            // Ignore when unauthenticated or endpoint offline
        }
    }, []);

    useEffect(() => {
        if (aiMode === 'work' || showActionHistory) {
            loadWorkActions();
        }
    }, [aiMode, showActionHistory, loadWorkActions]);

    const handleApplyWorkAction = async (actionId: number) => {
        try {
            setProcessingActionId(actionId);
            const res = await applyAiAction(actionId);
            const updated = res?.data;
            if (updated) {
                setWorkActions((prev) => prev.map((a) => (a.action_id === actionId ? updated : a)));
                setWorkMessages((prev) =>
                    prev.map((m) => (m.action?.action_id === actionId ? { ...m, action: updated } : m))
                );
            }
            antdMessage.success('Đã thực thi đề xuất AI Work Mode');
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
            antdMessage.error(msg || 'Không thể thực thi đề xuất');
        } finally {
            setProcessingActionId(null);
        }
    };

    const handleCancelWorkAction = async (actionId: number) => {
        try {
            setProcessingActionId(actionId);
            const res = await cancelAiAction(actionId);
            const updated = res?.data;
            if (updated) {
                setWorkActions((prev) => prev.map((a) => (a.action_id === actionId ? updated : a)));
                setWorkMessages((prev) =>
                    prev.map((m) => (m.action?.action_id === actionId ? { ...m, action: updated } : m))
                );
            }
            antdMessage.info('Đã hủy đề xuất AI');
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
            antdMessage.error(msg || 'Không thể hủy đề xuất');
        } finally {
            setProcessingActionId(null);
        }
    };

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

        if (aiMode === 'work') {
            const userMsg: WorkMessage = { id: Date.now().toString(), role: 'user', content: text };
            const historyPayload = workMessages.slice(-6).map((m) => ({ role: m.role, content: m.content }));
            setWorkMessages((prev) => [...prev, userMsg]);
            setInputValue('');
            setIsGenerating(true);
            try {
                const res = await workWithAI(text, historyPayload);
                const assistantMsg: WorkMessage = {
                    id: (Date.now() + 1).toString(),
                    role: 'assistant',
                    content: res?.data?.response || 'Đã phân tích yêu cầu.',
                    action: res?.data?.action || null,
                };
                setWorkMessages((prev) => [...prev, assistantMsg]);
                if (res?.data?.action) {
                    loadWorkActions();
                }
            } catch (err: unknown) {
                const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
                setWorkMessages((prev) => [
                    ...prev,
                    {
                        id: (Date.now() + 1).toString(),
                        role: 'assistant',
                        content: msg || 'AI Work Mode đang gặp lỗi kết nối.',
                    },
                ]);
            } finally {
                setIsGenerating(false);
            }
            return;
        }

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
                            followUps: response.suggestions || [],
                            actionCard: response.actionCard
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

                <div className="flex w-60 flex-col gap-1 px-2 mt-2">
                    <button
                        type="button"
                        onClick={() => { setAiMode('ask'); setShowActionHistory(false); }}
                        className={`flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] font-semibold border-none text-left transition-colors ${
                            aiMode === 'ask' && !showActionHistory
                                ? 'bg-[var(--color-primary-bg)] text-[var(--color-primary)]'
                                : 'bg-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]'
                        }`}
                    >
                        <Sparkles size={14} className="text-[#e84393]" />
                        <span>{t('ai.askOrCreate')}</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => { setAiMode('work'); setShowActionHistory(false); }}
                        className={`flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] font-semibold border-none text-left transition-colors ${
                            aiMode === 'work' && !showActionHistory
                                ? 'bg-[var(--color-primary-bg)] text-[var(--color-primary)]'
                                : 'bg-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]'
                        }`}
                    >
                        <Bot size={14} className="text-[#0058be]" />
                        <span>AI Work Mode</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setShowActionHistory((v) => !v)}
                        className={`flex cursor-pointer items-center justify-between rounded-lg px-2.5 py-1.5 text-[13px] font-semibold border-none text-left transition-colors ${
                            showActionHistory
                                ? 'bg-[var(--color-primary-bg)] text-[var(--color-primary)]'
                                : 'bg-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]'
                        }`}
                    >
                        <span className="flex items-center gap-2.5">
                            <ListChecks size={14} />
                            <span>Lịch sử Action</span>
                        </span>
                        {workActions.filter((a) => a.status === 'PENDING').length > 0 && (
                            <Tag color="blue" className="m-0 text-[10px]">
                                {workActions.filter((a) => a.status === 'PENDING').length}
                            </Tag>
                        )}
                    </button>
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
                
                {showActionHistory ? (
                    <div className="flex-1 w-full overflow-y-auto px-8 py-8">
                        <div className="mx-auto max-w-3xl">
                            <div className="mb-5 flex items-center justify-between">
                                <div>
                                    <h2 className="m-0 text-lg font-extrabold text-[var(--color-on-surface)]">
                                        Lịch sử AI Work Mode Actions
                                    </h2>
                                    <p className="mt-1 mb-0 text-xs text-[var(--color-text-secondary)]">
                                        Cơ chế Human-in-the-loop: xem xét và xác nhận trước khi AI ghi dữ liệu vào hệ thống.
                                    </p>
                                </div>
                                <Button size="small" onClick={() => setShowActionHistory(false)}>
                                    Quay lại chat
                                </Button>
                            </div>
                            {workActions.length === 0 ? (
                                <div className="rounded-xl border border-[var(--color-border-light)] bg-white p-8 text-center text-sm text-slate-500">
                                    Chưa có action nào từ AI Work Mode.
                                </div>
                            ) : (
                                <div className="flex flex-col gap-3">
                                    {workActions.map((act) => (
                                        <div key={act.action_id} className="rounded-xl border border-[var(--color-border-light)] bg-white p-4 shadow-2xs">
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-2">
                                                    <Tag color="blue">{act.action_type}</Tag>
                                                    <span className="text-sm font-bold text-slate-900">{act.summary?.title}</span>
                                                </div>
                                                <Tag color={act.status === 'APPLIED' ? 'green' : act.status === 'PENDING' ? 'gold' : 'default'}>
                                                    {act.status}
                                                </Tag>
                                            </div>
                                            {act.summary?.detail && (
                                                <p className="mt-2 mb-0 text-xs text-slate-600">{act.summary.detail}</p>
                                            )}
                                            {act.status === 'PENDING' && (
                                                <div className="mt-3 flex items-center gap-2">
                                                    <Button
                                                        type="primary"
                                                        size="small"
                                                        loading={processingActionId === act.action_id}
                                                        icon={<CheckCircle2 size={13} />}
                                                        onClick={() => handleApplyWorkAction(act.action_id)}
                                                    >
                                                        Xác nhận thực thi
                                                    </Button>
                                                    <Button
                                                        size="small"
                                                        danger
                                                        loading={processingActionId === act.action_id}
                                                        icon={<XCircle size={13} />}
                                                        onClick={() => handleCancelWorkAction(act.action_id)}
                                                    >
                                                        Hủy bỏ
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                ) : aiMode === 'work' ? (
                    <div className="flex h-full w-full flex-col justify-between overflow-hidden">
                        <div className="flex-1 overflow-y-auto px-8 py-8">
                            <div className="mx-auto flex max-w-3xl flex-col gap-4">
                                <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-4">
                                    <div className="flex items-center gap-2 text-sm font-bold text-[#0058be]">
                                        <Bot size={16} />
                                        <span>AI Work Mode — Giao việc & Tạo Task thông minh</span>
                                    </div>
                                    <p className="mt-1 mb-0 text-xs text-slate-600">
                                        Mô tả công việc bạn muốn tạo hoặc phân công. AI sẽ chuẩn bị Action Card để bạn kiểm tra và bấm xác nhận trước khi thực thi.
                                    </p>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {[
                                            'Tạo công việc kiểm tra định kỳ tủ điện phân xưởng A cho Bảo trì hạn ngày mai',
                                            'Tạo task ưu tiên High: kiểm tra rung động trục chính máy CNC-01',
                                        ].map((sample) => (
                                            <button
                                                key={sample}
                                                type="button"
                                                onClick={() => handleSendMessage(sample)}
                                                className="cursor-pointer rounded-full border border-blue-200 bg-white px-3 py-1 text-xs font-medium text-[#0058be] hover:bg-blue-50"
                                            >
                                                {sample}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {workMessages.map((msg) => (
                                    <div key={msg.id} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        {msg.role === 'user' ? (
                                            <div className="max-w-[75%] rounded-2xl bg-[var(--color-surface-container-high)] px-4 py-2.5 text-sm font-medium text-[var(--color-on-surface)]">
                                                {msg.content}
                                            </div>
                                        ) : (
                                            <div className="w-full max-w-[85%] rounded-2xl border border-[var(--color-border-light)] bg-white p-4 shadow-2xs">
                                                <div className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-[#0058be]">
                                                    <Bot size={14} /> Flowse Work Copilot
                                                </div>
                                                <div className="text-sm text-slate-800 whitespace-pre-line">{msg.content}</div>
                                                {msg.action && (
                                                    <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                                                        <div className="flex items-center justify-between gap-2">
                                                            <Tag color="blue">{msg.action.action_type}</Tag>
                                                            <Tag color={msg.action.status === 'APPLIED' ? 'green' : msg.action.status === 'PENDING' ? 'gold' : 'default'}>
                                                                {msg.action.status}
                                                            </Tag>
                                                        </div>
                                                        <div className="mt-1.5 text-sm font-bold text-slate-900">{msg.action.summary?.title}</div>
                                                        {msg.action.summary?.detail && (
                                                            <div className="mt-1 text-xs text-slate-600">{msg.action.summary.detail}</div>
                                                        )}
                                                        {msg.action.status === 'PENDING' && (
                                                            <div className="mt-3 flex items-center gap-2">
                                                                <Button
                                                                    type="primary"
                                                                    size="small"
                                                                    loading={processingActionId === msg.action.action_id}
                                                                    icon={<CheckCircle2 size={13} />}
                                                                    onClick={() => handleApplyWorkAction(msg.action!.action_id)}
                                                                >
                                                                    Áp dụng (Apply)
                                                                </Button>
                                                                <Button
                                                                    size="small"
                                                                    danger
                                                                    loading={processingActionId === msg.action.action_id}
                                                                    icon={<XCircle size={13} />}
                                                                    onClick={() => handleCancelWorkAction(msg.action!.action_id)}
                                                                >
                                                                    Hủy
                                                                </Button>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                                <div ref={messagesEndRef} />
                            </div>
                        </div>

                        <div className="border-t border-[var(--color-border-light)] bg-white px-8 py-4">
                            <div className="mx-auto flex max-w-3xl items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                                <textarea
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSendMessage();
                                        }
                                    }}
                                    placeholder="Nhập lệnh cho AI Work Mode (VD: Tạo công việc kiểm tra máy nén khí)..."
                                    rows={1}
                                    className="flex-1 resize-none border-none bg-transparent text-sm text-slate-900 outline-none"
                                />
                                <Button
                                    type="primary"
                                    shape="circle"
                                    loading={isGenerating}
                                    disabled={!inputValue.trim()}
                                    icon={<ArrowRight size={14} />}
                                    onClick={() => handleSendMessage()}
                                />
                            </div>
                        </div>
                    </div>
                ) : messages.length === 0 ? (
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
                                    <button
                                        type="button"
                                        onClick={() => setAiMode('ask')}
                                        className="flex h-8 cursor-pointer items-center gap-1.5 rounded-t-xl border-none bg-[var(--color-surface-container-lowest)] px-4 text-[13px] font-bold text-[var(--color-primary)] shadow-[0_-2px_10px_rgb(0,0,0,0.02)]"
                                    >
                                        <Sparkles size={12} className="text-[#e84393]" fill="#e84393" /> Ask
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setAiMode('work')}
                                        className="flex h-8 cursor-pointer items-center gap-1.5 rounded-t-xl border-none bg-transparent px-4 text-[13px] font-semibold text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]"
                                    >
                                        <Bot size={12} /> Work Mode
                                    </button>
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
                                <button className="flex flex-1 flex-col justify-start rounded-xl border border-[var(--color-border-light)] bg-[var(--color-surface-container-lowest)] p-3 shadow-sm hover:border-purple-300 hover:-translate-y-0.5 transition-all" onClick={() => handleSendMessage("Tạo sự cố máy CNC-024 bị kẹt phoi trục chính")}>
                                    <AlertTriangle size={14} className="mb-2 text-rose-500" />
                                    <span className="text-[12px] font-extrabold text-[var(--color-on-surface)] mb-0.5">Báo sự cố CNC</span>
                                    <span className="text-[11px] font-medium text-[var(--color-text-tertiary)]">Tạo Action Card sự cố</span>
                                </button>
                                <button className="flex flex-1 flex-col justify-start rounded-xl border border-[var(--color-border-light)] bg-[var(--color-surface-container-lowest)] p-3 shadow-sm hover:border-purple-300 hover:-translate-y-0.5 transition-all" onClick={() => handleSendMessage("Phân tích Downtime và chỉ số MTTR phân xưởng tháng này")}>
                                    <Sparkles size={14} className="mb-2 text-purple-500" />
                                    <span className="text-[12px] font-extrabold text-[var(--color-on-surface)] mb-0.5">Downtime & MTTR</span>
                                    <span className="text-[11px] font-medium text-[var(--color-text-tertiary)]">Tổng hợp hiệu suất vận hành</span>
                                </button>
                                <button className="flex flex-1 flex-col justify-start rounded-xl border border-[var(--color-border-light)] bg-[var(--color-surface-container-lowest)] p-3 shadow-sm hover:border-purple-300 hover:-translate-y-0.5 transition-all" onClick={() => handleSendMessage("Lập lịch bảo trì phòng ngừa định kỳ cho máy CNC-024")}>
                                    <Wrench size={14} className="mb-2 text-indigo-500" />
                                    <span className="text-[12px] font-extrabold text-[var(--color-on-surface)] mb-0.5">Bảo trì phòng ngừa</span>
                                    <span className="text-[11px] font-medium text-[var(--color-text-tertiary)]">Đề xuất lịch bảo dưỡng PM</span>
                                </button>
                                <button className="flex flex-1 flex-col justify-start rounded-xl border border-[var(--color-border-light)] bg-[var(--color-surface-container-lowest)] p-3 shadow-sm hover:border-purple-300 hover:-translate-y-0.5 transition-all" onClick={() => handleSendMessage("Tìm các task quá hạn cần ưu tiên xử lý")}>
                                    <Search size={14} className="mb-2 text-amber-500" />
                                    <span className="text-[12px] font-extrabold text-[var(--color-on-surface)] mb-0.5">Task quá hạn</span>
                                    <span className="text-[11px] font-medium text-[var(--color-text-tertiary)]">Rà soát việc trễ hạn</span>
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

                                                {/* Render Action Card if attached */}
                                                {!message.isSearching && message.actionCard && (
                                                    <div className="mt-3 w-full max-w-xl">
                                                        <ActionCard 
                                                            card={message.actionCard}
                                                            onExecuteSuccess={() => {
                                                                setSessions(prev => prev.map(s => 
                                                                    s.id === activeSessionId
                                                                        ? {
                                                                            ...s,
                                                                            messages: s.messages.map(m => 
                                                                                m.id === message.id && m.actionCard
                                                                                    ? { ...m, actionCard: { ...m.actionCard, status: 'EXECUTED' } }
                                                                                    : m
                                                                            )
                                                                        }
                                                                        : s
                                                                ));
                                                            }}
                                                        />
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
