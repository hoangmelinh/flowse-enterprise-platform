import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft, Search } from 'lucide-react';
import './NotFoundPage.css';

export default function NotFoundPage() {
    const navigate = useNavigate();

    return (
        <div className="notfound-page">
            {/* Animated background shapes */}
            <div className="notfound-bg">
                <div className="notfound-shape notfound-shape--1" />
                <div className="notfound-shape notfound-shape--2" />
                <div className="notfound-shape notfound-shape--3" />
            </div>

            <div className="notfound-content">
                {/* Animated 404 text */}
                <div className="notfound-code">
                    <span className="notfound-digit">4</span>
                    <span className="notfound-digit notfound-digit--mid">
                        <div className="notfound-planet">
                            <div className="notfound-planet-ring" />
                        </div>
                    </span>
                    <span className="notfound-digit">4</span>
                </div>

                <h1 className="notfound-title">Trang không tìm thấy</h1>
                <p className="notfound-desc">
                    Trang bạn đang tìm kiếm có thể đã bị xoá, đổi tên hoặc tạm thời không khả dụng.
                </p>

                <div className="notfound-actions">
                    <button
                        className="notfound-btn notfound-btn--primary"
                        onClick={() => navigate('/home')}
                    >
                        <Home size={16} />
                        Về trang chủ
                    </button>
                    <button
                        className="notfound-btn notfound-btn--secondary"
                        onClick={() => navigate(-1)}
                    >
                        <ArrowLeft size={16} />
                        Quay lại
                    </button>
                </div>

                <div className="notfound-search-hint">
                    <Search size={14} />
                    <span>Bạn có thể thử tìm kiếm trong thanh điều hướng</span>
                </div>
            </div>
        </div>
    );
}
