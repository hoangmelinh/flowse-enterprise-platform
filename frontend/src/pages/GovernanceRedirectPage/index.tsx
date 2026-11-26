import React from "react";
import { Button } from "antd";
import { ShieldAlert, ExternalLink, ArrowLeft, Layers } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCapabilities } from "@/hooks/useCapabilities";

const CMS_URL = import.meta.env.VITE_CMS_URL || "http://localhost:5174";

export const GovernanceRedirectPage: React.FC<{ section: string }> = ({ section }) => {
  const navigate = useNavigate();
  const { canAccessCms, currentRole, context } = useCapabilities();
  const wsId = context?.current_workspace_id;
  const targetCmsPath = section.includes("Thiết bị") ? "/assets" : "/";
  const cmsHref = wsId ? `${CMS_URL}${targetCmsPath}?workspaceId=${wsId}` : `${CMS_URL}${targetCmsPath}`;

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="max-w-lg w-full rounded-2xl border border-[#e2e8f0] bg-white p-8 shadow-xs space-y-5 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f0f4ff] text-[#0058be]">
          {canAccessCms ? <Layers className="h-7 w-7" /> : <ShieldAlert className="h-7 w-7 text-[#d97706]" />}
        </div>

        <div className="space-y-2">
          <span className="inline-block rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-600">
            Phân tách cụm Workspace &amp; CMS Quản trị
          </span>
          <h1 className="text-xl font-extrabold text-[#141b2b]">
            {section} đã được chuyển sang Cổng Quản trị CMS
          </h1>
          <p className="text-sm text-[#5f6368] leading-relaxed">
            Theo kiến trúc phân quyền riêng biệt, <strong>Workspace Web (:5173)</strong> phục vụ thực thi công việc và cộng tác đội nhóm, còn các chức năng quản trị thiết bị, mẫu checklist, quy trình và phân tích điều hành nằm tại cụm <strong>CMS Admin Console (:5174)</strong>.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Button icon={<ArrowLeft className="w-4 h-4 inline mr-1" />} onClick={() => navigate("/home")}>
            Về Trang công việc
          </Button>
          {canAccessCms ? (
            <Button
              type="primary"
              className="bg-[#0058be]"
              icon={<ExternalLink className="w-4 h-4 inline mr-1" />}
              onClick={() => window.open(cmsHref, "_blank", "noopener,noreferrer")}
            >
              Mở CMS Quản trị ({CMS_URL})
            </Button>
          ) : (
            <div className="w-full rounded-xl bg-amber-50 border border-amber-200 px-4 py-2.5 text-xs text-amber-800">
              Vai trò hiện tại của bạn là <strong className="uppercase">{currentRole}</strong> (không có quyền truy cập cổng CMS Quản trị).
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GovernanceRedirectPage;
