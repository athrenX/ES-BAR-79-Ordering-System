import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/config";
import { storageUrl } from "../../utils/storage";
import "./Admin.css";

const AdminHistory = () => {
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    const [allOrders, setAllOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchDate, setSearchDate] = useState("");
    const [showDropdown, setShowDropdown] = useState(false);

    useEffect(() => {
        const ok = sessionStorage.getItem("adminLoggedIn") === "1";
        if (!ok) navigate("/admin");
    }, [navigate]);

    // Fetch order history with auto-refresh
    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const response = await api.get("/admin/orders");
                const data = response.data.data || response.data;
                const normalized = (Array.isArray(data) ? data : [])
                    .filter((o) => o.status === "Selesai") // Hanya tampilkan yang sudah selesai
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
                            image:
                                it.menu?.image ||
                                it.Menu?.image ||
                                it.image ||
                                null,
                        })),
                    }))
                    .sort(
                        (a, b) =>
                            new Date(b.created_at || b.createdAt) -
                            new Date(a.created_at || a.createdAt)
                    );
                setAllOrders(normalized);

                // Apply search filter if active
                if (searchDate) {
                    const filtered = normalized.filter((order) => {
                        const orderDate = new Date(
                            order.created_at || order.createdAt
                        );
                        const searchDateObj = new Date(searchDate);
                        return (
                            orderDate.toDateString() ===
                            searchDateObj.toDateString()
                        );
                    });
                    setOrders(filtered);
                } else {
                    setOrders(normalized);
                }
            } catch (err) {
                console.error("Error fetching history:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();

        // Auto-refresh every 15 seconds for real-time stats
        const interval = setInterval(fetchHistory, 15000);

        return () => clearInterval(interval);
    }, [searchDate]);

    const handlePrintPDF = () => {
        // Inject styles dan content langsung ke document untuk print
        const printContent = generatePDFContent();

        // Create iframe untuk print
        const iframe = document.createElement("iframe");
        iframe.style.position = "fixed";
        iframe.style.right = "0";
        iframe.style.bottom = "0";
        iframe.style.width = "0";
        iframe.style.height = "0";
        iframe.style.border = "none";

        document.body.appendChild(iframe);

        const iframeDoc = iframe.contentWindow.document;
        iframeDoc.open();
        iframeDoc.write(printContent);
        iframeDoc.close();

        // Wait for content to load then print
        iframe.contentWindow.focus();
        setTimeout(() => {
            iframe.contentWindow.print();
            // Remove iframe after print dialog closes
            setTimeout(() => {
                document.body.removeChild(iframe);
            }, 100);
        }, 250);
    };

    const generatePDFContent = () => {
        const targetDate = searchDate ? new Date(searchDate) : new Date();
        const dateStr = targetDate.toLocaleDateString("id-ID", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
        });

        let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Laporan Riwayat Pesanan - ES BAR 79</title>
  <style>
    @media print {
      @page {
        size: A4;
        margin: 15mm;
      }
      body {
        margin: 0;
        padding: 0;
      }
    }
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.4;
      color: #000;
      background: #fff;
    }
    
    .report-header {
      text-align: center;
      border-bottom: 3px solid #2c3e50;
      padding-bottom: 15px;
      margin-bottom: 20px;
    }
    
    .report-title {
      font-size: 24pt;
      font-weight: 900;
      color: #000;
      margin-bottom: 8px;
      letter-spacing: 0.5px;
    }
    
    .report-address {
      font-size: 10pt;
      color: #000;
      font-weight: 700;
      margin-top: 8px;
    }
    
    .report-date {
      font-size: 12pt;
      color: #000;
      font-weight: 700;
      margin: 15px 0;
      text-align: center;
      background: #ecf0f1;
      padding: 10px;
      border-radius: 5px;
    }
    
    .summary-cards {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 15px;
      margin: 20px 0;
    }
    
    .summary-card {
      background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
      color: white;
      padding: 15px;
      border-radius: 8px;
      text-align: center;
    }
    
    .summary-card.sales {
      background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
    }
    
    .summary-card.items {
      background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
    }
    
    .summary-card.top {
      background: linear-gradient(135deg, #f39c12 0%, #e67e22 100%);
    }
    
    .summary-label {
      font-size: 9pt;
      color: #000;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
      font-weight: 700;
    }
    
    .summary-value {
      font-size: 20pt;
      font-weight: 900;
      color: #000;
    }
    
    .summary-sub {
      font-size: 10pt;
      color: #000;
      margin-top: 5px;
      font-weight: 700;
    }
    
    .orders-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
      page-break-inside: auto;
      border: 2px solid #000;
    }
    
    .orders-table thead {
      background: #000;
      color: white;
    }
    
    .orders-table th {
      padding: 12px 8px;
      text-align: left;
      font-weight: 900;
      font-size: 10pt;
      border: 2px solid #000;
      color: #fff;
    }
    
    .orders-table td {
      padding: 10px 8px;
      border: 2px solid #000;
      font-size: 10pt;
      vertical-align: top;
      color: #000;
      font-weight: 600;
    }
    
    .orders-table tbody tr:nth-child(even) {
      background: #f8f9fa;
    }
    
    .orders-table tbody tr:hover {
      background: #e9ecef;
    }
    
    .item-list {
      margin: 0;
      padding-left: 15px;
    }
    
    .item-list li {
      margin-bottom: 3px;
      font-size: 9pt;
      color: #000;
      font-weight: 600;
    }
    
    .status-badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 9pt;
      font-weight: 600;
      text-align: center;
    }
    
    .status-selesai {
      background: #d4edda;
      color: #155724;
    }
    
    .status-proses {
      background: #fff3cd;
      color: #856404;
    }
    
    .status-pending {
      background: #cce5ff;
      color: #004085;
    }
    
    .status-batal {
      background: #f8d7da;
      color: #721c24;
    }
    
    .total-row {
      font-weight: 700;
      background: #ecf0f1 !important;
      font-size: 11pt;
    }
    
    .report-footer {
      margin-top: 30px;
      text-align: right;
      font-size: 10pt;
      color: #000;
      font-weight: 700;
    }
    
    .signature-box {
      margin-top: 40px;
      text-align: right;
    }
    
    .signature-line {
      margin-top: 60px;
      border-top: 1px solid #000;
      width: 200px;
      display: inline-block;
    }
  </style>
</head>
<body>
  <div class="report-header">
    <div class="report-title">LAPORAN RIWAYAT PESANAN</div>
    <div class="report-address">Jl. Kapten Halim, Lebakharjo, Labuhan Ratu, Purworejo, Jawa Tengah 61175</div>
  </div>
  
  <div class="report-date">Tanggal: ${dateStr}</div>
  `;

        // Add summary cards if there are orders
        if (stats.hasOrders) {
            html += `
  <div class="summary-cards">
    <div class="summary-card sales">
      <div class="summary-label">Total Penjualan</div>
      <div class="summary-value">Rp${Math.floor(
          stats.totalSales
      ).toLocaleString("id-ID")}</div>
    </div>
    <div class="summary-card items">
      <div class="summary-label">Jumlah Terjual</div>
      <div class="summary-value">${stats.totalItemsSold}</div>
      <div class="summary-sub">item terjual</div>
    </div>
    <div class="summary-card top">
      <div class="summary-label">Produk Terlaris</div>
      <div class="summary-value" style="font-size: 14pt;">${
          stats.topProduct ? stats.topProduct.name : "-"
      }</div>
      <div class="summary-sub">${
          stats.topProduct ? stats.topProduct.count + " terjual" : ""
      }</div>
    </div>
  </div>
      `;
        }

        // Table
        html += `
  <table class="orders-table">
    <thead>
      <tr>
        <th style="width: 8%;">No.</th>
        <th style="width: 12%;">No. Invoice</th>
        <th style="width: 15%;">Pemesan</th>
        <th style="width: 10%;">Meja</th>
        <th style="width: 12%;">Waktu</th>
        <th style="width: 23%;">Produk</th>
        <th style="width: 10%;">Status</th>
        <th style="width: 10%;">Total Pembayaran</th>
      </tr>
    </thead>
    <tbody>
    `;

        let rowNumber = 1;
        let grandTotal = 0;

        orders.forEach((order) => {
            const orderTime = new Date(order.createdAt).toLocaleTimeString(
                "id-ID",
                {
                    hour: "2-digit",
                    minute: "2-digit",
                }
            );

            const invoiceNum = String(order.id).padStart(2, "0");
            const total = Number(order.total) || 0;
            grandTotal += total;

            let statusClass = "status-proses";
            let statusText = order.status || "Proses";

            if (order.status === "Selesai") {
                statusClass = "status-selesai";
            } else if (order.status === "Menunggu Pembayaran") {
                statusClass = "status-pending";
            } else if (order.status === "Dibatalkan") {
                statusClass = "status-batal";
            }

            // Gabungkan item yang sama
            const mergedItems = {};
            (order.items || []).forEach((item) => {
                const name = item.name || "Item";
                if (mergedItems[name]) {
                    mergedItems[name] += item.quantity;
                } else {
                    mergedItems[name] = item.quantity;
                }
            });

            const itemsHTML = Object.entries(mergedItems)
                .map(
                    ([name, qty]) =>
                        `<li><strong>${name}</strong> - Qty: ${qty}</li>`
                )
                .join("");

            html += `
      <tr>
        <td>${rowNumber}</td>
        <td>INV #${invoiceNum}</td>
        <td>${order.customer_name || "Tanpa Nama"}</td>
        <td>${order.table_name || `Meja ${order.table_id}` || "-"}</td>
        <td>${orderTime}</td>
        <td><ul class="item-list">${itemsHTML || "<li>-</li>"}</ul></td>
        <td><span class="status-badge ${statusClass}">${statusText}</span></td>
        <td>Rp${Math.floor(total).toLocaleString("id-ID")}</td>
      </tr>
      `;
            rowNumber++;
        });

        // Total row
        html += `
      <tr class="total-row">
        <td colspan="7" style="text-align: right; padding-right: 15px;">TOTAL KESELURUHAN:</td>
        <td>Rp${Math.floor(grandTotal).toLocaleString("id-ID")}</td>
      </tr>
    `;

        html += `
    </tbody>
  </table>
  
  <div class="report-footer">
    <p>Dicetak pada: ${new Date().toLocaleString("id-ID")}</p>
  </div>
</body>
</html>
    `;

        return html;
    };

    // Calculate statistics based on search date or today
    const getStats = () => {
        let targetDate;

        if (searchDate) {
            // Jika ada pencarian tanggal, gunakan tanggal tersebut
            targetDate = new Date(searchDate);
            targetDate.setHours(0, 0, 0, 0);
        } else {
            // Jika tidak ada pencarian, gunakan hari ini
            targetDate = new Date();
            targetDate.setHours(0, 0, 0, 0);
        }

        const filteredOrders = allOrders.filter((order) => {
            const orderDate = new Date(order.created_at || order.createdAt);
            orderDate.setHours(0, 0, 0, 0);
            return orderDate.getTime() === targetDate.getTime();
        });

        // Total penjualan
        const totalSales = filteredOrders.reduce(
            (sum, order) => sum + (Number(order.total) || 0),
            0
        );

        // Total item terjual
        let totalItemsSold = 0;
        const productCounts = {};

        filteredOrders.forEach((order) => {
            (order.items || []).forEach((item) => {
                const quantity = item.quantity || 0;
                totalItemsSold += quantity;

                const name = item.name || item.menu_name;
                if (name) {
                    productCounts[name] = (productCounts[name] || 0) + quantity;
                }
            });
        });

        const topProduct = Object.entries(productCounts).sort(
            (a, b) => b[1] - a[1]
        )[0];

        return {
            hasOrders: filteredOrders.length > 0,
            totalSales,
            totalItemsSold,
            topProduct: topProduct
                ? { name: topProduct[0], count: topProduct[1] }
                : null,
        };
    };

    const stats = getStats();

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
                        {sessionStorage.getItem("adminName") || "Admin"}
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
                    <button
                        className="side-btn"
                        onClick={() => navigate("/admin/cashier")}
                    >
                        Kasir
                    </button>
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
                    <button className="side-btn active">Riwayat Pesanan</button>
                </div>
            </aside>

            <main className="admin-main">
                <div className="page-header">
                    <div>
                        <h2>Riwayat Pesanan</h2>
                        <p className="muted">
                            {orders.length} pesanan ditemukan
                        </p>
                    </div>
                </div>

                {/* Daily Sales Report */}
                {stats.hasOrders && (
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns:
                                "repeat(auto-fit, minmax(250px, 1fr))",
                            gap: "15px",
                            marginBottom: "20px",
                        }}
                    >
                        <div
                            style={{
                                background:
                                    "linear-gradient(135deg, #2c3e50 0%, #34495e 100%)",
                                padding: "20px",
                                borderRadius: "12px",
                                color: "white",
                                boxShadow: "0 4px 15px rgba(44, 62, 80, 0.3)",
                                transition: "transform 0.3s ease",
                                cursor: "default",
                            }}
                            onMouseEnter={(e) =>
                                (e.currentTarget.style.transform =
                                    "translateY(-5px)")
                            }
                            onMouseLeave={(e) =>
                                (e.currentTarget.style.transform =
                                    "translateY(0)")
                            }
                        >
                            <div
                                style={{
                                    fontSize: "12px",
                                    opacity: 0.9,
                                    marginBottom: "12px",
                                    fontWeight: "600",
                                    letterSpacing: "0.5px",
                                    textTransform: "uppercase",
                                }}
                            >
                                Total Penjualan
                            </div>
                            <div
                                style={{
                                    fontSize: "32px",
                                    fontWeight: "900",
                                    letterSpacing: "-1px",
                                }}
                            >
                                Rp
                                {Math.floor(
                                    stats.totalSales || 0
                                ).toLocaleString("id-ID")}
                            </div>
                        </div>

                        <div
                            style={{
                                background:
                                    "linear-gradient(135deg, #ff3d3d 0%, #e74c3c 100%)",
                                padding: "20px",
                                borderRadius: "12px",
                                color: "white",
                                boxShadow: "0 4px 15px rgba(255, 61, 61, 0.3)",
                                transition: "transform 0.3s ease",
                                cursor: "default",
                            }}
                            onMouseEnter={(e) =>
                                (e.currentTarget.style.transform =
                                    "translateY(-5px)")
                            }
                            onMouseLeave={(e) =>
                                (e.currentTarget.style.transform =
                                    "translateY(0)")
                            }
                        >
                            <div
                                style={{
                                    fontSize: "12px",
                                    opacity: 0.9,
                                    marginBottom: "12px",
                                    fontWeight: "600",
                                    letterSpacing: "0.5px",
                                    textTransform: "uppercase",
                                }}
                            >
                                Jumlah Terjual
                            </div>
                            <div
                                style={{
                                    fontSize: "32px",
                                    fontWeight: "900",
                                    letterSpacing: "-1px",
                                }}
                            >
                                {stats.totalItemsSold}
                            </div>
                            <div
                                style={{
                                    fontSize: "13px",
                                    opacity: 0.85,
                                    marginTop: "4px",
                                }}
                            >
                                item terjual
                            </div>
                        </div>

                        <div
                            style={{
                                background:
                                    "linear-gradient(135deg, #f39c12 0%, #e67e22 100%)",
                                padding: "20px",
                                borderRadius: "12px",
                                color: "white",
                                boxShadow: "0 4px 15px rgba(243, 156, 18, 0.3)",
                                transition: "transform 0.3s ease",
                                cursor: "default",
                            }}
                            onMouseEnter={(e) =>
                                (e.currentTarget.style.transform =
                                    "translateY(-5px)")
                            }
                            onMouseLeave={(e) =>
                                (e.currentTarget.style.transform =
                                    "translateY(0)")
                            }
                        >
                            <div
                                style={{
                                    fontSize: "12px",
                                    opacity: 0.9,
                                    marginBottom: "12px",
                                    fontWeight: "600",
                                    letterSpacing: "0.5px",
                                    textTransform: "uppercase",
                                }}
                            >
                                Produk Terlaris
                            </div>
                            <div
                                style={{
                                    fontSize: "17px",
                                    fontWeight: "900",
                                    lineHeight: 1.4,
                                    letterSpacing: "0.3px",
                                }}
                            >
                                {stats.topProduct
                                    ? `${stats.topProduct.name}`
                                    : "Belum ada data"}
                            </div>
                            {stats.topProduct && (
                                <div
                                    style={{
                                        fontSize: "14px",
                                        opacity: 0.85,
                                        marginTop: "6px",
                                        fontWeight: "600",
                                    }}
                                >
                                    {stats.topProduct.count} terjual
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <div className="history-filters">
                    <input
                        type="date"
                        value={searchDate}
                        onChange={(e) => {
                            setSearchDate(e.target.value);
                            if (e.target.value) {
                                const filtered = allOrders.filter((order) => {
                                    const orderDate = new Date(order.createdAt);
                                    const searchDateObj = new Date(
                                        e.target.value
                                    );
                                    return (
                                        orderDate.toDateString() ===
                                        searchDateObj.toDateString()
                                    );
                                });
                                setOrders(filtered);
                            } else {
                                setOrders(allOrders);
                            }
                        }}
                    />
                    <button className="btn" onClick={handlePrintPDF}>
                        Cetak PDF
                    </button>
                </div>

                {loading ? (
                    <p>Memuat riwayat pesanan...</p>
                ) : orders.length === 0 ? (
                    <div
                        style={{
                            padding: "20px",
                            textAlign: "center",
                            color: "#999",
                        }}
                    >
                        Tidak ada riwayat pesanan
                    </div>
                ) : (
                    orders
                        .reduce((groups, order) => {
                            let date;
                            const dateVal = order.created_at || order.createdAt;
                            if (dateVal) {
                                date = new Date(dateVal);
                                if (isNaN(date.getTime())) {
                                    date = new Date();
                                }
                            } else {
                                date = new Date();
                            }
                            const dateStr = date.toLocaleDateString("id-ID", {
                                weekday: "long",
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                            });

                            const existingGroup = groups.find(
                                (g) => g.dateTitle === dateStr
                            );
                            if (existingGroup) {
                                existingGroup.rows.push(order);
                            } else {
                                groups.push({
                                    dateTitle: dateStr,
                                    rows: [order],
                                });
                            }
                            return groups;
                        }, [])
                        .map((g, idx) => (
                            <div className="history-group" key={idx}>
                                <div className="date-title">{g.dateTitle}</div>
                                {/* Display orders individually without merging */}
                                {g.rows.map((order, i) => {
                                    let orderTime = "-";
                                    const orderDateVal =
                                        order.created_at || order.createdAt;
                                    if (orderDateVal) {
                                        const orderDate = new Date(
                                            orderDateVal
                                        );
                                        if (!isNaN(orderDate.getTime())) {
                                            orderTime =
                                                orderDate.toLocaleTimeString(
                                                    "id-ID",
                                                    {
                                                        hour: "2-digit",
                                                        minute: "2-digit",
                                                    }
                                                );
                                        }
                                    }

                                    // Waktu konfirmasi dari updatedAt (saat tandai selesai)
                                    let confirmTime = orderTime;
                                    const updateDateVal =
                                        order.updated_at || order.updatedAt;
                                    if (updateDateVal) {
                                        const updateDate = new Date(
                                            updateDateVal
                                        );
                                        if (!isNaN(updateDate.getTime())) {
                                            confirmTime =
                                                updateDate.toLocaleTimeString(
                                                    "id-ID",
                                                    {
                                                        hour: "2-digit",
                                                        minute: "2-digit",
                                                    }
                                                );
                                        }
                                    }

                                    const invoiceNumber = String(
                                        order.id
                                    ).padStart(2, "0");

                                    return (
                                        <div className="history-row" key={i}>
                                            <div className="history-main">
                                                <div className="history-header order-head-horizontal">
                                                    <div className="invoice-badge-large">
                                                        INV #{invoiceNumber}
                                                    </div>

                                                    <div className="order-info-center">
                                                        <div className="customer-name-badge">
                                                            <svg
                                                                width="14"
                                                                height="14"
                                                                viewBox="0 0 24 24"
                                                                fill="none"
                                                                stroke="currentColor"
                                                                strokeWidth="2"
                                                                style={{
                                                                    marginRight:
                                                                        "4px",
                                                                }}
                                                            >
                                                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                                                <circle
                                                                    cx="12"
                                                                    cy="7"
                                                                    r="4"
                                                                />
                                                            </svg>
                                                            {order.customer_name ||
                                                                "Tamu"}
                                                        </div>
                                                        <div className="table-number-badge">
                                                            <svg
                                                                width="14"
                                                                height="14"
                                                                viewBox="0 0 24 24"
                                                                fill="none"
                                                                stroke="currentColor"
                                                                strokeWidth="2"
                                                                style={{
                                                                    marginRight:
                                                                        "4px",
                                                                }}
                                                            >
                                                                <rect
                                                                    x="3"
                                                                    y="3"
                                                                    width="18"
                                                                    height="18"
                                                                    rx="2"
                                                                />
                                                            </svg>
                                                            {order.table_name ||
                                                                (order.table_id
                                                                    ? `Meja ${order.table_id}`
                                                                    : "Meja -")}
                                                        </div>
                                                        <div className="order-time-badge">
                                                            <svg
                                                                width="14"
                                                                height="14"
                                                                viewBox="0 0 24 24"
                                                                fill="none"
                                                                stroke="currentColor"
                                                                strokeWidth="2"
                                                                style={{
                                                                    marginRight:
                                                                        "4px",
                                                                }}
                                                            >
                                                                <circle
                                                                    cx="12"
                                                                    cy="12"
                                                                    r="10"
                                                                />
                                                                <path d="M12 6v6l4 2" />
                                                            </svg>
                                                            Pesan: {orderTime}
                                                        </div>
                                                        <div className="order-complete-badge">
                                                            <svg
                                                                width="14"
                                                                height="14"
                                                                viewBox="0 0 24 24"
                                                                fill="none"
                                                                stroke="currentColor"
                                                                strokeWidth="2"
                                                                style={{
                                                                    marginRight:
                                                                        "4px",
                                                                }}
                                                            >
                                                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                                                                <polyline points="22 4 12 14.01 9 11.01" />
                                                            </svg>
                                                            Selesai:{" "}
                                                            {confirmTime}
                                                        </div>
                                                    </div>

                                                    <div className="order-summary-right">
                                                        <div className="order-total-large">
                                                            Rp
                                                            {Math.floor(
                                                                order.total || 0
                                                            ).toLocaleString(
                                                                "id-ID"
                                                            )}
                                                        </div>
                                                        {order.status ===
                                                            "Selesai" && (
                                                            <span className="status-badge success">
                                                                Selesai
                                                            </span>
                                                        )}
                                                        {order.status ===
                                                            "Menunggu Pembayaran" && (
                                                            <span className="status-badge pending">
                                                                Menunggu
                                                                Pembayaran
                                                            </span>
                                                        )}
                                                        {order.status ===
                                                            "Sedang Disiapkan" && (
                                                            <span className="status-badge process">
                                                                Sedang Disiapkan
                                                            </span>
                                                        )}
                                                        {order.status ===
                                                            "Dibatalkan" && (
                                                            <span className="status-badge canceled">
                                                                Dibatalkan
                                                            </span>
                                                        )}
                                                        {!order.status && (
                                                            <span className="status-badge process">
                                                                Proses
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="history-items">
                                                    {(order.items || []).map(
                                                        (it, idx) => (
                                                            <div
                                                                className="history-item"
                                                                key={idx}
                                                            >
                                                                {it.image ? (
                                                                    <img
                                                                        src={
                                                                            storageUrl(
                                                                                it.image_cropped ||
                                                                                    it.image
                                                                            ) +
                                                                            "?t=" +
                                                                            Date.now()
                                                                        }
                                                                        alt={
                                                                            it.name
                                                                        }
                                                                        className="history-item-image"
                                                                        onError={(
                                                                            e
                                                                        ) => {
                                                                            e.target.style.display =
                                                                                "none";
                                                                            e.target.nextSibling.style.display =
                                                                                "flex";
                                                                        }}
                                                                    />
                                                                ) : null}
                                                                {!it.image ||
                                                                true ? (
                                                                    <div
                                                                        className="history-no-image"
                                                                        style={{
                                                                            display:
                                                                                it.image
                                                                                    ? "none"
                                                                                    : "flex",
                                                                        }}
                                                                    >
                                                                        🍽️
                                                                    </div>
                                                                ) : null}
                                                                <div className="history-item-details">
                                                                    <div className="history-item-name">
                                                                        {it.name ||
                                                                            "Item"}
                                                                    </div>
                                                                    <div className="history-item-qty">
                                                                        Qty:{" "}
                                                                        {
                                                                            it.quantity
                                                                        }
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )
                                                    )}
                                                </div>

                                                <div className="history-footer">
                                                    <button
                                                        className="invoice-btn"
                                                        onClick={() =>
                                                            navigate(
                                                                `/invoice/${order.id}`,
                                                                {
                                                                    state: {
                                                                        fromAdmin: true,
                                                                    },
                                                                }
                                                            )
                                                        }
                                                    >
                                                        Lihat Invoice
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ))
                )}
            </main>
        </div>
    );
};

export default AdminHistory;
