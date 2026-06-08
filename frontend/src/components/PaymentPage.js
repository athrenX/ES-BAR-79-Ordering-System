import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../api/config";
import "./PaymentPage.css";

const PaymentPage = () => {
    const navigate = useNavigate();
    const { state } = useLocation();
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState("");
    const [paymentMethod, setPaymentMethod] = useState("");
    const [showSandboxInfo, setShowSandboxInfo] = useState(false);

    // Block back navigation
    useEffect(() => {
        const blockBack = (e) => {
            e.preventDefault();
            window.history.pushState(null, null, window.location.pathname);
        };

        window.history.pushState(null, null, window.location.pathname);
        window.addEventListener("popstate", blockBack);

        return () => {
            window.removeEventListener("popstate", blockBack);
        };
    }, []);

    useEffect(() => {
        console.log("=== PAYMENT PAGE MOUNTED ===");
        console.log("location.state:", state);
        console.log("orderId:", state?.orderId);
        console.log("total:", state?.total);
        console.log("tracking:", state?.tracking);

        if (!state?.orderId) {
            navigate("/cart");
        }
    }, [state, navigate]);

    if (!state?.orderId) return null;

    const { orderId, total } = state;

    // ============================================================
    // 1. FUNGSI MIDTRANS SNAP (QRIS/E-WALLET)
    // ============================================================
    const handleSnapPay = async () => {
        setProcessing(true);
        setError("");

        try {
            // Memanggil createPayment di PaymentController
            const res = await api.post("/midtrans/snap", {
                order_id: orderId,
            });
            const snapToken = res.data.token;

            // Buka Midtrans Snap sebagai popup (bukan tab baru)
            window.snap.pay(snapToken, {
                onSuccess: async function (result) {
                    console.log("🟢 Midtrans onSuccess triggered:", result);
                    // Ketika sukses, mark as paid dan redirect
                    await markOrderAsPaid();
                },
                onPending: async function (result) {
                    console.log("🟡 Midtrans onPending triggered:", result);
                    // Ketika pending, mark as paid dan redirect
                    await markOrderAsPaid();
                },
                onError: function (result) {
                    console.log("🔴 Midtrans onError triggered:", result);
                    setProcessing(false);
                    setError("Pembayaran gagal. Silakan coba lagi.");
                },
                onClose: async function () {
                    console.log("🔵 Midtrans onClose triggered (popup closed)");
                    // Ketika popup ditutup, otomatis mark as paid dan redirect
                    await markOrderAsPaid();
                },
            });
        } catch (err) {
            setError(
                "Gagal memulai pembayaran: " +
                    (err?.response?.data?.message || err.message)
            );
            setProcessing(false);
        }
    };

    // Helper function untuk mark order as paid
    const markOrderAsPaid = async () => {
        console.log("=== MARK ORDER AS PAID DEBUG ===");
        console.log("orderId:", orderId);
        console.log("total:", total);

        // Save to sessionStorage IMMEDIATELY
        if (orderId) {
            sessionStorage.setItem("last_order_id", orderId);
            console.log("✅ Saved orderId to sessionStorage:", orderId);
        }

        try {
            await api.post(`/orders/${orderId}/mark-paid`);
            console.log("✅ Order marked as paid successfully");

            // Redirect ke success page (ada tombol ke invoice di sana)
            setTimeout(() => {
                console.log("Navigating to /checkout/success with state:", {
                    orderId,
                    total,
                });
                navigate("/checkout/success", {
                    state: { orderId, total },
                    replace: true,
                });
            }, 500);
        } catch (err) {
            console.error("❌ Error marking payment:", err);
            // Tetap redirect ke success page meskipun ada error
            console.log("Redirecting to success page despite error");
            navigate("/checkout/success", {
                state: { orderId, total },
                replace: true,
            });
        }
    };

    // ============================================================
    // 2. FUNGSI PEMBAYARAN TUNAI (KASIR)
    // ============================================================
    const handleCashPayment = async () => {
        setProcessing(true);
        setError("");
        try {
            await api.post(`/payment/cash/${orderId}`); //
            // Redirect ke waiting cashier page, nanti dari sana bisa ke invoice
            navigate("/checkout/waiting-cashier", {
                state: { orderId, total },
                replace: true,
            });
        } catch (err) {
            setError(
                err?.response?.data?.message ||
                    "Gagal memproses pembayaran tunai"
            );
        } finally {
            setProcessing(false);
        }
    };

    // ============================================================
    // 3. RENDERING
    // ============================================================
    return (
        <div className="payment-page">
            <div className="card">
                {paymentMethod === "" ? (
                    <>
                        <div className="payment-header">
                            <div className="payment-logo">
                                <div className="brand-logo-rect">
                                    <span className="brand-name-main">
                                        ES BAR 79
                                    </span>
                                    <span className="brand-subtitle">
                                        ICE CREAM & COFFEE
                                    </span>
                                </div>
                            </div>
                            <h1 className="payment-title">
                                Pilih Metode Pembayaran
                            </h1>
                        </div>

                        <div className="order-summary-card">
                            <h3 className="summary-title">Ringkasan Pesanan</h3>
                            <div className="summary-content">
                                <div className="summary-item">
                                    <span>Nama Pemesan</span>
                                    <b>
                                        {sessionStorage.getItem(
                                            "customer_name"
                                        ) || "Guest"}
                                    </b>
                                </div>
                                <div className="summary-item">
                                    <span>Nomor Meja</span>
                                    <b>
                                        {sessionStorage.getItem("table_name") ||
                                            `Meja ${sessionStorage.getItem(
                                                "table_id"
                                            )}` ||
                                            "-"}
                                    </b>
                                </div>
                                <div className="summary-item">
                                    <span>Kode Pesanan</span>
                                    <b>#{orderId}</b>
                                </div>
                                <div className="summary-item summary-total">
                                    <span>Total Bayar</span>
                                    <b className="total-amount">
                                        Rp{" "}
                                        {Math.floor(total || 0).toLocaleString(
                                            "id-ID"
                                        )}
                                    </b>
                                </div>
                            </div>
                        </div>

                        <div className="payment-methods">
                            <button
                                className="payment-method-btn qris"
                                onClick={handleSnapPay}
                                disabled={processing}
                            >
                                <div className="method-info">
                                    <h3>QRIS / E-Wallet / GoPay</h3>
                                    <p>
                                        {processing
                                            ? "Menghubungkan..."
                                            : "Scan QR atau Bayar Online"}
                                    </p>
                                </div>
                            </button>

                            <button
                                className="payment-method-btn cash"
                                onClick={() => setPaymentMethod("cash")}
                                disabled={processing}
                            >
                                <div className="method-info">
                                    <h3>Bayar di Kasir</h3>
                                    <p>Tunai atau Debit</p>
                                </div>
                            </button>
                        </div>

                        <div className="sandbox-dropdown">
                            <button
                                className="sandbox-toggle"
                                onClick={() =>
                                    setShowSandboxInfo(!showSandboxInfo)
                                }
                                type="button"
                            >
                                <span>ℹ️ Syarat dan Ketentuan</span>
                                <span className="dropdown-icon">
                                    {showSandboxInfo ? "▲" : "▼"}
                                </span>
                            </button>

                            {showSandboxInfo && (
                                <div className="sandbox-info-dropdown">
                                    <p>
                                        <strong>
                                            🧪 Mode Sandbox (Testing)
                                        </strong>
                                    </p>
                                    <p>
                                        Karena ini masih mode testing Midtrans,
                                        sistem disederhanakan untuk kemudahan
                                        testing.
                                    </p>
                                    <p>
                                        <strong>
                                            Cara Testing - SUPER MUDAH:
                                        </strong>
                                    </p>
                                    <ol>
                                        <li>
                                            Klik tombol "QRIS / E-Wallet /
                                            GoPay" di atas
                                        </li>
                                        <li>
                                            Popup Midtrans akan muncul di
                                            halaman ini
                                        </li>
                                        <li>
                                            <strong>
                                                Tutup saja popup tersebut (klik
                                                X atau di luar popup)
                                            </strong>
                                        </li>
                                        <li>
                                            <strong>
                                                ✨ OTOMATIS dianggap sudah bayar
                                                & langsung ke invoice!
                                            </strong>
                                        </li>
                                    </ol>
                                    <p>
                                        ⚡{" "}
                                        <em>
                                            <strong>
                                                Tidak perlu klik apa-apa, tutup
                                                popup = pembayaran berhasil!
                                            </strong>
                                        </em>
                                    </p>
                                    <p>
                                        💡{" "}
                                        <em>
                                            Atau gunakan "Bayar di Kasir" untuk
                                            testing pembayaran tunai
                                        </em>
                                    </p>
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <>
                        <div className="payment-header">
                            <div className="payment-logo">
                                <div className="brand-logo-rect">
                                    <span className="brand-name-main">
                                        ES BAR 79
                                    </span>
                                    <span className="brand-subtitle">
                                        ICE CREAM & COFFEE
                                    </span>
                                </div>
                            </div>
                            <h1 className="payment-title">Bayar di Kasir</h1>
                            <p className="payment-subtitle">
                                Silakan menuju kasir untuk melakukan pembayaran
                            </p>
                        </div>

                        <div className="order-summary-card">
                            <div className="order-code-display">
                                <span className="code-label">Kode Pesanan</span>
                                <span className="code-value">#{orderId}</span>
                            </div>
                            <div className="summary-content">
                                <div className="summary-item">
                                    <span>Nama Pemesan</span>
                                    <b>
                                        {sessionStorage.getItem(
                                            "customer_name"
                                        ) || "Guest"}
                                    </b>
                                </div>
                                <div className="summary-item">
                                    <span>Nomor Meja</span>
                                    <b>
                                        {sessionStorage.getItem("table_name") ||
                                            `Meja ${sessionStorage.getItem(
                                                "table_id"
                                            )}` ||
                                            "-"}
                                    </b>
                                </div>
                                <div className="summary-item summary-total">
                                    <span>Total Bayar</span>
                                    <b className="total-amount">
                                        Rp{" "}
                                        {Math.floor(total || 0).toLocaleString(
                                            "id-ID"
                                        )}
                                    </b>
                                </div>
                            </div>
                        </div>

                        <div className="cash-info">
                            <h3>Langkah Pembayaran:</h3>
                            <ol>
                                <li>Menuju kasir Kedai ES BAR 79</li>
                                <li>
                                    Sebutkan kode pesanan:{" "}
                                    <strong>#{orderId}</strong>
                                </li>
                                <li>Bayar dengan tunai atau kartu debit</li>
                                <li>
                                    Pesanan akan diproses setelah pembayaran
                                </li>
                            </ol>
                        </div>

                        <div className="actions">
                            <button
                                className="ghost"
                                onClick={() => setPaymentMethod("")}
                                disabled={processing}
                            >
                                Ganti Metode Pembayaran
                            </button>
                            <button
                                className="primary"
                                onClick={handleCashPayment}
                                disabled={processing}
                            >
                                {processing
                                    ? "Memproses..."
                                    : "Konfirmasi Lanjut ke Kasir"}
                            </button>
                        </div>
                    </>
                )}

                {error && <div className="alert error-alert">{error}</div>}
            </div>
        </div>
    );
};

export default PaymentPage;
