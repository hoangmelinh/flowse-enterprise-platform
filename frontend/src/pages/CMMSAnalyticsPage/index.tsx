import React, { useEffect, useState } from 'react';
import { Tag, Button, Segmented, Progress, message, Table } from 'antd';
import { 
    Activity, 
    Sparkles, 
    RotateCw, 
    Gauge, 
    Timer, 
    AlertTriangle, 
    CheckCircle2, 
    Flame, 
    TrendingUp, 
    Wrench, 
    Zap, 
    Cpu, 
    Printer,
    ArrowUpRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getAIAnalyticsSummary } from '@/api/ai';
import type { AIAnalyticsSummaryResponse } from '@/types/ai';
import { ActionCard } from '@/components/ActionCard';

export const CMMSAnalyticsPage: React.FC = () => {
    const navigate = useNavigate();
    const [period, setPeriod] = useState<string>('month');
    const [loading, setLoading] = useState<boolean>(false);
    const [data, setData] = useState<AIAnalyticsSummaryResponse | null>(null);
    const [executedCardIds, setExecutedCardIds] = useState<string[]>(() => {
        try {
            const saved = sessionStorage.getItem('flowise_executed_action_cards');
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });
    const [dismissedCardIds, setDismissedCardIds] = useState<string[]>(() => {
        try {
            const saved = sessionStorage.getItem('flowise_dismissed_action_cards');
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });

    const handleCardExecuted = (cardId: string, cardTitle?: string) => {
        setExecutedCardIds(prev => {
            const updated = [...new Set([...prev, cardId])];
            try {
                sessionStorage.setItem('flowise_executed_action_cards', JSON.stringify(updated));
            } catch (e) {
                console.error(e);
            }
            return updated;
        });
        if (cardTitle) {
            console.log(`Action card executed: ${cardTitle}`);
        }
    };

    const handleCardDismissed = (cardId: string) => {
        setDismissedCardIds(prev => {
            const updated = [...new Set([...prev, cardId])];
            try {
                sessionStorage.setItem('flowise_dismissed_action_cards', JSON.stringify(updated));
            } catch (e) {
                console.error(e);
            }
            return updated;
        });
        message.info("Đã loại bỏ Thẻ Hành Động khỏi hàng đợi duyệt.");
    };

    const fetchSummary = async (targetPeriod: string = period) => {
        try {
            setLoading(true);
            const res = await getAIAnalyticsSummary(targetPeriod);
            if (res?.data) {
                setData(res.data);
            }
        } catch (err: any) {
            message.error(err?.message || "Không thể tải báo cáo phân tích AI");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSummary(period);
    }, [period]);

    const getHealthConfig = (score: number, status: string) => {
        if (status === 'CRITICAL' || score < 60) {
            return {
                color: '#f43f5e',
                tag: 'BÁO ĐỘNG ĐỎ',
                tagColor: 'error',
                desc: 'Rủi ro gián đoạn dây chuyền cao. Đề xuất ưu tiên tập trung xử lý sự cố P1/P2.'
            };
        }
        if (status === 'WARNING' || score < 80) {
            return {
                color: '#f59e0b',
                tag: 'CẢNH BÁO VẬN HÀNH',
                tagColor: 'warning',
                desc: 'Chỉ số MTTR hoặc một số thiết bị có dấu hiệu quá nhiệt/kẹt phoi cần bảo dưỡng phòng ngừa.'
            };
        }
        return {
            color: '#10b981',
            tag: 'VẬN HÀNH ỔN ĐỊNH',
            tagColor: 'success',
            desc: 'Dây chuyền thiết bị đang duy trì trạng thái độ tin cậy và đạt chuẩn cam kết SLA.'
        };
    };

    const health = getHealthConfig(data?.healthScore || 85, data?.healthStatus || 'HEALTHY');

    const topAssetColumns = [
        {
            title: 'Mã & Tên thiết bị',
            key: 'asset',
            render: (_: any, record: any) => (
                <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400">
                        <Cpu size={16} />
                    </div>
                    <div>
                        <div className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                            {record.asset_code}
                            <Tag color="purple" className="text-[10px] font-semibold m-0">
                                {record.location || 'Khu A'}
                            </Tag>
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                            {record.asset_name || record.name || 'Thiết bị công nghiệp'}
                        </div>
                    </div>
                </div>
            )
        },
        {
            title: 'Số vụ sự cố',
            dataIndex: 'incident_count',
            key: 'incident_count',
            width: 120,
            render: (count: number) => (
                <span className="font-semibold text-gray-800 dark:text-gray-200">
                    {count || 0} vụ
                </span>
            )
        },
        {
            title: 'Tổng Downtime',
            dataIndex: 'total_downtime_minutes',
            key: 'total_downtime_minutes',
            width: 150,
            render: (mins: number) => {
                const hours = Math.floor((mins || 0) / 60);
                const remainMins = (mins || 0) % 60;
                return (
                    <span className="font-bold text-rose-600 dark:text-rose-400">
                        {hours > 0 ? `${hours}h ${remainMins}p` : `${remainMins} phút`}
                    </span>
                );
            }
        },
        {
            title: 'Mức độ ảnh hưởng',
            key: 'progress',
            render: (_: any, record: any) => {
                const totalDowntime = data?.metrics?.totalDowntimeMinutes || 1;
                const percent = Math.min(100, Math.round(((record.total_downtime_minutes || 0) / totalDowntime) * 100));
                return (
                    <div className="w-full max-w-xs flex items-center gap-2">
                        <Progress 
                            percent={percent} 
                            strokeColor={percent > 50 ? '#f43f5e' : percent > 25 ? '#f59e0b' : '#8b5cf6'} 
                            size="small" 
                            showInfo={false} 
                        />
                        <span className="text-xs font-semibold text-gray-500 shrink-0">
                            {percent}%
                        </span>
                    </div>
                );
            }
        },
        {
            title: 'Thao tác',
            key: 'action',
            width: 140,
            className: 'print:hidden',
            render: (_: any, record: any) => (
                <Button 
                    size="small" 
                    icon={<ArrowUpRight size={13} />}
                    onClick={() => navigate(`/incidents?assetId=${record.asset_id}`)}
                    className="text-xs print:hidden"
                >
                    Xem sự cố
                </Button>
            )
        }
    ];

    const getPeriodLabel = (val: string) => {
        switch (val) {
            case 'today': return 'Ca trực hôm nay';
            case 'week': return 'Tuần hiện tại';
            case 'month': return 'Tháng này (Kỳ kế hoạch chuẩn)';
            case 'all': return 'Toàn thời gian';
            default: return val;
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6 print:p-0 print:max-w-none print:space-y-4 print:text-black">
            {/* Dedicated Print Only Header (Chỉ xuất hiện khi in hoặc xuất PDF) */}
            <div className="hidden print:block border-b-2 border-gray-900 pb-4 mb-5">
                <div className="flex justify-between items-start">
                    <div>
                        <div className="text-xl font-black uppercase tracking-wider text-gray-900">
                            FLOWISE ENTERPRISE CMMS & RELIABILITY PLATFORM
                        </div>
                        <div className="text-base font-bold text-gray-800 mt-1">
                            BÁO CÁO ĐIỀU HÀNH ĐỘ TIN CẬY THIẾT BỊ & THỜI GIAN NGỪNG MÁY (DOWNTIME)
                        </div>
                        <div className="text-xs text-gray-600 mt-0.5">
                            Phân xưởng Sản Xuất Tự Động Hóa • Hệ Thống Giám Sát Hiện Trường & SLA
                        </div>
                    </div>
                    <div className="text-right text-xs text-gray-700 space-y-0.5">
                        <div><strong>Kỳ báo cáo:</strong> {getPeriodLabel(period)}</div>
                        <div><strong>Thời điểm xuất:</strong> {new Date().toLocaleDateString('vi-VN')} {new Date().toLocaleTimeString('vi-VN')}</div>
                        <div><strong>Chuyên môn AI:</strong> Groq Llama 3.3 (70B) High-Precision FSM</div>
                    </div>
                </div>
            </div>

            {/* Top Header (Web View) */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 dark:border-gray-800 pb-5 print:hidden">
                <div className="flex items-center gap-3">
                    <div className="p-3 rounded-2xl bg-linear-to-tr from-purple-600 via-indigo-600 to-pink-500 text-white shadow-md shadow-purple-500/20">
                        <Activity className="w-7 h-7" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
                                Trung Tâm Điều Hành & Phân Tích Độ Tin Cậy CMMS
                            </h1>
                            <Tag color="purple" className="text-[10px] font-bold uppercase tracking-wider">
                                Groq Llama 3.3 70B
                            </Tag>
                        </div>
                        <p className="text-sm text-gray-500">
                            Giám sát chỉ số dừng máy OEE/MTTR, chuẩn đoán AI chuyên sâu & điều phối Thẻ Hành Động chiến lược
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <Button 
                        icon={<Printer className="w-4 h-4 inline mr-1 text-gray-500" />}
                        onClick={() => window.print()}
                    >
                        In báo cáo
                    </Button>
                    <Button 
                        type="primary"
                        icon={<RotateCw className={`w-4 h-4 inline mr-1 ${loading ? 'animate-spin' : ''}`} />}
                        onClick={() => fetchSummary(period)}
                        loading={loading}
                        className="bg-linear-to-r from-purple-600 via-indigo-600 to-pink-600 hover:from-purple-500 hover:to-indigo-500 border-none shadow-sm font-semibold"
                    >
                        Phân tích lại
                    </Button>
                </div>
            </div>

            {/* Time Period Filter Bar (Web View) */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-gray-50 dark:bg-gray-900/60 p-3.5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xs print:hidden">
                <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Chu kỳ phân tích:
                    </span>
                    <Segmented
                        value={period}
                        onChange={(val) => setPeriod(val as string)}
                        options={[
                            { label: "Ca hôm nay", value: "today" },
                            { label: "Tuần này", value: "week" },
                            { label: "Tháng này (Chuẩn)", value: "month" },
                            { label: "Toàn thời gian", value: "all" },
                        ]}
                    />
                </div>
                <div className="text-xs text-gray-400">
                    Cập nhật mới nhất: {data?.generatedAt ? new Date(data.generatedAt).toLocaleTimeString('vi-VN') : 'Vừa xong'}
                </div>
            </div>

            {/* Hero KPI Stats Banners */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 print:grid-cols-5 print:gap-2 print:break-inside-avoid">
                {/* 1. Health Score */}
                <div className="p-4 rounded-3xl bg-linear-to-br from-purple-500/10 via-indigo-500/5 to-transparent border border-purple-500/20 shadow-xs flex items-center gap-3.5 col-span-1 sm:col-span-2 lg:col-span-1 print:col-span-1 print:p-2.5 print:rounded-xl print:border-gray-300 print:bg-white">
                    <Progress
                        type="circle"
                        percent={data?.healthScore || 85}
                        size={56}
                        strokeColor={health.color}
                        format={(percent) => (
                            <span className="text-base font-black text-gray-900">
                                {percent}
                            </span>
                        )}
                    />
                    <div className="min-w-0 flex-1">
                        <Tag color={health.tagColor} className="text-[10px] font-bold uppercase m-0 mb-1">
                            {health.tag}
                        </Tag>
                        <div className="text-xs font-semibold text-gray-700">
                            Điểm Sức Khỏe
                        </div>
                        <div className="text-[10px] text-gray-500 mt-0.5 line-clamp-1">
                            {health.desc}
                        </div>
                    </div>
                </div>

                {/* 2. Total Downtime */}
                <div className="p-4 rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-xs flex items-center gap-3.5 print:p-2.5 print:rounded-xl print:border-gray-300 print:bg-white">
                    <div className="p-3 rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 print:p-2 print:bg-gray-100">
                        <Timer className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                        <div className="text-xl font-extrabold text-gray-900 truncate print:text-lg">
                            {data?.metrics?.formattedTotalDowntime || "0 phút"}
                        </div>
                        <div className="text-xs text-gray-500 font-medium">Tổng Downtime</div>
                        <div className="text-[10px] text-gray-400 mt-0.5">
                            {data?.metrics?.totalDowntimeMinutes || 0} phút dừng
                        </div>
                    </div>
                </div>

                {/* 3. MTTR */}
                <div className="p-4 rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-xs flex items-center gap-3.5 print:p-2.5 print:rounded-xl print:border-gray-300 print:bg-white">
                    <div className="p-3 rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 print:p-2 print:bg-gray-100">
                        <Gauge className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                        <div className="text-xl font-extrabold text-gray-900 print:text-lg">
                            {data?.metrics?.mttrMinutes || 0} <span className="text-xs font-normal text-gray-500">phút</span>
                        </div>
                        <div className="text-xs text-gray-500 font-medium">MTTR (Khắc phục TB)</div>
                        <div className="text-[10px] text-gray-400 mt-0.5">
                            {data?.metrics?.resolvedIncidents || 0} sự cố đã đóng
                        </div>
                    </div>
                </div>

                {/* 4. Critical Incidents */}
                <div className="p-4 rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-xs flex items-center gap-3.5 print:p-2.5 print:rounded-xl print:border-gray-300 print:bg-white">
                    <div className="p-3 rounded-2xl bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400 print:p-2 print:bg-gray-100">
                        <Flame className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                        <div className="text-xl font-extrabold text-red-600 print:text-lg">
                            {data?.criticalIncidentsCount || 0} <span className="text-xs font-normal text-gray-500">vụ</span>
                        </div>
                        <div className="text-xs text-gray-500 font-medium">Sự cố Nguy Cấp</div>
                        <div className="text-[10px] text-gray-400 mt-0.5">
                            CRITICAL / HIGH
                        </div>
                    </div>
                </div>

                {/* 5. SLA Compliance */}
                <div className="p-4 rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-xs flex items-center gap-3.5 print:p-2.5 print:rounded-xl print:border-gray-300 print:bg-white">
                    <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 print:p-2 print:bg-gray-100">
                        <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                        <div className="text-xl font-extrabold text-emerald-600 print:text-lg">
                            {(data?.metrics?.totalIncidents ?? 0) > 0 
                                ? `${Math.round(((data?.metrics?.slaMetCount || 0) / (data?.metrics?.totalIncidents || 1)) * 100)}%` 
                                : "100%"}
                        </div>
                        <div className="text-xs text-gray-500 font-medium">Đạt SLA Thời Gian Thực</div>
                        <div className="text-[10px] text-gray-400 mt-0.5">
                            {data?.metrics?.slaMetCount || 0} đạt / {data?.metrics?.slaBreachedCount || 0} vi phạm
                        </div>
                    </div>
                </div>
            </div>

            {/* AI Executive Summary Card */}
            <div className="relative overflow-hidden p-6 rounded-3xl bg-linear-to-r from-purple-900/5 via-indigo-900/5 to-pink-900/5 border border-purple-500/25 shadow-sm print:p-4 print:rounded-xl print:border-gray-400 print:bg-white print:break-inside-avoid">
                <div className="absolute top-0 right-0 p-8 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none print:hidden" />
                <div className="flex items-center gap-2 mb-3">
                    <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-linear-to-tr from-purple-600 to-indigo-600 text-white print:bg-gray-900">
                        <Sparkles size={13} />
                    </div>
                    <h2 className="text-base font-extrabold text-gray-900 dark:text-gray-100 print:text-sm">
                        Đánh Giá & Nhận Định Điều Hành Cấp Cao (Executive AI Synthesis)
                    </h2>
                    <Tag color="purple" className="text-[10px] font-bold ml-auto print:hidden">
                        Groq Llama 3.3
                    </Tag>
                </div>
                <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed markdown-content print:text-xs print:text-black">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {data?.executiveSummary || "Đang tổng hợp báo cáo..."}
                    </ReactMarkdown>
                </div>
            </div>

            {/* Two Columns: Key Findings & Root Causes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:grid-cols-2 print:gap-3 print:break-inside-avoid">
                {/* 1. Key Findings */}
                <div className="p-5 rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-xs print:p-3.5 print:rounded-xl print:border-gray-300 print:bg-white">
                    <div className="flex items-center gap-2 mb-3">
                        <TrendingUp size={16} className="text-blue-500" />
                        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-gray-100">
                            Phát hiện cốt lõi (Key Findings)
                        </h3>
                    </div>
                    <ul className="space-y-2.5 text-xs text-gray-600 dark:text-gray-300 pl-4 list-disc print:text-black">
                        {data?.keyFindings?.map((item, idx) => (
                            <li key={idx} className="leading-relaxed">
                                {item}
                            </li>
                        ))}
                    </ul>
                </div>

                {/* 2. Root Causes */}
                <div className="p-5 rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-xs print:p-3.5 print:rounded-xl print:border-gray-300 print:bg-white">
                    <div className="flex items-center gap-2 mb-3">
                        <AlertTriangle size={16} className="text-amber-500" />
                        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-gray-100">
                            Nguyên nhân gốc rễ (Root Causes)
                        </h3>
                    </div>
                    <ul className="space-y-2.5 text-xs text-gray-600 dark:text-gray-300 pl-4 list-disc print:text-black">
                        {data?.rootCauses?.map((item, idx) => (
                            <li key={idx} className="leading-relaxed">
                                {item}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            {/* Prescriptive Recommendations */}
            {data?.prescriptiveRecommendations && data.prescriptiveRecommendations.length > 0 && (
                <div className="p-5 rounded-3xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-500/20 print:p-3.5 print:rounded-xl print:border-gray-300 print:bg-white print:break-inside-avoid">
                    <div className="flex items-center gap-2 mb-3">
                        <Zap size={16} className="text-emerald-600 dark:text-emerald-400" />
                        <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 print:text-black">
                            Khuyến nghị kỹ thuật phòng ngừa (Prescriptive Maintenance)
                        </h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 print:grid-cols-3 print:gap-2">
                        {data.prescriptiveRecommendations.map((rec, idx) => (
                            <div key={idx} className="p-3 rounded-2xl bg-white/90 dark:bg-gray-900/80 border border-emerald-200/50 dark:border-emerald-800/50 text-xs text-gray-700 dark:text-gray-300 flex items-start gap-2.5 print:p-2.5 print:border-gray-300 print:bg-white print:text-black">
                                <span className="font-extrabold text-emerald-600 shrink-0 text-sm">{idx + 1}.</span>
                                <span className="leading-snug">{rec}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Interactive Action Cards Section */}
            <div className="space-y-3 print:break-inside-avoid">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Wrench size={18} className="text-purple-600 dark:text-purple-400" />
                        <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 print:text-sm">
                            Thẻ Hành Động Khuyến Nghị Thực Thi (Enterprise Action Cards)
                        </h3>
                    </div>
                    <span className="text-xs text-gray-500 print:text-[10px]">
                        Cơ chế Human-in-the-loop: Phê duyệt 1-chạm kích hoạt quy trình bảo trì & SLA
                    </span>
                </div>

                {(() => {
                    const activeCards = (data?.actionCards || []).filter(
                        c => !executedCardIds.includes(c.card_id) && !dismissedCardIds.includes(c.card_id)
                    );

                    if (activeCards.length === 0) {
                        return (
                            <div className="p-5 rounded-3xl bg-linear-to-r from-emerald-500/10 via-teal-500/10 to-indigo-500/10 border border-emerald-500/30 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xs">
                                <div className="flex items-center gap-3.5">
                                    <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                                        <CheckCircle2 size={22} />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                            Toàn bộ Thẻ Hành Động đề xuất đã được phê duyệt!
                                        </h4>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                            Các quy trình bảo dưỡng phòng ngừa và xử lý điểm nghẽn đã được chuyển giao vào Hệ thống Sự cố Hiện trường (Field Incidents).
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <Button 
                                        size="small" 
                                        type="primary"
                                        onClick={() => navigate('/incidents')}
                                        className="bg-emerald-600 hover:bg-emerald-500 border-none font-semibold text-xs"
                                    >
                                        Xem Sự cố Hiện trường
                                    </Button>
                                    {executedCardIds.length > 0 && (
                                        <Button 
                                            size="small" 
                                            onClick={() => {
                                                setExecutedCardIds([]);
                                                setDismissedCardIds([]);
                                                sessionStorage.removeItem('flowise_executed_action_cards');
                                                sessionStorage.removeItem('flowise_dismissed_action_cards');
                                                message.success("Đã làm mới lại hàng đợi Thẻ Hành Động.");
                                            }}
                                            className="text-xs text-gray-500"
                                        >
                                            Đặt lại danh sách duyệt
                                        </Button>
                                    )}
                                </div>
                            </div>
                        );
                    }

                    return (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:grid-cols-2 print:gap-3">
                            {activeCards.map((card) => (
                                <div key={card.card_id} className="print:break-inside-avoid">
                                    <ActionCard
                                        card={card}
                                        onExecuteSuccess={() => {
                                            handleCardExecuted(card.card_id, card.title);
                                        }}
                                        onDismiss={() => {
                                            handleCardDismissed(card.card_id);
                                        }}
                                    />
                                </div>
                            ))}
                        </div>
                    );
                })()}
            </div>

            {/* Top Downtime Assets Breakdown Table */}
            <div className="p-5 rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-xs space-y-4 print:p-3.5 print:rounded-xl print:border-gray-300 print:bg-white print:break-inside-avoid">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Cpu size={18} className="text-purple-600 dark:text-purple-400" />
                        <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 print:text-sm">
                            Xếp Hạng Thiết Bị Điểm Nghẽn (Top Downtime Bottlenecks)
                        </h3>
                    </div>
                    <span className="text-xs text-gray-500 print:text-[10px]">
                        Dựa trên số giờ dừng máy tích lũy theo chu kỳ
                    </span>
                </div>

                <Table
                    columns={topAssetColumns}
                    dataSource={data?.metrics?.topDowntimeAssets || []}
                    rowKey="asset_id"
                    pagination={false}
                    locale={{ emptyText: 'Chưa ghi nhận thời gian dừng máy nào trong chu kỳ này.' }}
                />
            </div>
        </div>
    );
};

export default CMMSAnalyticsPage;
