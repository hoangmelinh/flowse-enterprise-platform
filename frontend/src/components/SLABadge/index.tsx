import React, { useEffect, useState } from "react";
import { Tag, Tooltip } from "antd";
import { Clock, AlertTriangle, CheckCircle2, PauseCircle, Flame } from "lucide-react";

interface SLABadgeProps {
  status?: "IN_SLA" | "AT_RISK" | "BREACHED" | "COMPLETED" | string;
  stateCode?: string;
  deadlineAt?: string;
  startedAt?: string;
  className?: string;
}

export const SLABadge: React.FC<SLABadgeProps> = ({
  status = "IN_SLA",
  stateCode,
  deadlineAt,
  className = "",
}) => {
  const [timeLeftStr, setTimeLeftStr] = useState<string>("");
  const isPaused = stateCode === "ON_HOLD_PENDING_PARTS";

  useEffect(() => {
    if (!deadlineAt || isPaused || status === "COMPLETED") {
      setTimeLeftStr("");
      return;
    }

    const updateTimer = () => {
      const now = new Date().getTime();
      const deadline = new Date(deadlineAt).getTime();
      const diff = deadline - now;

      if (diff <= 0) {
        setTimeLeftStr("Quá hạn");
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        setTimeLeftStr(`${hours > 0 ? `${hours}h ` : ""}${minutes}m`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000); // cập nhật mỗi 1 phút
    return () => clearInterval(interval);
  }, [deadlineAt, isPaused, status]);

  if (isPaused) {
    return (
      <Tooltip title="Đồng hồ SLA được tạm dừng khi chờ kho cấp phát linh kiện">
        <Tag
          icon={<PauseCircle size={13} className="mr-1 inline animate-pulse" />}
          className={`border-amber-400 bg-amber-50 text-amber-800 font-medium px-2 py-0.5 rounded-full ${className}`}
        >
          PAUSED (Chờ vật tư)
        </Tag>
      </Tooltip>
    );
  }

  if (status === "BREACHED" || timeLeftStr === "Quá hạn") {
    return (
      <Tooltip title="Đã vượt quá hạn mức xử lý cam kết trong thỏa ước dịch vụ">
        <Tag
          icon={<Flame size={13} className="mr-1 inline" />}
          className={`border-red-500 bg-red-50 text-red-700 font-semibold px-2 py-0.5 rounded-full ${className}`}
        >
          BREACHED (Trễ hạn)
        </Tag>
      </Tooltip>
    );
  }

  if (status === "AT_RISK") {
    return (
      <Tooltip title="Thời gian còn lại dưới 20% thời hạn quy định">
        <Tag
          icon={<AlertTriangle size={13} className="mr-1 inline animate-pulse" />}
          className={`border-orange-400 bg-orange-50 text-orange-700 font-medium px-2 py-0.5 rounded-full ${className}`}
        >
          AT RISK {timeLeftStr ? `(${timeLeftStr})` : ""}
        </Tag>
      </Tooltip>
    );
  }

  if (status === "COMPLETED") {
    return (
      <Tag
        icon={<CheckCircle2 size={13} className="mr-1 inline" />}
        className={`border-emerald-300 bg-emerald-50 text-emerald-700 font-medium px-2 py-0.5 rounded-full ${className}`}
      >
        Đạt SLA
      </Tag>
    );
  }

  return (
    <Tooltip title={deadlineAt ? `Hạn chót: ${new Date(deadlineAt).toLocaleTimeString()}` : "Trong hạn mức cam kết"}>
      <Tag
        icon={<Clock size={13} className="mr-1 inline text-blue-500" />}
        className={`border-blue-200 bg-blue-50 text-blue-700 font-medium px-2 py-0.5 rounded-full ${className}`}
      >
        IN SLA {timeLeftStr ? `(${timeLeftStr})` : ""}
      </Tag>
    </Tooltip>
  );
};

export default SLABadge;
