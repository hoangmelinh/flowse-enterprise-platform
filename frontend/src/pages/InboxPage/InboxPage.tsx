import { useState, useEffect, useRef, useCallback } from 'react';
import { Hash, Plus, Send, MessageSquare, X, FileText, Cloud, Paperclip } from 'lucide-react';
import { Spin } from 'antd';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useAppSelector } from '../../hooks';
import * as msgApi from '../../api/messages';
import { uploadFile } from '../../api/upload';
import type { ConversationData, MessageData } from '../../api/messages';
import { fetchWorkspaceMembers } from '../../store/modules/workspaces';
import { useAppDispatch } from '../../hooks';

function timeAgo(iso: string, locale: string) {
    const d = new Date(iso);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
    const y = new Date(now); y.setDate(y.getDate() - 1);
    if (d.toDateString() === y.toDateString()) return locale === 'vi' ? 'Hôm qua' : 'Yesterday';
    return d.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
}

function initials(name: string) {
    return name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
}

const COLORS = ['var(--color-primary)', 'var(--color-tertiary)', '#00b894', '#e84393', '#fdcb6e', '#e74c3c', '#00cec9', '#6c5ce7'];
function colorFor(id: number) { return COLORS[id % COLORS.length]; }

export default function InboxPage() {
    const { t, i18n } = useTranslation('common');
    const dispatch = useAppDispatch();
    const currentWsId = useAppSelector(s => s.workspaces.currentWorkspaceId);
    const wsMembers = useAppSelector(s => s.workspaces.listWorkspaceMembers);
    const currentUser = useAppSelector(s => s.auth.signIn?.user);
    const spaces = useAppSelector(s => s.spaces.listSpaces);

    const [convos, setConvos] = useState<ConversationData[]>([]);
    const [activeId, setActiveId] = useState<number | null>(null);
    const [messages, setMessages] = useState<MessageData[]>([]);
    const [input, setInput] = useState('');
    
    // Local File Upload State
    const [attachedFile, setAttachedFile] = useState<{url: string, name: string, mimeType: string} | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Modals
    const [showNewDM, setShowNewDM] = useState(false);
    const [showNewChannel, setShowNewChannel] = useState(false);
    const [channelName, setChannelName] = useState('');
    const [selectedMembers, setSelectedMembers] = useState<number[]>([]);

    const msgEndRef = useRef<HTMLDivElement>(null);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Load conversations
    const loadConvos = useCallback(async () => {
        if (!currentWsId) return;
        try {
            const data = await msgApi.getConversations(currentWsId);
            setConvos(data);
        } catch { /* ignore */ }
    }, [currentWsId]);

     
    useEffect(() => {
        loadConvos();
        if (currentWsId) dispatch(fetchWorkspaceMembers(currentWsId));
    }, [currentWsId, loadConvos, dispatch]);

    // Load messages for active conversation
    const loadMessages = useCallback(async () => {
        if (!activeId) return;
        try {
            const data = await msgApi.getMessages(activeId);
            setMessages(data);
        } catch { /* ignore */ }
    }, [activeId]);

     
    useEffect(() => {
        loadMessages();
        // Poll every 3s
        if (pollRef.current) clearInterval(pollRef.current);
        if (activeId) {
            pollRef.current = setInterval(loadMessages, 3000);
        }
        return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }, [activeId, loadMessages]);

    // Auto-scroll
    useEffect(() => { msgEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

    // Send message
    const handleSend = async () => {
        if ((!input.trim() && !attachedFile) || !activeId) return;
        try {
            const msg = await msgApi.sendMessage(activeId, input.trim(), attachedFile);
            setMessages(prev => [...prev, msg]);
            setInput('');
            setAttachedFile(null);
            loadConvos(); // refresh sidebar last_message
        } catch { toast.error(t('errors.genericError')); }
    };

    // Local file upload handler
    const handleFileUpload = async (file: File) => {
        try {
            setIsUploading(true);
            const uploadRes = await uploadFile(file);
            const { file_name, file_url, mime_type } = uploadRes.file;
            setAttachedFile({
                name: file_name,
                url: file_url,
                mimeType: mime_type || 'application/octet-stream'
            });
        } catch (error) {
            console.error('Lỗi upload:', error);
            toast.error('Không thể tải file lên');
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleFileUpload(file);
    };

    // Start DM
    const handleStartDM = async (targetId: number) => {
        if (!currentWsId) return;
        try {
            const { conversation_id } = await msgApi.startDirect(currentWsId, targetId);
            setShowNewDM(false);
            await loadConvos();
            setActiveId(conversation_id);
        } catch { toast.error(t('errors.genericError')); }
    };

    // Create channel
    const handleCreateChannel = async () => {
        if (!currentWsId || !channelName.trim()) return;
        try {
            await msgApi.createChannel(currentWsId, channelName.trim(), selectedMembers);
            setShowNewChannel(false);
            setChannelName('');
            setSelectedMembers([]);
            await loadConvos();
            toast.success(t('buttons.submit'));
        } catch { toast.error(t('errors.genericError')); }
    };

    // Helpers
    const activeConvo = convos.find(c => c.conversation_id === activeId);
    const channels = convos.filter(c => c.type === 'CHANNEL');
    const directs = convos.filter(c => c.type === 'DIRECT');
    const spaceChats = convos.filter(c => c.type === 'SPACE');

    function convoName(c: ConversationData): string {
        if (c.type === 'CHANNEL' || c.type === 'SPACE') return c.name || 'Chat';
        const other = c.members?.find(m => m.user_id !== currentUser?.user_id);
        return other?.name || 'Direct Message';
    }

    return (
        <div className="flex h-full overflow-hidden bg-[var(--color-surface-container-lowest)] font-['Plus_Jakarta_Sans',sans-serif]">
            {/* ═══ Sidebar ═══ */}
            <div className="flex w-64 shrink-0 flex-col border-r border-[var(--color-surface-container-highest)] bg-[var(--color-surface-container-low)]">
                <div className="flex items-center justify-between border-b border-[var(--color-surface-container-highest)] px-4 py-4">
                    <h2 className="m-0 text-h2 font-black text-[var(--color-on-surface)]">Chat</h2>
                </div>
                <div className="flex-1 overflow-y-auto px-2 py-3">
                    {/* Space Chats */}
                    {spaceChats.length > 0 && (
                        <>
                            <div className="mb-1 flex items-center justify-between px-3 text-micro font-extrabold tracking-widest text-[var(--color-text-tertiary)]">SPACES</div>
                            {spaceChats.map(c => (
                                <button key={c.conversation_id} onClick={() => setActiveId(c.conversation_id)}
                                    className={`flex w-full cursor-pointer items-center gap-2.5 rounded-lg border-none px-3 py-2 text-body-sm font-bold transition-all ${activeId === c.conversation_id ? 'bg-[var(--color-primary-bg)] text-[var(--color-primary)]' : 'bg-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-primary-bg)]'}`}>
                                    <Hash size={15} className={activeId === c.conversation_id ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-tertiary)]'} />
                                    <span className="truncate">{c.name}</span>
                                </button>
                            ))}
                        </>
                    )}

                    {/* Channels */}
                    <div className="mb-1 mt-4 flex items-center justify-between px-3 text-micro font-extrabold tracking-widest text-[var(--color-text-tertiary)]">
                        <span>CHANNELS</span>
                        <Plus size={14} className="cursor-pointer hover:text-[var(--color-primary)] text-[var(--color-text-tertiary)]" onClick={() => setShowNewChannel(true)} />
                    </div>
                    {channels.length === 0 && <div className="px-3 py-2 text-caption text-[var(--color-text-tertiary)]">{t('workspace.noWorkspace')}</div>}
                    {channels.map(c => (
                        <button key={c.conversation_id} onClick={() => setActiveId(c.conversation_id)}
                            className={`flex w-full cursor-pointer items-center gap-2.5 rounded-lg border-none px-3 py-2 text-body-sm font-bold transition-all ${activeId === c.conversation_id ? 'bg-[var(--color-primary-bg)] text-[var(--color-primary)]' : 'bg-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-primary-bg)]'}`}>
                            <Hash size={15} className={activeId === c.conversation_id ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-tertiary)]'} />
                            <span className="truncate">{c.name}</span>
                            {(c.message_count || 0) > 0 && <span className="ml-auto text-[10px] text-[var(--color-text-tertiary)]">{c.message_count}</span>}
                        </button>
                    ))}

                    {/* Direct Messages */}
                    <div className="mb-1 mt-4 flex items-center justify-between px-3 text-micro font-extrabold tracking-widest text-[var(--color-text-tertiary)]">
                        <span>DIRECT MESSAGES</span>
                        <Plus size={14} className="cursor-pointer hover:text-[var(--color-primary)] text-[var(--color-text-tertiary)]" onClick={() => setShowNewDM(true)} />
                    </div>
                    {directs.length === 0 && <div className="px-3 py-2 text-caption text-[var(--color-text-tertiary)]">No messages</div>}
                    {directs.map(c => {
                        const other = c.members?.find(m => m.user_id !== currentUser?.user_id);
                        const name = other?.name || 'User';
                        return (
                            <button key={c.conversation_id} onClick={() => setActiveId(c.conversation_id)}
                                className={`flex w-full cursor-pointer items-center gap-2.5 rounded-lg border-none px-3 py-1.5 text-body-sm font-bold transition-all ${activeId === c.conversation_id ? 'bg-[var(--color-primary-bg)] text-[var(--color-primary)]' : 'bg-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-primary-bg)]'}`}>
                                <div className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ backgroundColor: colorFor(other?.user_id || 0) }}>
                                    {initials(name)}
                                </div>
                                <span className="truncate flex-1">{name}</span>
                                {c.last_message && <span className="text-[10px] text-[var(--color-text-tertiary)]">{timeAgo(c.last_message.created_at, i18n.language)}</span>}
                            </button>
                        );
                    })}

                    {/* Init space chats */}
                    {spaces && spaces.length > 0 && spaceChats.length === 0 && currentWsId && (
                        <button className="mt-4 flex w-full cursor-pointer items-center gap-2 rounded-lg border border-dashed border-[var(--color-outline)] bg-transparent px-3 py-2 text-caption font-semibold text-[var(--color-text-tertiary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                            onClick={async () => {
                                for (const sp of spaces) {
                                    await msgApi.getOrCreateSpaceChat(currentWsId, sp.spaceId, sp.name);
                                }
                                loadConvos();
                            }}>
                            <Hash size={14} /> Create Space Chat
                        </button>
                    )}
                </div>
            </div>

            {/* ═══ Main Chat ═══ */}
            <div className="flex min-w-0 flex-1 flex-col bg-[var(--color-surface-container-lowest)]">
                {!activeConvo ? (
                    <div className="flex flex-1 items-center justify-center">
                        <div className="text-center">
                            <MessageSquare size={48} className="mx-auto mb-3 text-[var(--color-text-tertiary)] opacity-50" />
                            <p className="text-body font-bold text-[var(--color-text-secondary)]">Select a conversation</p>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Header */}
                        <div className="flex h-14 shrink-0 items-center justify-between border-b border-[var(--color-surface-container-highest)] px-6 bg-[var(--color-surface-container-lowest)]">
                            <div className="flex items-center gap-3">
                                {activeConvo.type === 'DIRECT' ? (
                                    <div className="flex h-8 w-8 items-center justify-center rounded-full text-caption font-bold text-white" style={{ backgroundColor: colorFor(activeConvo.conversation_id) }}>
                                        {initials(convoName(activeConvo))}
                                    </div>
                                ) : (
                                    <div className="flex h-8 w-8 items-center justify-center rounded bg-[var(--color-primary-bg)]"><Hash size={18} className="text-[var(--color-primary)]" /></div>
                                )}
                                <div>
                                    <h3 className="m-0 text-body font-extrabold text-[var(--color-on-surface)]">{activeConvo.type === 'DIRECT' ? convoName(activeConvo) : `# ${activeConvo.name}`}</h3>
                                    <div className="text-[11px] font-semibold text-[var(--color-text-tertiary)]">{activeConvo.members?.length || 0} members</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                <div className="flex -space-x-1.5">
                                    {activeConvo.members?.slice(0, 4).map(m => (
                                        <div key={m.user_id} className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-[var(--color-surface-container-lowest)] text-micro font-bold text-white" style={{ backgroundColor: colorFor(m.user_id) }}>
                                            {initials(m.name)}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                            {messages.length === 0 && (
                                <div className="flex items-center justify-center py-20 text-body-sm text-[var(--color-text-tertiary)]">No messages yet. Send the first one!</div>
                            )}
                            {messages.map((msg, i) => {
                                const showAvatar = i === 0 || messages[i - 1].sender_id !== msg.sender_id;
                                return (
                                    <div key={msg.message_id} className={`group flex gap-3 ${showAvatar ? 'mt-3' : 'mt-0.5'}`}>
                                        {showAvatar ? (
                                            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-caption font-bold text-white" style={{ backgroundColor: colorFor(msg.sender_id) }}>
                                                {initials(msg.sender_name)}
                                            </div>
                                        ) : <div className="w-8" />}
                                        <div className="min-w-0 flex-1">
                                            {showAvatar && (
                                                <div className="mb-0.5 flex items-baseline gap-2">
                                                    <span className="text-body-sm font-bold text-[var(--color-on-surface)]">{msg.sender_name}</span>
                                                    <span className="text-[11px] font-semibold text-[var(--color-text-tertiary)]">{timeAgo(msg.created_at, i18n.language)}</span>
                                                </div>
                                            )}
                                            {msg.content && <div className="text-body font-medium leading-relaxed text-[var(--color-text-secondary)] whitespace-pre-wrap">{msg.content}</div>}
                                            {msg.file_url && (
                                                <div className="mt-2">
                                                    {(() => {
                                                        const isExternal = msg.file_url.startsWith('http');
                                                        const fileUrl = isExternal ? msg.file_url : `http://localhost:5001${msg.file_url}`;
                                                        const isImage = msg.file_type?.startsWith('image/') && !isExternal; 
                                                        
                                                        return isImage ? (
                                                            <a href={fileUrl} target="_blank" rel="noreferrer">
                                                                <img src={fileUrl} alt={msg.file_name || 'image'} className="max-w-[300px] max-h-[250px] object-cover rounded-lg border border-[var(--color-surface-container-highest)]" />
                                                            </a>
                                                        ) : (
                                                            <a href={fileUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 w-max rounded-lg border border-[var(--color-surface-container-highest)] bg-[var(--color-surface-container-low)] px-3 py-2 text-[var(--color-primary)] hover:bg-[var(--color-primary-bg)] no-underline">
                                                                {isExternal ? <Cloud size={18} /> : <FileText size={18} />}
                                                                <span className="text-body-sm font-semibold max-w-[200px] truncate">{msg.file_name}</span>
                                                            </a>
                                                        );
                                                    })()}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={msgEndRef} />
                        </div>

                        {/* Composer */}
                        <div className="px-6 pb-5 pt-2">
                            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-container-lowest)] shadow-sm transition-all focus-within:border-[var(--color-primary)] focus-within:shadow-md">
                                <textarea
                                    value={input}
                                    onChange={e => setInput(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                                    placeholder={`Message ${activeConvo.type === 'DIRECT' ? convoName(activeConvo) : '#' + activeConvo.name}...`}
                                    className="w-full resize-none bg-transparent px-4 py-3 text-body font-medium text-[var(--color-on-surface)] outline-none min-h-[44px] placeholder-[var(--color-text-tertiary)]"
                                    rows={1}
                                />
                                <div className="flex items-center justify-between rounded-b-xl bg-[var(--color-surface-container-low)] px-3 py-2 border-t border-[var(--color-border)]">
                                    <div className="flex items-center gap-2">
                                        <input 
                                            type="file" 
                                            ref={fileInputRef} 
                                            className="hidden" 
                                            onChange={handleFileChange}
                                        />
                                        <button 
                                            className={`cursor-pointer border-none bg-transparent p-1.5 text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-primary)] rounded-md transition-colors ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
                                            onClick={() => fileInputRef.current?.click()}
                                            title="Đính kèm tài liệu"
                                        >
                                            {isUploading ? <Spin size="small" /> : <Paperclip size={18} />}
                                        </button>

                                        {attachedFile && (
                                            <div className="flex items-center gap-1.5 px-3 py-1 bg-[var(--color-primary-bg)] rounded-full text-caption font-semibold text-[var(--color-primary)] border border-[var(--color-primary-border)]">
                                                <Paperclip size={12} />
                                                <span className="max-w-[150px] truncate">{attachedFile.name}</span>
                                                <X size={14} className="cursor-pointer hover:text-[var(--color-error)]" onClick={() => setAttachedFile(null)} />
                                            </div>
                                        )}
                                    </div>
                                    <button onClick={handleSend}
                                        className={`flex cursor-pointer items-center gap-1.5 rounded-lg border-none px-4 py-1.5 text-body-sm font-bold transition-all ${(input.trim() || attachedFile) ? 'bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)]' : 'bg-[var(--color-surface-variant)] text-[var(--color-text-tertiary)] pointer-events-none'}`}>
                                        {t('buttons.submit')} <Send size={14} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* ═══ Modal: New DM ═══ */}
            {showNewDM && (
                <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/30" onClick={() => setShowNewDM(false)}>
                    <div className="w-96 rounded-xl bg-[var(--color-surface-container-lowest)] p-5 shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="m-0 text-body font-bold text-[var(--color-on-surface)]">New Message</h3>
                            <button className="cursor-pointer border-none bg-transparent text-[var(--color-text-tertiary)] hover:text-[var(--color-on-surface)]" onClick={() => setShowNewDM(false)}><X size={18} /></button>
                        </div>
                        <p className="mb-3 text-body-sm text-[var(--color-text-secondary)]">Select a member:</p>
                        <div className="max-h-60 overflow-y-auto space-y-1">
                            {(wsMembers || []).filter(m => m.user_id !== currentUser?.user_id).map(m => (
                                <button key={m.user_id} onClick={() => handleStartDM(m.user_id)}
                                    className="flex w-full cursor-pointer items-center gap-3 rounded-lg border-none bg-transparent px-3 py-2.5 text-left transition-colors hover:bg-[var(--color-primary-bg)]">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-full text-caption font-bold text-white" style={{ backgroundColor: colorFor(m.user_id) }}>
                                        {initials(m.name)}
                                    </div>
                                    <div>
                                        <div className="text-body-sm font-semibold text-[var(--color-on-surface)]">{m.name}</div>
                                        <div className="text-[11px] text-[var(--color-text-tertiary)]">{m.email}</div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ═══ Modal: New Channel ═══ */}
            {showNewChannel && (
                <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/30" onClick={() => setShowNewChannel(false)}>
                    <div className="w-[420px] rounded-xl bg-[var(--color-surface-container-lowest)] p-5 shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="m-0 text-body font-bold text-[var(--color-on-surface)]">Create Channel</h3>
                            <button className="cursor-pointer border-none bg-transparent text-[var(--color-text-tertiary)] hover:text-[var(--color-on-surface)]" onClick={() => setShowNewChannel(false)}><X size={18} /></button>
                        </div>
                        <input value={channelName} onChange={e => setChannelName(e.target.value)}
                            placeholder="Channel name..." className="mb-3 w-full rounded-lg border border-[var(--color-border)] bg-transparent text-[var(--color-on-surface)] px-3 py-2.5 text-body-sm outline-none focus:border-[var(--color-primary)]" />
                        <p className="mb-2 text-caption font-bold text-[var(--color-text-tertiary)]">Add members:</p>
                        <div className="max-h-48 overflow-y-auto space-y-1 mb-4">
                            {(wsMembers || []).filter(m => m.user_id !== currentUser?.user_id).map(m => (
                                <label key={m.user_id} className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 hover:bg-[var(--color-primary-bg)] text-[var(--color-on-surface)]">
                                    <input type="checkbox" checked={selectedMembers.includes(m.user_id)}
                                        onChange={() => setSelectedMembers(prev => prev.includes(m.user_id) ? prev.filter(id => id !== m.user_id) : [...prev, m.user_id])}
                                        className="h-4 w-4 accent-[var(--color-primary)]" />
                                    <div className="flex h-7 w-7 items-center justify-center rounded-full text-micro font-bold text-white" style={{ backgroundColor: colorFor(m.user_id) }}>
                                        {initials(m.name)}
                                    </div>
                                    <span className="text-body-sm font-semibold">{m.name}</span>
                                </label>
                            ))}
                        </div>
                        <button onClick={handleCreateChannel} disabled={!channelName.trim()}
                            className="w-full cursor-pointer rounded-lg border-none bg-[var(--color-primary)] py-2.5 text-body-sm font-bold text-white transition-colors hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:bg-[var(--color-surface-variant)]">
                            {t('buttons.create')}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
