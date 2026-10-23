/**
 * Brevo Email Service (Flowse Enterprise Platform)
 * Hỗ trợ gửi email giao dịch qua Brevo REST API v3
 * (Cảnh báo SLA, Yêu cầu phê duyệt vật tư, Xác thực tài khoản)
 */

class EmailService {
  /**
   * Gửi email chung qua Brevo
   */
  static async sendEmail({ toEmail, toName, subject, htmlContent }) {
    const apiKey = process.env.BREVO_API_KEY;
    const senderEmail = process.env.BREVO_SENDER_EMAIL || "notifications@flowse.enterprise";
    const senderName = process.env.BREVO_SENDER_NAME || "Flowse Enterprise Platform";

    if (!apiKey) {
      console.log(
        `[Brevo Email Mock] (Chưa cấu hình BREVO_API_KEY) Đã giả lập gửi email thành công đến: ${toEmail} - Tiêu đề: "${subject}"`
      );
      return { success: true, mocked: true };
    }

    try {
      const response = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "api-key": apiKey,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          sender: {
            name: senderName,
            email: senderEmail,
          },
          to: [
            {
              email: toEmail,
              name: toName || toEmail,
            },
          ],
          subject: subject,
          htmlContent: htmlContent,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("[Brevo Email Error]", response.status, errorData);
        return { success: false, error: errorData };
      }

      const result = await response.json();
      console.log(`[Brevo Email Success] Đã gửi mail tới ${toEmail}, MessageId:`, result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (err) {
      console.error("[Brevo Email Exception]", err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * Template: Cảnh báo SLA Nguy cấp hoặc Quá hạn (AT_RISK / BREACHED)
   */
  static async sendSlaAlert({ toEmail, toName, incidentTitle, assetCode, severity, slaStatus, deadline, actionUrl }) {
    const isBreached = slaStatus === "BREACHED";
    const color = isBreached ? "#e11d48" : "#f59e0b";
    const statusText = isBreached ? "ĐÃ QUÁ HẠN (BREACHED)" : "SẮP HẾT HẠN (AT RISK < 30m)";

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
        <div style="background-color: ${color}; color: #ffffff; padding: 20px; text-align: center;">
          <h2 style="margin: 0; font-size: 20px; text-transform: uppercase;">⚠️ BÁO ĐỘNG SLA: ${statusText}</h2>
          <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.9;">Hệ Thống Quản Trị Vận Hành Hiện Trường Flowse 2.0</p>
        </div>
        <div style="padding: 24px; color: #1f2937; line-height: 1.6;">
          <p>Xin chào <strong>${toName || "Quản trị viên"}</strong>,</p>
          <p>Hệ thống phát hiện một sự cố máy móc tại xưởng đang trong mức báo động SLA:</p>
          <div style="background-color: #f9fafb; border-left: 4px solid ${color}; padding: 16px; margin: 16px 0; border-radius: 4px;">
            <p style="margin: 4px 0;"><strong>Sự cố:</strong> ${incidentTitle}</p>
            <p style="margin: 4px 0;"><strong>Mã thiết bị:</strong> <span style="font-family: monospace; background: #e5e7eb; padding: 2px 6px; border-radius: 4px;">${assetCode || "N/A"}</span></p>
            <p style="margin: 4px 0;"><strong>Mức độ nghiêm trọng:</strong> <span style="color: ${color}; font-weight: bold;">${severity}</span></p>
            <p style="margin: 4px 0;"><strong>Hạn chót SLA:</strong> ${new Date(deadline).toLocaleString("vi-VN")}</p>
          </div>
          <p style="color: #4b5563; font-size: 14px;">
            Vui lòng kiểm tra và chỉ đạo kỹ thuật viên xử lý gấp để tránh gián đoạn dây chuyền sản xuất.
          </p>
          <div style="text-align: center; margin: 28px 0 10px 0;">
            <a href="${actionUrl || "http://localhost:5173/incidents"}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
              Xử lý Sự cố ngay trên Web App &rarr;
            </a>
          </div>
        </div>
        <div style="background-color: #f3f4f6; padding: 14px; text-align: center; font-size: 12px; color: #6b7280;">
          Email tự động gửi từ Flowse Enterprise Platform. Không trả lời trực tiếp email này.
        </div>
      </div>
    `;

    return await this.sendEmail({
      toEmail,
      toName,
      subject: `[BÁO ĐỘNG ${statusText}] ${incidentTitle} (Thiết bị: ${assetCode || "N/A"})`,
      htmlContent: html,
    });
  }

  /**
   * Template: Yêu cầu cấp phát vật tư từ Hiện trường (Procurement Request)
   */
  static async sendProcurementRequestAlert({ toEmail, toName, incidentTitle, partName, quantity, reason, approvalUrl }) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
        <div style="background-color: #3b82f6; color: #ffffff; padding: 20px; text-align: center;">
          <h2 style="margin: 0; font-size: 20px;">📦 YÊU CẦU CẤP VẬT TƯ CẦN PHÊ DUYỆT</h2>
          <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.9;">Field-to-Office Procurement Request</p>
        </div>
        <div style="padding: 24px; color: #1f2937; line-height: 1.6;">
          <p>Kính gửi <strong>${toName || "Ban Quản Lý"}</strong>,</p>
          <p>Kỹ thuật viên tại hiện trường vừa tạo yêu cầu xuất vật tư cho sự cố: <strong>${incidentTitle}</strong>.</p>
          <div style="background-color: #f9fafb; border-left: 4px solid #3b82f6; padding: 16px; margin: 16px 0; border-radius: 4px;">
            <p style="margin: 4px 0;"><strong>Vật tư / Linh kiện:</strong> <span style="font-weight: bold; color: #1d4ed8;">${partName}</span></p>
            <p style="margin: 4px 0;"><strong>Số lượng yêu cầu:</strong> ${quantity}</p>
            <p style="margin: 4px 0;"><strong>Lý do cấp bách:</strong> ${reason}</p>
          </div>
          <p style="font-size: 14px; color: #4b5563;">
            Sự cố hiện đang ở trạng thái <em>Tạm dừng chờ vật tư (ON_HOLD_PENDING_PARTS)</em>. Khi bạn phê duyệt, hệ thống sẽ tự động mở lại tiến trình sửa chữa.
          </p>
          <div style="text-align: center; margin: 28px 0 10px 0;">
            <a href="${approvalUrl || "http://localhost:5173/approvals"}" style="background-color: #16a34a; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
              Xem và Phê duyệt Yêu cầu &rarr;
            </a>
          </div>
        </div>
      </div>
    `;

    return await this.sendEmail({
      toEmail,
      toName,
      subject: `[CẦN PHÊ DUYỆT VẬT TƯ] ${partName} (SL: ${quantity}) - ${incidentTitle}`,
      htmlContent: html,
    });
  }
}

export default EmailService;
