import React, { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./PaymentSuccess.css";

const PaymentSuccess = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { orderId, total } = location.state || {};

    // Try to get orderId from multiple sources
    const finalOrderId = orderId || sessionStorage.getItem("last_order_id");

    // Debug logging
    useEffect(() => {
        console.log("=== PAYMENT SUCCESS DEBUG ===");
        console.log("location.state:", location.state);
        console.log("orderId from state:", orderId);
        console.log("orderId from sessionStorage:", sessionStorage.getItem("last_order_id"));
        console.log("finalOrderId:", finalOrderId);
        console.log("total:", total);
    }, [location.state, orderId, finalOrderId, total]);

    // Security: Redirect if accessed without proper state
    useEffect(() => {
        if (finalOrderId) {
            // Simpan orderId untuk akses invoice nanti
            sessionStorage.setItem("last_order_id", finalOrderId);
            console.log("✅ OrderId saved to sessionStorage:", finalOrderId);
        }

        // ONLY redirect jika BENAR-BENAR tidak ada orderId dari manapun
        if (!finalOrderId) {
            console.warn("⚠️ No orderId found anywhere - redirecting to catalog");
            setTimeout(() => {
                navigate("/catalog", { replace: true });
            }, 1000);
        }
    }, [finalOrderId, navigate]);

    // Clear cart setelah checkout berhasil
    useEffect(() => {
        const clearCartAfterCheckout = async () => {
            console.log("=== PAYMENT SUCCESS - CLEAR CART DEBUG ===");

            // Clear local cart state and localStorage
            localStorage.removeItem("cart");
            localStorage.removeItem("cart_snapshot_before_payment");

            // Trigger event for Cart.js to refresh
            window.dispatchEvent(new Event("payment-success"));

            console.log("✅ Local cart cleared (localStorage)");
            console.log("=== PAYMENT SUCCESS DEBUG END ===");
        };

        clearCartAfterCheckout();
    }, [finalOrderId]);

    // Don't render if absolutely no orderId (will auto-redirect via useEffect)
    if (!finalOrderId) {
        return (
            <div className="pay-success">
                <div className="card">
                    <p>Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="pay-success">
            <div className="card">
                {/* Logo Brand - Rounded Rectangle */}
                <div className="success-logo">
                    <div className="brand-logo-rect">
                        <span className="brand-name-main">ES BAR 79</span>
                        <span className="brand-subtitle">
                            ICE CREAM & COFFEE
                        </span>
                    </div>
                </div>

                {/* Success Icon */}
                <div className="success-icon">
                    <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                    >
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                </div>

                <h1>Pembayaran Berhasil!</h1>

                <div className="detail">
                    <div className="detail-row">
                        <span>ID Pesanan</span>
                        <strong>#{finalOrderId || "-"}</strong>
                    </div>
                    <div className="detail-row">
                        <span>Nama Pemesan</span>
                        <strong>
                            {sessionStorage.getItem("customer_name") || "Guest"}
                        </strong>
                    </div>
                    <div className="detail-row total">
                        <span>Total Pembayaran</span>
                        <strong>
                            Rp {Math.floor(total || 0).toLocaleString("id-ID")}
                        </strong>
                    </div>
                </div>

                <div className="actions">
                    {finalOrderId ? (
                        <button
                            className="btn-primary"
                            onClick={() => {
                                console.log("🎯 Button clicked - Navigating to invoice:", finalOrderId);
                                console.log("Current location:", window.location.pathname);
                                navigate(`/invoice/${finalOrderId}`, { replace: true });
                            }}
                        >
                            Lihat Detail Pesanan
                        </button>
                    ) : (
                        <button
                            className="btn-secondary"
                            onClick={() => {
                                console.log("⚠️ No orderId found - Redirecting to catalog");
                                navigate("/catalog");
                            }}
                        >
                            Kembali ke Menu
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PaymentSuccess;
