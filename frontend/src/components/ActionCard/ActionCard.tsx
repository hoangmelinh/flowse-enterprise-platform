import React, { useState } from 'react';
import { Tag, Button, message, Tooltip, notification } from 'antd';
import { useNavigate } from 'react-router-dom';
import { 
    Sparkles, 
    CheckCircle2, 
    AlertTriangle, 
    Cpu, 
    ShieldCheck, 
    ArrowRight, 
    Wrench, 
    Clock, 
    Flame 
} from 'lucide-react';
import type { ActionCardData } from '@/types/ai';
import { reportIncident } from '@/api/incidents';

interface ActionCardProps {
    card: ActionCardData;
    onExecuteSuccess?: (result: any, card: ActionCardData) => void;
    onDismiss?: (cardId: string) => void;
    onEdit?: (card: ActionCardData) => void;
    className?: string;
}

export const ActionCard: React.FC<ActionCardProps> = ({
    card: initialCard,
    onExecuteSuccess,
    onDismiss,
    onEdit,
    className = ''
}) => {
    const navigate = useNavigate();
    const [card, setCard] = useState<ActionCardData>(initialCard);
    const [executing, setExecuting] = useState(false);

    const severityConfig = {
        CRITICAL: {
            bg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30',
            badge: 'P1 - NGUY CẤP',
            icon: Flame,
        },
        HIGH: {
            bg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
            badge: 'P2 - CAO',
            icon: AlertTriangle,
        },
        MEDIUM: {
            bg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30',
            badge: 'P3 - TRUNG BÌNH',
            icon: Clock,
        },
        LOW: {
            bg: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30',
            badge: 'P4 - THẤP',
            icon: CheckCircle2,
        },
        NORMAL: {
            bg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30',
            badge: 'TIÊU CHUẨN',
            icon: Clock,
        }
    };

    const sev = (card.severity || card.payload.severity || 'HIGH').toUpperCase() as keyof typeof severityConfig;
    const currentSev = severityConfig[sev] || severityConfig.HIGH;
    const SevIcon = currentSev.icon;

    React.useEffect(() => {
        setCard(initialCard);
    }, [initialCard]);

    const handleConfirm = async () => {
        if (executing || card.status === 'EXECUTED') return;
        try {
            setExecuting(true);
            setCard(prev => ({ ...prev, status: 'EXECUTING' }));

            if (card.action_type === 'CREATE_INCIDENT' || card.action_type === 'SCHEDULE_MAINTENANCE') {
                const res = await reportIncident({
                    title: card.payload.title || card.title,
                    symptom: card.payload.symptom || card.payload.description || card.title,
                    asset_id: card.asset_id || card.payload.asset_id || undefined,
                    severity: card.severity || card.payload.severity || 'HIGH'
                });

                setCard(prev => ({
                    ...prev,
                    status: 'EXECUTED',
                    execution_result: {
                        success: true,
                        message: 'Đã tạo sự cố thành công & kích hoạt theo dõi SLA.',
                        created_id: res?.data?.incident_id || res?.data?.task_id,
                        link: `/incidents`
                    }
                }));

                notification.success({
                    message: `✅ Đã tạo Sự cố cho máy ${card.asset_code || 'thiết bị'}!`,
                    description: `Phiếu sự cố đã được ghi vào CSDL và kích hoạt đồng hồ cam kết SLA thời gian thực.`,
                    btn: (
                        <Button 
                            type="primary" 
                            size="small" 
                            onClick={() => navigate('/incidents')}
                            className="bg-indigo-600 hover:bg-indigo-500 font-semibold text-xs"
                        >
                            Xem tại Sự cố (Field) →
                        </Button>
                    ),
                    duration: 7
                });
                onExecuteSuccess?.(res, card);
            } else {
                // Task creation or other action
                setCard(prev => ({
                    ...prev,
                    status: 'EXECUTED',
                    execution_result: {
                        success: true,
                        message: 'Đã tiếp nhận và đưa vào hàng đợi điều phối.',
                        link: `/home`
                    }
                }));

                notification.success({
                    message: `✅ Đã tạo Thẻ công việc thành công!`,
                    description: `Công việc đã được đưa vào danh sách điều phối tại bảng Kanban / Tasks.`,
                    btn: (
                        <Button 
                            type="primary" 
                            size="small" 
                            onClick={() => navigate('/home')}
                            className="bg-purple-600 hover:bg-purple-500 font-semibold text-xs"
                        >
                            Xem tại Trang chủ →
                        </Button>
                    ),
                    duration: 7
                });
                onExecuteSuccess?.({ success: true }, card);
            }
        } catch (err: any) {
            setCard(prev => ({ ...prev, status: 'PENDING' }));
            message.error(err?.message || 'Không thể thực thi Thẻ Hành Động.');
        } finally {
            setExecuting(false);
        }
    };

    const handleCancel = () => {
        setCard(prev => ({ ...prev, status: 'DISMISSED' }));
        onDismiss?.(card.card_id);
    };

    if (card.status === 'DISMISSED') {
        return (
            <div className={`p-3 rounded-xl border border-dashed border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30 text-xs text-gray-400 flex items-center justify-between ${className}`}>
                <span className="line-through">Thẻ Hành Động: {card.title} (Đã hủy)</span>
                <Button size="small" type="text" onClick={() => setCard(prev => ({ ...prev, status: 'PENDING' }))}>
                    Khôi phục
                </Button>
            </div>
        );
    }

    if (card.status === 'EXECUTED') {
        return (
            <div className={`p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/20 shadow-sm transition-all ${className}`}>
                <div className="flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                        <CheckCircle2 size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                                Đã thực thi thành công
                            </span>
                            <Tag color="success" className="text-[10px] font-semibold">
                                Human Confirmed
                            </Tag>
                        </div>
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mt-0.5 truncate">
                            {card.title}
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {card.execution_result?.message || 'Quy trình đã được khởi tạo và ghi vào cơ sở dữ liệu.'}
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`relative overflow-hidden rounded-2xl border border-purple-500/30 bg-linear-to-b from-white via-white to-purple-50/20 dark:from-gray-900 dark:via-gray-900 dark:to-purple-950/20 p-4 shadow-md shadow-purple-500/5 transition-all hover:shadow-lg hover:shadow-purple-500/10 ${className}`}>
            {/* Top AI Ambient Glow */}
            <div className="absolute -top-12 -right-12 w-28 h-28 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />

            {/* Header: AI Badge, Confidence & Severity */}
            <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-1.5">
                    <div className="flex items-center justify-center w-5 h-5 rounded-md bg-linear-to-tr from-purple-600 to-indigo-600 text-white shadow-xs">
                        <Sparkles size={11} />
                    </div>
                    <span className="text-xs font-bold text-purple-700 dark:text-purple-300 tracking-tight">
                        Enterprise Action Card
                    </span>
                    <Tooltip title="Độ tin cậy trích xuất thực thể theo mô hình Llama 3.3">
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 font-medium">
                            {card.confidence ? `${Math.round(card.confidence * 100)}%` : '95%'} tin cậy
                        </span>
                    </Tooltip>
                </div>

                <div className="flex items-center gap-1.5">
                    <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md border ${currentSev.bg}`}>
                        <SevIcon size={12} />
                        {currentSev.badge}
                    </span>
                </div>
            </div>

            {/* Title & Subtitle */}
            <div className="mb-3">
                <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 leading-snug">
                    {card.title}
                </h3>
                {card.subtitle && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {card.subtitle}
                    </p>
                )}
            </div>

            {/* Equipment & Parameter Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2.5 rounded-xl bg-gray-50/80 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 mb-3 text-xs">
                {card.asset_code && (
                    <div className="flex items-center gap-2">
                        <Cpu size={14} className="text-purple-500 shrink-0" />
                        <span className="text-gray-500">Thiết bị:</span>
                        <span className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                            {card.asset_code} {card.asset_name ? `(${card.asset_name})` : ''}
                        </span>
                    </div>
                )}
                <div className="flex items-center gap-2">
                    <Wrench size={14} className="text-indigo-500 shrink-0" />
                    <span className="text-gray-500">Hành động:</span>
                    <span className="font-semibold text-gray-900 dark:text-gray-100">
                        {card.action_type === 'CREATE_INCIDENT' ? 'Báo cáo sự cố FSM' : 
                         card.action_type === 'SCHEDULE_MAINTENANCE' ? 'Lập phiếu bảo trì PM' : 'Tạo nhiệm vụ công việc'}
                    </span>
                </div>
                {card.payload.symptom && (
                    <div className="col-span-full flex items-start gap-2 pt-1 border-t border-gray-200/60 dark:border-gray-700/60">
                        <span className="text-gray-500 shrink-0 mt-0.5">Triệu chứng:</span>
                        <span className="text-gray-800 dark:text-gray-200 italic line-clamp-2">
                            "{card.payload.symptom}"
                        </span>
                    </div>
                )}
            </div>

            {/* Safety Banner (Human-in-the-loop) */}
            <div className="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-400 mb-3.5">
                <ShieldCheck size={13} className="text-emerald-500 shrink-0" />
                <span>Hành động chưa ghi vào CSDL. Cần bạn duyệt xác nhận.</span>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800 print:hidden">
                <Button
                    size="small"
                    onClick={handleCancel}
                    disabled={executing}
                    className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400"
                >
                    Hủy bỏ
                </Button>

                {onEdit && (
                    <Button
                        size="small"
                        onClick={() => onEdit(card)}
                        disabled={executing}
                        className="text-xs"
                    >
                        Chỉnh sửa
                    </Button>
                )}

                <Button
                    type="primary"
                    size="small"
                    loading={executing}
                    onClick={handleConfirm}
                    className="bg-linear-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 border-none font-semibold text-xs shadow-xs flex items-center gap-1"
                >
                    {executing ? (
                        <>Đang xử lý...</>
                    ) : (
                        <>
                            Xác nhận thực hiện
                            <ArrowRight size={12} className="inline ml-0.5" />
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
};

export default ActionCard;
