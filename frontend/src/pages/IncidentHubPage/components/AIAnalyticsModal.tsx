import React, { useEffect, useState } from 'react';
import { Modal, Segmented, Button, Spin, Tag, Progress } from 'antd';
import { 
    Sparkles, 
    RotateCw, 
    Gauge, 
    Timer, 
    AlertTriangle, 
    CheckCircle2, 
    Flame,
    FileText,
    TrendingUp,
    Wrench,
    Zap
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getAIAnalyticsSummary } from '@/api/ai';
import type { AIAnalyticsSummaryResponse } from '@/types/ai';
import { ActionCard } from '@/components/ActionCard';

interface AIAnalyticsModalProps {
    open: boolean;
    onClose: () => void;
    currentPeriod?: string;
    onIncidentCreated?: () => void;
}

export const AIAnalyticsModal: React.FC<AIAnalyticsModalProps> = ({
    open,
    onClose,
    currentPeriod = 'month',
    onIncidentCreated
}) => {
    const [period, setPeriod] = useState<string>(currentPeriod);
    const [loading, setLoading] = useState<boolean>(false);
    const [data, setData] = useState<AIAnalyticsSummaryResponse | null>(null);

    const fetchSummary = async (targetPeriod: string = period) => {
        try {
            setLoading(true);
            const res = await getAIAnalyticsSummary(targetPeriod);
            if (res?.data) {
                setData(res.data);
            }
        } catch (err) {
            console.error("Failed to load AI analytics summary:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (open) {
            fetchSummary(period);
        }
    }, [open, period]);

    const getHealthConfig = (score: number, status: string) => {
        if (status === 'CRITICAL' || score < 60) {
            return {
                color: '#f43f5e',
                tag: 'BÁO ĐỘNG ĐỎ',
                tagColor: 'error',
                desc: 'Rủi ro gián đoạn dây chuyền cao. Cần can thiệp kỹ thuật khẩn cấp.'
            };
        }
        if (status === 'WARNING' || score < 80) {
            return {
                color: '#f59e0b',
                tag: 'CẢNH BÁO',
                tagColor: 'warning',
                desc: 'Chỉ số MTTR hoặc sự cố cần được tối ưu hóa trước khi vượt SLA.'
            };
        }
        return {
            color: '#10b981',
            tag: 'VẬN HÀNH ỔN ĐỊNH',
            tagColor: 'success',
            desc: 'Dây chuyền thiết bị đang vận hành trong ngưỡng tin cậy an toàn.'
        };
    };

    const health = getHealthConfig(data?.healthScore || 85, data?.healthStatus || 'HEALTHY');

    return (
        <Modal
            open={open}
            onCancel={onClose}
            footer={null}
            width={980}
            centered
            className="ai-analytics-modal"
            title={
                <div className="flex items-center gap-2.5 py-1">
                    <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-linear-to-tr from-purple-600 via-indigo-600 to-pink-500 text-white shadow-md shadow-purple-500/20">
                        <Sparkles size={16} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-base font-extrabold text-gray-900 dark:text-gray-100">
                                AI Executive Reliability Analytics
                            </span>
                            <Tag color="purple" className="text-[10px] font-bold uppercase tracking-wider">
                                Groq Llama 3.3
                            </Tag>
                        </div>
                        <p className="text-xs text-gray-500 font-normal mt-0.5">
                            Báo cáo điều hành độ tin cậy phân xưởng & Thẻ Hành Động đề xuất (Action Cards)
                        </p>
                    </div>
                </div>
            }
        >
            <div className="space-y-6 pt-3 pb-2 max-h-[78vh] overflow-y-auto px-1 scrollbar-thin">
                {/* Control bar: Period Selector & Refresh */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 rounded-2xl bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            Chu kỳ phân tích:
                        </span>
                        <Segmented
                            value={period}
                            onChange={(val) => setPeriod(val as string)}
                            options={[
                                { label: "Ca hôm nay", value: "today" },
                                { label: "Tuần này", value: "week" },
                                { label: "Tháng này", value: "month" },
                                { label: "Toàn thời gian", value: "all" },
                            ]}
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            size="small"
                            icon={<RotateCw size={13} className={loading ? "animate-spin text-purple-600" : "text-gray-500"} />}
                            onClick={() => fetchSummary(period)}
                            loading={loading}
                            className="text-xs font-medium"
                        >
                            Phân tích lại
                        </Button>
                    </div>
                </div>

                {loading && !data ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                        <Spin size="large" />
                        <span className="text-sm font-semibold text-purple-600 animate-pulse">
                            AI đang tổng hợp dữ liệu Downtime, MTTR & đề xuất Action Cards...
                        </span>
                    </div>
                ) : data ? (
                    <>
                        {/* Health Score & Quick Metrics Banner */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-5 rounded-3xl bg-linear-to-r from-purple-500/10 via-indigo-500/5 to-transparent border border-purple-500/20">
                            {/* Score Dial */}
                            <div className="flex items-center gap-4 border-b md:border-b-0 md:border-r border-purple-200/60 dark:border-purple-800/60 pb-4 md:pb-0 md:pr-4">
                                <Progress
                                    type="circle"
                                    percent={data.healthScore}
                                    size={80}
                                    strokeColor={health.color}
                                    format={(percent) => (
                                        <span className="text-lg font-black text-gray-900 dark:text-gray-100">
                                            {percent}
                                        </span>
                                    )}
                                />
                                <div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-xs font-bold text-gray-500 uppercase">
                                            Điểm Sức Khỏe
                                        </span>
                                        <Tag color={health.tagColor} className="text-[10px] font-bold">
                                            {health.tag}
                                        </Tag>
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                                        {health.desc}
                                    </p>
                                </div>
                            </div>

                            {/* Quick Metrics Columns */}
                            <div className="col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-3 items-center">
                                <div className="p-3 rounded-2xl bg-white/80 dark:bg-gray-800/80 border border-gray-100 dark:border-gray-800">
                                    <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium mb-1">
                                        <Timer size={13} className="text-rose-500" />
                                        Downtime
                                    </div>
                                    <div className="text-sm font-extrabold text-gray-900 dark:text-gray-100 truncate">
                                        {data.metrics?.formattedTotalDowntime || "0p"}
                                    </div>
                                    <div className="text-[10px] text-gray-400 mt-0.5">
                                        {data.metrics?.totalDowntimeMinutes || 0} phút dừng
                                    </div>
                                </div>

                                <div className="p-3 rounded-2xl bg-white/80 dark:bg-gray-800/80 border border-gray-100 dark:border-gray-800">
                                    <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium mb-1">
                                        <Gauge size={13} className="text-amber-500" />
                                        MTTR
                                    </div>
                                    <div className="text-sm font-extrabold text-gray-900 dark:text-gray-100 truncate">
                                        {data.metrics?.mttrMinutes || 0}p
                                    </div>
                                    <div className="text-[10px] text-gray-400 mt-0.5">
                                        Khắc phục TB
                                    </div>
                                </div>

                                <div className="p-3 rounded-2xl bg-white/80 dark:bg-gray-800/80 border border-gray-100 dark:border-gray-800">
                                    <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium mb-1">
                                        <Flame size={13} className="text-red-500" />
                                        Nguy cấp
                                    </div>
                                    <div className="text-sm font-extrabold text-red-600 dark:text-red-400 truncate">
                                        {data.criticalIncidentsCount || 0}
                                    </div>
                                    <div className="text-[10px] text-gray-400 mt-0.5">
                                        CRITICAL / HIGH
                                    </div>
                                </div>

                                <div className="p-3 rounded-2xl bg-white/80 dark:bg-gray-800/80 border border-gray-100 dark:border-gray-800">
                                    <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium mb-1">
                                        <CheckCircle2 size={13} className="text-emerald-500" />
                                        Đạt SLA
                                    </div>
                                    <div className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 truncate">
                                        {data.metrics?.totalIncidents > 0 
                                            ? `${Math.round(((data.metrics?.slaMetCount || 0) / data.metrics.totalIncidents) * 100)}%` 
                                            : "100%"}
                                    </div>
                                    <div className="text-[10px] text-gray-400 mt-0.5">
                                        {data.metrics?.slaMetCount || 0}/{data.metrics?.totalIncidents || 0} sự cố
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Executive Summary Markdown */}
                        <div className="p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-xs">
                            <div className="flex items-center gap-2 mb-3">
                                <FileText size={16} className="text-purple-600 dark:text-purple-400" />
                                <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                    Đánh Giá Điều Hành Tổng Thể
                                </h3>
                            </div>
                            <div className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 leading-relaxed markdown-content">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {data.executiveSummary}
                                </ReactMarkdown>
                            </div>
                        </div>

                        {/* Two Columns: Key Findings & Root Causes */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Key Findings */}
                            <div className="p-4 rounded-2xl bg-gray-50/80 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800">
                                <div className="flex items-center gap-2 mb-2.5">
                                    <TrendingUp size={15} className="text-blue-500" />
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-gray-100">
                                        Phát hiện cốt lõi (Key Findings)
                                    </h4>
                                </div>
                                <ul className="space-y-2 text-xs text-gray-600 dark:text-gray-400 pl-4 list-disc">
                                    {data.keyFindings?.map((item, idx) => (
                                        <li key={idx} className="leading-relaxed">
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Root Causes */}
                            <div className="p-4 rounded-2xl bg-gray-50/80 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800">
                                <div className="flex items-center gap-2 mb-2.5">
                                    <AlertTriangle size={15} className="text-amber-500" />
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-gray-100">
                                        Nguyên nhân gốc rễ (Root Causes)
                                    </h4>
                                </div>
                                <ul className="space-y-2 text-xs text-gray-600 dark:text-gray-400 pl-4 list-disc">
                                    {data.rootCauses?.map((item, idx) => (
                                        <li key={idx} className="leading-relaxed">
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        {/* Prescriptive Recommendations */}
                        {data.prescriptiveRecommendations && data.prescriptiveRecommendations.length > 0 && (
                            <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-500/20">
                                <div className="flex items-center gap-2 mb-2">
                                    <Zap size={15} className="text-emerald-600 dark:text-emerald-400" />
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                                        Khuyến nghị kỹ thuật phòng ngừa (Prescriptive Recommendations)
                                    </h4>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2">
                                    {data.prescriptiveRecommendations.map((rec, idx) => (
                                        <div key={idx} className="p-2.5 rounded-xl bg-white/90 dark:bg-gray-900/80 border border-emerald-200/50 dark:border-emerald-800/50 text-xs text-gray-700 dark:text-gray-300 flex items-start gap-2">
                                            <span className="font-bold text-emerald-600 shrink-0">{idx + 1}.</span>
                                            <span className="leading-snug">{rec}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Interactive Action Cards Grid */}
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <Wrench size={16} className="text-purple-600 dark:text-purple-400" />
                                    <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                        Thẻ Hành Động Đề Xuất Thực Thi (Interactive Action Cards)
                                    </h3>
                                </div>
                                <span className="text-xs text-gray-500">
                                    Duyệt 1-chạm & Kích hoạt SLA
                                </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {data.actionCards?.map((card) => (
                                    <ActionCard
                                        key={card.card_id}
                                        card={card}
                                        onExecuteSuccess={() => {
                                            onIncidentCreated?.();
                                        }}
                                    />
                                ))}
                            </div>
                        </div>
                    </>
                ) : null}
            </div>
        </Modal>
    );
};

export default AIAnalyticsModal;
