import React, { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import api from "../api/config";
import "./Invoice.css";

const Invoice = () => {
    const { orderId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const [orders, setOrders] = useState([]); // Array untuk multiple invoices
    const [loading, setLoading] = useState(true);

    // Check if this is admin view (from admin history)
    const isAdminView = location.state?.fromAdmin || false;

    // Proteksi: Cek apakah ada session yang valid
    useEffect(() => {
        const tableId = sessionStorage.getItem("table_id");
        const customerName = sessionStorage.getItem("customer_name");
        const adminLoggedIn = sessionStorage.getItem("adminLoggedIn");

        // Jika bukan admin dan tidak ada session yang lengkap, redirect ke home
        if (!isAdminView && (!tableId || !customerName)) {
            console.warn(
                "⚠️ Session tidak valid atau sudah habis. Redirecting..."
            );

            // Clear hanya session USER, JANGAN hapus session ADMIN
            sessionStorage.removeItem("customer_name");
            sessionStorage.removeItem("table_id");
            sessionStorage.removeItem("last_order_id");

            navigate("/", { replace: true });
            return;
        }

        // Jika admin view tapi tidak ada session admin, redirect ke admin login
        if (isAdminView && adminLoggedIn !== "1") {
            console.warn("⚠️ Session admin tidak valid. Redirecting...");
            navigate("/admin", { replace: true });
            return;
        }
    }, [isAdminView, navigate]);

    useEffect(() => {
        const fetchOrder = async () => {
            try {
                let allOrders = [];

                // Jika admin view, hanya tampilkan 1 invoice
                if (isAdminView) {
                    try {
                        const adminResponse = await api.get(
                            `/admin/orders/${orderId}`
                        );
                        const mainOrder =
                            adminResponse.data.data || adminResponse.data;
                        allOrders = [mainOrder];
                    } catch (adminErr) {
                        console.error(
                            "Error fetching admin invoice:",
                            adminErr
                        );
                        alert("Invoice tidak ditemukan.");
                        navigate("/admin/history");
                        setLoading(false);
                        return;
                    }
                } else {
                    try {
                        const tableId = sessionStorage.getItem("table_id");
                        const customerName =
                            sessionStorage.getItem("customer_name");

                        if (!tableId || !customerName) {
                            throw new Error("No session data");
                        }

                        const response = await api.get("/orders/history", {
                            params: {
                                table_id: tableId,
                                customer_name: customerName,
                            },
                        });
                        const userOrders =
                            response.data.data || response.data || [];

                        allOrders = userOrders
                            .filter((o) => o.status !== "Menunggu Pembayaran")
                            .sort(
                                (a, b) =>
                                    new Date(b.created_at) -
                                    new Date(a.created_at)
                            );
                    } catch (err) {
                        try {
                            const response = await api.get(
                                `/orders/${orderId}`
                            );
                            const order = response.data.data || response.data;
                            allOrders = [order];
                        } catch (fallbackErr) {
                            alert("Invoice tidak ditemukan.");
                            navigate("/catalog");
                            setLoading(false);
                            return;
                        }
                    }
                }

                if (allOrders.length === 0) {
                    navigate(isAdminView ? "/admin/history" : "/catalog");
                    setLoading(false);
                    return;
                }

                const formattedOrders = allOrders.map((ord) => {
                    const items = (ord.OrderItems || ord.items || []).map(
                        (it) => ({
                            name: it.Menu?.name || it.name || it.menu_name,
                            quantity: it.quantity || it.qty || 0,
                            price: it.Menu?.price || it.price || 0,
                        })
                    );

                    const totalAmount = parseFloat(ord.total) || 0;

                    return {
                        ...ord,
                        table_name:
                            ord.Table?.name ||
                            ord.table_name ||
                            (ord.table_id ? `Meja ${ord.table_id}` : "Meja -"),
                        table_id: ord.table_id || ord.Table?.id || null,
                        items: items,
                        total: totalAmount,
                    };
                });

                setOrders(formattedOrders);
            } catch (err) {
                alert("Terjadi kesalahan saat memuat invoice.");
                navigate(isAdminView ? "/admin/history" : "/catalog");
            } finally {
                setLoading(false);
            }
        };
        fetchOrder();
    }, [orderId, isAdminView, navigate]);

    const handleScreenshot = async () => {
        try {
            // Dynamically import html2canvas
            const html2canvas = (await import("html2canvas")).default;

            // Get all invoice cards
            const invoiceCards = document.querySelectorAll(
                ".invoice-card-wrapper"
            );

            if (invoiceCards.length === 0) {
                alert("Invoice tidak ditemukan");
                return;
            }

            console.log(`📸 Capturing ${invoiceCards.length} invoice(s)...`);

            // Capture each invoice
            for (let i = 0; i < invoiceCards.length; i++) {
                const card = invoiceCards[i];
                const order = orders[i];

                // Capture this invoice
                const canvas = await html2canvas(card, {
                    backgroundColor: "#ffffff",
                    scale: 2, // High quality
                    logging: false,
                    useCORS: true,
                });

                // Convert to image and download
                canvas.toBlob((blob) => {
                    if (blob) {
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement("a");
                        link.href = url;
                        const label = i === 0 ? "TERBARU" : `LAMA-${i}`;
                        link.download = `Invoice-${
                            order.id
                        }-${label}-${Date.now()}.png`;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        URL.revokeObjectURL(url);
                    }
                }, "image/png");

                // Small delay between captures
                if (i < invoiceCards.length - 1) {
                    await new Promise((resolve) => setTimeout(resolve, 500));
                }
            }

            alert(`✅ ${invoiceCards.length} invoice berhasil disimpan!`);
        } catch (error) {
            console.error("Screenshot error:", error);
            alert(
                "Gagal screenshot. Silakan screenshot manual dengan tombol power + volume down di HP."
            );
        }
    };

    const handlePrint = () => {
        try {
            if (isAdminView) {
                // Admin: Download as PDF
                console.log("Admin: Downloading PDF...");
                window.print();
            } else {
                // User: Print langsung (foto/gambar)
                console.log("User: Printing invoice...");

                // Check if print dialog opens
                const printSupported =
                    window.matchMedia("print").matches !== undefined;

                if (!printSupported) {
                    alert(
                        "Cetak tidak didukung. Silakan screenshot halaman ini atau gunakan browser lain."
                    );
                    return;
                }

                window.print();
            }
        } catch (error) {
            console.error("Print error:", error);
            alert(
                "Gagal mencetak. Silakan:\n1. Klik 'Izinkan' pada popup\n2. Atau screenshot halaman ini\n3. Atau tekan Ctrl+P untuk cetak manual"
            );
        }
    };

    const handleOrderAgain = () => {
        // Gunakan order terbaru (index 0)
        const latestOrder = orders[0];
        navigate("/catalog", {
            state: {
                nomorMeja: latestOrder?.table_id,
                nama: latestOrder?.customer_name,
            },
        });
    };

    if (loading) {
        return <div className="invoice-container">Memuat invoice...</div>;
    }

    if (!orders || orders.length === 0) {
        return (
            <div className="invoice-container">
                <p>Pesanan tidak ditemukan</p>
                <button className="back-btn" onClick={() => navigate("/")}>
                    Kembali ke Login
                </button>
            </div>
        );
    }

    return (
        <div className="invoice-wrapper">
            <div className="invoice-actions no-print">
                {isAdminView ? (
                    <>
                        <button
                            className="back-btn"
                            onClick={() => navigate("/admin/history")}
                        >
                            ←
                        </button>
                        <button className="print-btn" onClick={handlePrint}>
                            Cetak Invoice
                        </button>
                    </>
                ) : (
                    <>
                        <button
                            className="order-again-btn"
                            onClick={handleOrderAgain}
                        >
                            Pesan Lagi
                        </button>
                        <button
                            className="print-btn"
                            onClick={handleScreenshot}
                        >
                            Cetak Semua ({orders.length})
                        </button>
                    </>
                )}
            </div>

            <div className="invoices-container">
                {orders.map((order, orderIndex) => {
                    const createdAt =
                        order.created_at || order.createdAt || new Date();
                    const date = new Date(createdAt);

                    // Check if date is valid
                    const isValidDate = date instanceof Date && !isNaN(date);

                    const day = isValidDate
                        ? String(date.getDate()).padStart(2, "0")
                        : "01";
                    const month = isValidDate
                        ? String(date.getMonth() + 1).padStart(2, "0")
                        : "01";
                    const year = isValidDate
                        ? date.getFullYear()
                        : new Date().getFullYear();
                    const dateStr = `${day}/${month}/${year}`;

                    const hours = isValidDate
                        ? String(date.getHours()).padStart(2, "0")
                        : "00";
                    const minutes = isValidDate
                        ? String(date.getMinutes()).padStart(2, "0")
                        : "00";
                    const timeStr = `${hours}.${minutes}`;

                    const tableName =
                        order.table?.name ||
                        order.Table?.name ||
                        order.table_name ||
                        (order.table_id ? `Meja ${order.table_id}` : "No.D-13");
                    const customerName = order.customer_name || "Pelanggan";
                    const invoiceStr = String(order.id).padStart(2, "0");

                    return (
                        <div key={order.id} className="invoice-card-wrapper">
                            {orderIndex === 0 && orders.length > 1 ? (
                                <div className="invoice-badge newest">
                                    Invoice Terbaru - #{invoiceStr}
                                </div>
                            ) : orderIndex === 0 ? (
                                <div className="invoice-badge newest">
                                    Invoice #{invoiceStr}
                                </div>
                            ) : (
                                <div className="invoice-badge old">
                                    Invoice Sebelumnya #{invoiceStr} - {dateStr}{" "}
                                    {timeStr}
                                </div>
                            )}
                            <div className="invoice-container">
                                <div className="invoice-paper">
                                    {/* Header */}
                                    <div className="invoice-header">
                                        <div className="store-address">
                                            Jl. Kapten Halim, Lebakanyar
                                        </div>
                                        <div className="store-address">
                                            Purwakarta, Jawa Barat 41172
                                        </div>
                                    </div>

                                    <div className="invoice-divider"></div>

                                    {/* Order Info */}
                                    <div className="invoice-info">
                                        <div className="info-row">
                                            <span>{dateStr}</span>
                                        </div>
                                        <div className="info-row">
                                            <span>{timeStr}</span>
                                            <span className="right">
                                                {customerName}
                                            </span>
                                        </div>
                                        <div className="info-row">
                                            <span>{tableName}</span>
                                            <span className="right">
                                                INV: {invoiceStr}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="invoice-divider"></div>

                                    {/* Items */}
                                    <div className="invoice-items">
                                        {order.items &&
                                        order.items.length > 0 ? (
                                            order.items.map((item, idx) => (
                                                <div
                                                    className="item-group"
                                                    key={idx}
                                                >
                                                    <div className="item-line">
                                                        {item.quantity} x{" "}
                                                        {Math.floor(
                                                            item.price
                                                        ).toLocaleString(
                                                            "id-ID"
                                                        )}
                                                    </div>
                                                    <div className="item-line indent">
                                                        {item.name}
                                                    </div>
                                                    <div className="item-line right-align">
                                                        Rp{" "}
                                                        {Math.floor(
                                                            item.quantity *
                                                                item.price
                                                        ).toLocaleString(
                                                            "id-ID"
                                                        )}
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="item-line">
                                                Tidak ada item
                                            </div>
                                        )}
                                    </div>

                                    <div className="invoice-divider"></div>

                                    {/* Totals */}
                                    <div className="invoice-totals">
                                        <div className="total-row">
                                            <span>Total</span>
                                            <span>
                                                Rp{" "}
                                                {Math.floor(
                                                    order.total || 0
                                                ).toLocaleString("id-ID")}
                                            </span>
                                        </div>
                                        <div className="total-row">
                                            <span>Bayar</span>
                                            <span>
                                                Rp{" "}
                                                {Math.floor(
                                                    order.total || 0
                                                ).toLocaleString("id-ID")}
                                            </span>
                                        </div>
                                        <div className="total-row">
                                            <span>Kembali</span>
                                            <span>Rp 0</span>
                                        </div>
                                    </div>

                                    <div className="invoice-divider"></div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default Invoice;
