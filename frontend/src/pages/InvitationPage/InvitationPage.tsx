import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { toast } from 'sonner';

import './InvitationPage.css';
import type { AppDispatch, RootState } from '@/store/configureStore';
import { useAppDispatch } from '@/hooks';
import { fetchVerifyInvitation, respondToInvitations } from '@/store/modules/workspaces';
import { CheckCircle2, XCircle, Mail, Shield, Users } from 'lucide-react';

export default function InvitationPage() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const navigate = useNavigate();
    const dispatch = useAppDispatch<AppDispatch>();

    const isVerifying = useSelector((state: RootState) => state.workspaces.isVerifyingInvitation);
    const isResponding = useSelector((state: RootState) => state.workspaces.isRespondingInvitation);
    const invitationInfo = useSelector((state: RootState) => state.workspaces.verifyInvitationData);
    const invitationError = useSelector((state: RootState) => state.workspaces.verifyInvitationError);

    const { access_token } = useSelector((state: RootState) => state.auth);

    const isAuthenticated = !!access_token;

    useEffect(() => {
        if (!token) {
            toast.error('Token không hợp lệ!');
            navigate('/');
            return;
        }
        dispatch(fetchVerifyInvitation(token));
    }, [dispatch, token, navigate]);

    const handleAccept = async () => {
        if (!token || !invitationInfo) return;

        if (!isAuthenticated) {
            const redirectPath = invitationInfo.isUserExists
                ? `/login?inviteToken=${token}`
                : `/register?inviteToken=${token}`;
            navigate(redirectPath);
            return;
        }

        try {
            await dispatch(respondToInvitations({ token, action: 'accept' })).unwrap();
            toast.success('Đã tham gia dự án thành công!');
            navigate('/home');
        } catch (error: unknown) {
            const msg = typeof error === 'string' ? error : 'Có lỗi xảy ra khi chấp nhận lời mời';
            toast.error(msg);
        }
    };

    useEffect(() => {
        if (!invitationInfo || isVerifying || isAuthenticated || !token) return;
        if (invitationInfo.isUserExists) {
            navigate(`/login?inviteToken=${encodeURIComponent(token)}`, { replace: true });
        } else {
            navigate(`/register?inviteToken=${encodeURIComponent(token)}`, { replace: true });
        }
    }, [invitationInfo, isAuthenticated, navigate, token, isVerifying]);

    const handleReject = async () => {
        if (!token || !invitationInfo) return;

        if (!isAuthenticated) {
            const redirectPath = invitationInfo.isUserExists
                ? `/login?inviteToken=${token}`
                : `/register?inviteToken=${token}`;
            navigate(redirectPath);
            return;
        }

        try {
            await dispatch(respondToInvitations({ token, action: 'reject' })).unwrap();
            toast.info('Bạn đã từ chối lời mời.');
            navigate('/home');
        } catch (error: unknown) {
            const msg = typeof error === 'string' ? error : 'Có lỗi xảy ra khi từ chối lời mời';
            toast.error(msg);
        }
    };

    // ── Loading State ──
    if (isVerifying || (!invitationInfo && !invitationError) || isResponding) {
        return (
            <div className="inv-page">
                <div className="inv-bg">
                    <div className="inv-bg-shape inv-bg-shape--1" />
                    <div className="inv-bg-shape inv-bg-shape--2" />
                </div>
                <div className="inv-loading-card">
                    <div className="inv-loading-spinner" />
                    <h2 className="inv-loading-text">
                        {isVerifying ? 'Đang xác thực lời mời...' : 'Đang xử lý tham gia...'}
                    </h2>
                    <p className="inv-loading-sub">Vui lòng chờ trong giây lát</p>
                </div>
            </div>
        );
    }

    if (invitationError || !invitationInfo) {
        return (
            <div className="inv-page">
                <div className="inv-loading-card">
                    <XCircle size={40} />
                    <h2 className="inv-loading-text">Lời mời không hợp lệ</h2>
                    <p className="inv-loading-sub">{invitationError || 'Không thể tải thông tin lời mời.'}</p>
                </div>
            </div>
        );
    }

    // ── Main UI ──
    const workspaceInitial = (invitationInfo.workspaceName || 'W')[0].toUpperCase();

    return (
        <div className="inv-page">
            <div className="inv-bg">
                <div className="inv-bg-shape inv-bg-shape--1" />
                <div className="inv-bg-shape inv-bg-shape--2" />
                <div className="inv-bg-shape inv-bg-shape--3" />
            </div>

            <div className="inv-card">
                {/* Header decoration */}
                <div className="inv-card-deco" />

                {/* Workspace Avatar */}
                <div className="inv-workspace-avatar">
                    <span>{workspaceInitial}</span>
                </div>

                {/* Label */}
                <div className="inv-label">
                    <Users size={14} />
                    <span>Lời mời tham gia dự án</span>
                </div>

                {/* Workspace Name */}
                <h1 className="inv-workspace-name">
                    {invitationInfo.workspaceName || 'Floswise Workspace'}
                </h1>

                {/* Inviter Info */}
                <div className="inv-inviter-section">
                    <div className="inv-inviter-card">
                        <div className="inv-inviter-avatar">
                            {(invitationInfo.inviterName || 'A')[0].toUpperCase()}
                        </div>
                        <div className="inv-inviter-info">
                            <span className="inv-inviter-name">
                                {invitationInfo.inviterName || 'Admin'}
                            </span>
                            <span className="inv-inviter-email">
                                <Mail size={12} />
                                {invitationInfo.inviterEmail || invitationInfo.email}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Security badge */}
                <div className="inv-security-badge">
                    <Shield size={13} />
                    <span>Lời mời được gửi cho: <strong>{invitationInfo.email}</strong></span>
                </div>

                {/* Actions */}
                <div className="inv-actions">
                    <button
                        type="button"
                        className="inv-btn inv-btn--accept"
                        onClick={handleAccept}
                        disabled={isResponding}
                    >
                        <CheckCircle2 size={18} />
                        Chấp nhận lời mời
                    </button>
                    <button
                        type="button"
                        className="inv-btn inv-btn--reject"
                        onClick={handleReject}
                        disabled={isResponding}
                    >
                        <XCircle size={18} />
                        Từ chối
                    </button>
                </div>
            </div>
        </div>
    );
}
