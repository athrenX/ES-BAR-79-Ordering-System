import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/config";
import { storageUrl } from "../../utils/storage";
import "./Admin.css";

const AdminCashier = () => {
    const [unpaidOrders, setUnpaidOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(null);
    const [searchCode, setSearchCode] = useState(""); // State untuk search kode
    const [showDropdown, setShowDropdown] = useState(false);
    const navigate = useNavigate();
    const adminName = sessionStorage.getItem("adminName") || "Admin";

    useEffect(() => {
        const ok = sessionStorage.getItem("adminLoggedIn") === "1";
        if (!ok) navigate("/admin");
    }, [navigate]);

    useEffect(() => {
        fetchUnpaidOrders();

        // Auto refresh every 5 seconds
        const interval = setInterval(fetchUnpaidOrders, 5000);

        return () => clearInterval(interval);
    }, []);

    const fetchUnpaidOrders = async () => {
        try {
            const token = localStorage.getItem("admin_token");
            const response = await api.get("/admin/orders", {
                headers: { Authorization: `Bearer ${token}` },
            });

            console.log("=== ADMIN CASHIER DEBUG ===");
            console.log("Raw API response:", response.data);

            const raw = response.data.data || response.data;
            console.log("Raw orders array:", raw);
            console.log("Total orders:", raw.length);

            const unpaid = (Array.isArray(raw) ? raw : [])
                .filter((o) => {
                    const isCash = o.payment_type === "cash";
                    const isUnpaid = o.payment_status === "unpaid";
                    const isWaiting = o.status === "Menunggu Pembayaran";

                    console.log(`Order #${o.id}:`, {
                        payment_type: o.payment_type,
                        payment_status: o.payment_status,
                        status: o.status,
                        matches: isCash && isUnpaid && isWaiting,
                    });

                    return isCash && isUnpaid && isWaiting;
                })
                .map((o) => ({
                    ...o,
                    table_name:
                        o.table?.name ||
                        o.Table?.name ||
                        o.table_name ||
                        "Tidak ada meja",
                    customer_name: o.customer_name || "Tanpa nama",
                    items: (o.items || o.OrderItems || []).map((it) => ({
                        name:
                            it.menu?.name ||
                            it.Menu?.name ||
                            it.name ||
                            it.menu_name ||
                            "Menu tidak diketahui",
                        quantity: it.quantity || it.qty || 0,
                        price:
                            it.price || it.menu?.price || it.Menu?.price || 0,
                        image:
                            it.menu?.image ||
                            it.Menu?.image ||
                            it.image ||
                            null,
                    })),
                }))
                .sort(
                    (a, b) =>
                        new Date(a.created_at || a.createdAt) -
                        new Date(b.created_at || b.createdAt)
                );

            console.log("Filtered unpaid orders:", unpaid);
            console.log("Total unpaid cash orders:", unpaid.length);

            setUnpaidOrders(unpaid);
        } catch (err) {
            console.error("Error fetching unpaid orders:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleMarkAsPaid = async (orderId) => {
        if (!window.confirm("Konfirmasi pembayaran telah diterima?")) {
            return;
        }

        try {
            setProcessing(orderId);
            const token = localStorage.getItem("admin_token");

            await api.post(
                `/admin/orders/${orderId}/payment/confirm-cash`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );

            alert("✅ Pembayaran dikonfirmasi! Pesanan dikirim ke dapur.");

            // Refresh list
            fetchUnpaidOrders();
        } catch (err) {
            console.error("Error confirming payment:", err);
            alert(
                "❌ Gagal konfirmasi pembayaran: " +
                    (err.response?.data?.message || err.message)
            );
        } finally {
            setProcessing(null);
        }
    };

    const handlePrintInvoice = (order) => {
        const printWindow = window.open("", "_blank");
        const invoiceHTML = generateInvoiceHTML(order);

        printWindow.document.write(invoiceHTML);
        printWindow.document.close();

        // Trigger print setelah load
        printWindow.onload = () => {
            printWindow.print();
        };
    };

    const generateInvoiceHTML = (order) => {
        const formatNumber = (num) => {
            return new Intl.NumberFormat("id-ID").format(Math.floor(num));
        };

        const items = order.items || [];
        const itemsHTML = items
            .map(
                (item) => `
            <tr>
                <td>${item.name}</td>
                <td style="text-align: center;">${item.quantity}</td>
                <td style="text-align: right;">Rp ${formatNumber(
                    item.price * item.quantity
                )}</td>
            </tr>
        `
            )
            .join("");

        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Invoice #${order.id}</title>
            <style>
                @media print {
                    @page {
                        size: 80mm auto;
                        margin: 3mm;
                    }
                }
                
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }
                
                body {
                    font-family: 'Courier New', monospace;
                    width: 70mm;
                    max-width: 70mm;
                    margin: 0 auto;
                    padding: 5mm 3mm;
                    background: white;
                    font-size: 10px;
                }
                
                .header {
                    text-align: center;
                    margin-bottom: 10px;
                    padding-bottom: 8px;
                    border-bottom: 1px dashed #000;
                }
                
                .store-name {
                    font-size: 18px;
                    font-weight: bold;
                    margin-bottom: 5px;
                    letter-spacing: 1px;
                }
                
                .store-info {
                    font-size: 8px;
                    line-height: 1.3;
                }
                
                .divider {
                    border-top: 1px dashed #000;
                    margin: 8px 0;
                }
                
                .info-section {
                    margin-bottom: 8px;
                    font-size: 9px;
                }
                
                .info-row {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 2px;
                }
                
                .items-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin: 8px 0;
                }
                
                .items-table th {
                    padding: 3px 0;
                    font-size: 9px;
                    text-align: left;
                    border-bottom: 1px solid #000;
                }
                
                .items-table td {
                    padding: 3px 0;
                    font-size: 9px;
                    border-bottom: 1px dotted #ccc;
                }
                
                .summary {
                    margin-top: 8px;
                    padding-top: 5px;
                    border-top: 1px solid #000;
                }
                
                .summary-row {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 3px;
                    font-size: 9px;
                }
                
                .total-row {
                    font-size: 12px;
                    font-weight: bold;
                    padding-top: 5px;
                    margin-top: 5px;
                    border-top: 1px dashed #000;
                }
                
                .payment-info {
                    margin: 8px 0;
                    padding: 5px 0;
                    text-align: center;
                    font-size: 10px;
                    font-weight: bold;
                    border-top: 1px dashed #000;
                    border-bottom: 1px dashed #000;
                }
                
                .footer {
                    text-align: center;
                    font-size: 8px;
                    margin-top: 10px;
                    padding-top: 8px;
                    border-top: 1px dashed #000;
                }
                
                .thank-you {
                    font-weight: bold;
                    margin-bottom: 5px;
                    font-size: 10px;
                }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="store-info">
                    Jl. Kapten Halim, Lebakanyar<br>
                    Purwakarta, Jawa Barat 41172
                </div>
            </div>
            
            <div class="info-section">
                <div class="info-row">
                    <span>Invoice</span>
                    <span><b>#${order.id}</b></span>
                </div>
                <div class="info-row">
                    <span>Tanggal</span>
                    <span>${new Date(order.created_at).toLocaleString("id-ID", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                    })}</span>
                </div>
                <div class="info-row">
                    <span>Meja</span>
                    <span><b>${order.table_name}</b></span>
                </div>
                <div class="info-row">
                    <span>Pelanggan</span>
                    <span>${order.customer_name}</span>
                </div>
                <div class="info-row">
                    <span>Kasir</span>
                    <span>${adminName}</span>
                </div>
            </div>
            
            <div class="divider"></div>
            
            <table class="items-table">
                <thead>
                    <tr>
                        <th>Item</th>
                        <th style="text-align: center;">Qty</th>
                        <th style="text-align: right;">Subtotal</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsHTML}
                </tbody>
            </table>
            
            <div class="summary">
                <div class="summary-row">
                    <span>Subtotal</span>
                    <span>Rp ${formatNumber(order.total)}</span>
                </div>
                <div class="summary-row">
                    <span>Pajak (0%)</span>
                    <span>Rp 0</span>
                </div>
                <div class="summary-row total-row">
                    <span>TOTAL</span>
                    <span>Rp ${formatNumber(order.total)}</span>
                </div>
            </div>
            
            <div class="payment-info">
                PEMBAYARAN TUNAI
            </div>
            
            <div class="footer">
                <div class="thank-you">*** TERIMA KASIH ***</div>
                <div>Simpan struk sebagai bukti pembayaran</div>
            </div>
            
            <script>
                window.onafterprint = function() {
                    window.close();
                };
            </script>
        </body>
        </html>
        `;
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleString("id-ID", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            minimumFractionDigits: 0,
        }).format(amount);
    };

    // Filter orders by search code
    const filteredOrders = unpaidOrders.filter((order) => {
        if (!searchCode.trim()) return true; // Show all if no search
        const code = searchCode.trim().toLowerCase();
        const orderId = String(order.id).toLowerCase();
        const customerName = (order.customer_name || "").toLowerCase();
        return orderId.includes(code) || customerName.includes(code);
    });

    if (loading) {
        return (
            <div className="admin-layout">
                <aside className="admin-sidebar">
                    <div className="brand-pill big">
                        ES BAR 79
                        <span className="brand-sub">ICE CREAM & COFFEE</span>
                    </div>
                    <div className="admin-meta">{adminName}</div>
                </aside>
                <main className="admin-main">
                    <p>Loading...</p>
                </main>
            </div>
        );
    }

    return (
        <div className="admin-layout">
            <aside className="admin-sidebar">
                <div className="brand-pill big">
                    ES BAR 79
                    <span className="brand-sub">ICE CREAM & COFFEE</span>
                </div>
                <div className="admin-meta-wrapper">
                    <div
                        className="admin-meta"
                        onClick={() => setShowDropdown(!showDropdown)}
                    >
                        {adminName}
                    </div>
                    {showDropdown && (
                        <div className="admin-dropdown">
                            <button
                                className="admin-dropdown-item logout"
                                onClick={() => {
                                    if (window.confirm("Yakin ingin logout?")) {
                                        localStorage.removeItem("admin_token");
                                        sessionStorage.removeItem(
                                            "adminLoggedIn"
                                        );
                                        sessionStorage.removeItem("adminName");
                                        navigate("/admin");
                                    }
                                }}
                            >
                                Logout
                            </button>
                        </div>
                    )}
                </div>
                <div className="side-nav">
                    <button
                        className="side-btn"
                        onClick={() => navigate("/admin/dashboard")}
                    >
                        Pesanan
                    </button>
                    <button className="side-btn active">Kasir</button>
                    <button
                        className="side-btn"
                        onClick={() => navigate("/admin/menu")}
                    >
                        Menu
                    </button>
                    <button
                        className="side-btn"
                        onClick={() => navigate("/admin/tables")}
                    >
                        Kelola Meja
                    </button>
                    <button
                        className="side-btn"
                        onClick={() => navigate("/admin/history")}
                    >
                        Riwayat Pesanan
                    </button>
                </div>
            </aside>

            <main className="admin-main">
                <div className="page-header">
                    <div>
                        <h2>Kasir - Menunggu Pembayaran</h2>
                        <p className="muted">
                            {unpaidOrders.length} pesanan menunggu konfirmasi
                            pembayaran
                            {searchCode &&
                                ` • Hasil pencarian: ${filteredOrders.length} pesanan`}
                        </p>
                    </div>
                    <div className="header-actions">
                        <div className="filter-inline">
                            <input
                                type="text"
                                placeholder="Masukkan Kode Pesanan (contoh: 123)"
                                value={searchCode}
                                onChange={(e) => setSearchCode(e.target.value)}
                                style={{ width: "320px" }}
                            />
                            {searchCode && (
                                <button
                                    onClick={() => setSearchCode("")}
                                    style={{
                                        marginLeft: "8px",
                                        padding: "8px 12px",
                                        background: "#6b7280",
                                        color: "white",
                                        border: "none",
                                        borderRadius: "6px",
                                        cursor: "pointer",
                                    }}
                                >
                                    ✕ Clear
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="cashier-content">
                    {filteredOrders.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-icon">
                                {searchCode ? "" : "✓"}
                            </div>
                            <h2>
                                {searchCode
                                    ? `Tidak ada pesanan dengan kode "${searchCode}"`
                                    : "Semua Pembayaran Selesai"}
                            </h2>
                            <p>
                                {searchCode
                                    ? "Coba cari dengan kode pesanan lain"
                                    : "Tidak ada pesanan yang menunggu pembayaran"}
                            </p>
                        </div>
                    ) : (
                        <div className="unpaid-orders-grid">
                            {filteredOrders.map((order) => (
                                <div
                                    key={order.id}
                                    className="unpaid-order-card"
                                >
                                    <div className="order-header-cashier">
                                        <div className="order-code-big">
                                            #{order.id}
                                        </div>
                                        <div className="order-meta">
                                            <span className="order-table">
                                                {order.table_name}
                                            </span>
                                            <span className="order-time">
                                                {formatDate(
                                                    order.created_at ||
                                                        order.createdAt ||
                                                        Date.now()
                                                )}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="customer-info">
                                        <strong>Nama:</strong>{" "}
                                        {order.customer_name}
                                    </div>

                                    <div className="order-items-cashier">
                                        <h4>Items:</h4>
                                        <ul>
                                            {order.items.map((item, idx) => (
                                                <li key={idx}>
                                                    {item.image ? (
                                                        <img
                                                            src={
                                                                storageUrl(
                                                                    item.image_cropped ||
                                                                        item.image
                                                                ) +
                                                                "?t=" +
                                                                Date.now()
                                                            }
                                                            alt={item.name}
                                                            className="item-image-cashier"
                                                            style={{
                                                                width: "60px",
                                                                height: "60px",
                                                                objectFit:
                                                                    "cover",
                                                                borderRadius:
                                                                    "8px",
                                                                marginRight:
                                                                    "12px",
                                                            }}
                                                            onError={(e) => {
                                                                e.target.style.display =
                                                                    "none";
                                                                e.target.nextSibling.style.display =
                                                                    "flex";
                                                            }}
                                                        />
                                                    ) : null}
                                                    {!item.image || true ? (
                                                        <div
                                                            className="no-image-cashier"
                                                            style={{
                                                                width: "60px",
                                                                height: "60px",
                                                                display:
                                                                    item.image
                                                                        ? "none"
                                                                        : "flex",
                                                                alignItems:
                                                                    "center",
                                                                justifyContent:
                                                                    "center",
                                                                backgroundColor:
                                                                    "#f0f0f0",
                                                                borderRadius:
                                                                    "8px",
                                                                marginRight:
                                                                    "12px",
                                                                fontSize:
                                                                    "24px",
                                                            }}
                                                        >
                                                            🍽️
                                                        </div>
                                                    ) : null}
                                                    <span className="item-qty">
                                                        {item.quantity}x
                                                    </span>
                                                    <span className="item-name">
                                                        {item.name}
                                                    </span>
                                                    <span className="item-price">
                                                        {formatCurrency(
                                                            item.price *
                                                                item.quantity
                                                        )}
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    <div className="order-total-cashier">
                                        <span>Total Pembayaran:</span>
                                        <strong>
                                            {formatCurrency(order.total)}
                                        </strong>
                                    </div>

                                    <div className="order-actions-cashier">
                                        <button
                                            className="btn-mark-paid"
                                            onClick={() =>
                                                handleMarkAsPaid(order.id)
                                            }
                                            disabled={processing === order.id}
                                        >
                                            {processing === order.id
                                                ? "Memproses..."
                                                : "Tandai Sudah Dibayar"}
                                        </button>
                                    </div>

                                    <div className="payment-instructions">
                                        <small>
                                            Terima pembayaran tunai atau debit
                                            dari pelanggan, lalu klik{" "}
                                            <strong>
                                                Tandai Sudah Dibayar
                                            </strong>{" "}
                                            untuk mengirim pesanan ke dapur
                                        </small>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default AdminCashier;
