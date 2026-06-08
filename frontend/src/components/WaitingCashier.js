import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../api/config";
import "./WaitingCashier.css";

const WaitingCashier = () => {
    const navigate = useNavigate();
    const { state } = useLocation();
    const [paymentStatus, setPaymentStatus] = useState("waiting");
    const [showCancelConfirm, setShowCancelConfirm] = useState(false);

    useEffect(() => {
        if (!state?.orderId) {
            navigate("/cart");
        }
    }, [state, navigate]);

    useEffect(() => {
        // Polling untuk cek status pembayaran setiap 3 detik
        if (!state?.orderId) return;

        const checkPaymentStatus = async () => {
            try {
                const res = await api.get(
                    `/orders/${state.orderId}/payment/status`
                );
                const order = res.data?.data || res.data;

                if (order.payment_status === "paid") {
                    setPaymentStatus("paid");

                    // Redirect ke success page setelah kasir konfirmasi
                    setTimeout(() => {
                        navigate("/checkout/success", {
                            state: {
                                orderId: state.orderId,
                                total: state.total,
                            },
                            replace: true
                        });
                    }, 2000);
                }
            } catch (err) {
                console.error("Error checking payment status:", err);
            }
        };

        // Check immediately
        checkPaymentStatus();

        // Then check every 3 seconds
        const interval = setInterval(checkPaymentStatus, 3000);

        return () => clearInterval(interval);
    }, [state, navigate]);

    if (!state?.orderId) return null;

    const { orderId, total } = state;

    return (
        <div className="waiting-cashier-page">
            <div className="waiting-card">
                {paymentStatus === "waiting" ? (
                    <>
                        {/* Header dengan Logo */}
                        <div className="order-header">
                            <div className="brand-logo">
                                <span className="brand-name">ES BAR 79</span>
                                <span className="brand-sub">
                                    ICE CREAM & COFFEE
                                </span>
                            </div>
                            <h1>Silakan Menuju Kasir</h1>
                            <p className="subtitle">
                                Sebutkan kode pesanan Anda kepada kasir
                            </p>
                        </div>

                        <div className="order-code">
                            <div className="code-label">Kode Pesanan</div>
                            <div className="code-value">#{orderId || "-"}</div>
                        </div>

                        <div className="payment-info">
                            <div className="info-row">
                                <span>Nama Pemesan</span>
                                <strong>
                                    {sessionStorage.getItem("customer_name") ||
                                        "Guest"}
                                </strong>
                            </div>
                            <div className="info-row total">
                                <span>Total Pembayaran</span>
                                <strong>
                                    Rp{" "}
                                    {Math.floor(total || 0).toLocaleString(
                                        "id-ID"
                                    )}
                                </strong>
                            </div>
                        </div>

                        <div className="status-indicator">
                            <div className="loading-dots">
                                <span></span>
                                <span></span>
                                <span></span>
                            </div>
                            <p>Menunggu konfirmasi pembayaran dari kasir...</p>
                        </div>

                        {!showCancelConfirm ? (
                            <button
                                className="back-button"
                                onClick={() => setShowCancelConfirm(true)}
                            >
                                Batalkan Pesanan
                            </button>
                        ) : (
                            <div className="cancel-confirm">
                                <p className="cancel-warning">
                                    Yakin ingin membatalkan pesanan?
                                </p>
                                <div className="cancel-actions">
                                    <button
                                        className="cancel-no"
                                        onClick={() =>
                                            setShowCancelConfirm(false)
                                        }
                                    >
                                        Tidak
                                    </button>
                                    <button
                                        className="cancel-yes"
                                        onClick={() => navigate("/catalog")}
                                    >
                                        Ya, Batalkan
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <>
                        <div className="brand-logo success">
                            <span className="brand-name">ES BAR 79</span>
                            <span className="brand-sub">
                                ICE CREAM & COFFEE
                            </span>
                        </div>
                        <div className="success-check">
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
                        <p>Pesanan Anda sedang diproses</p>
                    </>
                )}
            </div>
        </div>
    );
};

export default WaitingCashier;
