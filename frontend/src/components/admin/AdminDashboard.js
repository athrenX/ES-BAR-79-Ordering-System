import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/config";
import { storageUrl } from "../../utils/storage";
import {
    playOrderNotification,
    initAudioContext,
} from "../../utils/notificationSound";
import Echo from "laravel-echo";
import Pusher from "pusher-js";
import "./Admin.css";

const AdminDashboard = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [filterTable, setFilterTable] = useState("");
    const [realtimeStatus, setRealtimeStatus] = useState("connecting");
    const [showDropdown, setShowDropdown] = useState(false);
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [notificationEnabled, setNotificationEnabled] = useState(true);
    const [notificationSound, setNotificationSound] = useState("beep");
    const [customText, setCustomText] = useState("");
    const [settingsError, setSettingsError] = useState("");
    const navigate = useNavigate();
    const echoRef = useRef(null);
    const isInitialMount = useRef(true);
    const lastSoundTime = useRef(0);
    const previousOrderCountRef = useRef(0);

    useEffect(() => {
        const ok = sessionStorage.getItem("adminLoggedIn") === "1";
        if (!ok) navigate("/admin");

        // Load settings dari localStorage
        const savedEnabled = localStorage.getItem("notificationEnabled");
        const savedSound = localStorage.getItem("notificationSound");
        const savedText = localStorage.getItem("customNotificationText");

        if (savedEnabled !== null)
            setNotificationEnabled(savedEnabled === "true");
        if (savedSound) setNotificationSound(savedSound);
        if (savedText) setCustomText(savedText);

        // Init AudioContext dengan user interaction
        const handleUserInteraction = () => {
            initAudioContext();
            console.log("🔊 AudioContext initialized from user interaction");
            // Remove listener setelah init
            document.removeEventListener("click", handleUserInteraction);
            document.removeEventListener("keydown", handleUserInteraction);
        };
        document.addEventListener("click", handleUserInteraction);
        document.addEventListener("keydown", handleUserInteraction);

        return () => {
            document.removeEventListener("click", handleUserInteraction);
            document.removeEventListener("keydown", handleUserInteraction);
        };
    }, [navigate]);

    // Fungsi play sound dengan debounce
    const playSound = useCallback(() => {
        // Debounce: jangan bunyi jika baru saja bunyi dalam 2 detik terakhir
        const now = Date.now();
        if (now - lastSoundTime.current < 2000) {
            console.log("🔇 Sound skipped (debounced)");
            return;
        }
        lastSoundTime.current = now;

        // Gunakan utility notifikasi dari settings
        playOrderNotification();
        console.log("🔔 Notification played from AdminDashboard");
    }, []);

    // Fetch orders function
    const fetchOrders = useCallback(async () => {
        try {
            const token = localStorage.getItem("admin_token");
            if (!token) {
                console.error("❌ No admin token found");
                setError("Silakan login kembali");
                return;
            }

            const response = await api.get("/admin/orders", {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            const raw = response.data.data || response.data;
            const normalized = (Array.isArray(raw) ? raw : [])
                .filter((o) => o.status === "Sedang Disiapkan") // HANYA yang sudah bayar
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
                        new Date(a.created_at || a.createdAt) -
                        new Date(b.created_at || b.createdAt)
                );

            setOrders(normalized);
            setError("");
            console.log(
                `✅ Orders fetched: ${normalized.length} orders (only show: Sedang Disiapkan - sudah bayar)`
            );
        } catch (err) {
            console.error("❌ Error fetching orders:", err);
            console.error("Error details:", err.response?.data);
            if (isInitialMount.current) {
                setError("Gagal memuat pesanan");
            }
        } finally {
            if (isInitialMount.current) {
                setLoading(false);
                isInitialMount.current = false;
            }
        }
    }, []);

    useEffect(() => {
        const ok = sessionStorage.getItem("adminLoggedIn") === "1";
        if (!ok) navigate("/admin");
    }, [navigate]);

    // Initialize Echo and setup listeners - RUN ONLY ONCE
    useEffect(() => {
        let mounted = true;
        let pollingInterval = null;

        // Initialize Echo
        if (!echoRef.current) {
            window.Pusher = Pusher;
            Pusher.logToConsole = true;

            echoRef.current = new Echo({
                broadcaster: "pusher",
                key: process.env.REACT_APP_PUSHER_KEY || "1e7bb5059e121e88c02e",
                cluster: process.env.REACT_APP_PUSHER_CLUSTER || "ap1",
                forceTLS: true,
                encrypted: true,
                enabledTransports: ["ws", "wss"],
                authEndpoint: `${
                    process.env.REACT_APP_API_URL ||
                    "https://esbar79.shop/api/v1"
                }/broadcasting/auth`,
            });
            console.log("✅ Echo initialized with Pusher");
            console.log("📡 Pusher Key:", process.env.REACT_APP_PUSHER_KEY);
            console.log(
                "📡 Pusher Cluster:",
                process.env.REACT_APP_PUSHER_CLUSTER
            );
        }

        // Fetch initial orders
        if (mounted) {
            fetchOrders();
        }

        // Setup Pusher listeners - Leave dulu untuk avoid duplicate
        console.log("🎧 Setting up channel: orders");

        // Leave channel dulu jika sudah ada
        if (echoRef.current) {
            try {
                echoRef.current.leave("orders");
                console.log("📌 Left previous 'orders' channel");
            } catch (e) {
                console.log("⚠️ No previous channel to leave");
            }
        }

        // Subscribe fresh
        const ordersChannel = echoRef.current.channel("orders");

        // Subscribe callback untuk memastikan channel ready
        ordersChannel.subscribed(() => {
            console.log("✅✅✅ Successfully subscribed to 'orders' channel!");
            if (mounted) setRealtimeStatus("connected");

            // Clear polling jika Pusher berhasil connect
            if (pollingInterval) {
                clearInterval(pollingInterval);
                pollingInterval = null;
                console.log("🔄 Polling stopped - Pusher active");
            }
        });

        ordersChannel.error((error) => {
            console.error("❌❌❌ Subscription error:", error);
            if (mounted) setRealtimeStatus("disconnected");

            // Fallback ke polling jika Pusher error
            if (!pollingInterval) {
                console.log(
                    "🔄 Starting fallback polling (10s interval for development)"
                );
                pollingInterval = setInterval(() => {
                    if (mounted) {
                        console.log("🔄 Polling fetch...");
                        const prevCount = previousOrderCountRef.current;
                        fetchOrders().then(() => {
                            // Cek jika ada order baru
                            const currentCount = orders.length;
                            if (currentCount > prevCount) {
                                console.log(
                                    `🆕 New orders detected! ${prevCount} → ${currentCount}`
                                );
                                if (notificationEnabled) {
                                    playSound();
                                }
                            }
                            previousOrderCountRef.current = currentCount;
                        });
                    }
                }, 10000); // Poll setiap 10 detik untuk development
            }
        });

        // Listen ke semua events
        ordersChannel
            .listen(".order.created", (event) => {
                console.log(
                    "📦 ORDER CREATED (checkout - belum bayar):",
                    event
                );
                // Tidak perlu fetchOrders karena status masih "Menunggu Pembayaran"
                // Baru muncul di admin setelah payment.success
            })
            .listen(".payment.success", (event) => {
                console.log(
                    "💰💰💰 PAYMENT SUCCESS - Pesanan baru masuk:",
                    event
                );
                console.log("🔔 Playing sound and fetching new orders...");
                if (mounted) {
                    playSound();
                    // Delay sedikit untuk memastikan database sudah update
                    setTimeout(() => {
                        fetchOrders();
                    }, 500);
                }
            })
            .listen(".order.status.updated", (event) => {
                console.log("🔄 STATUS UPDATE (TIDAK BUNYI):", event);
                if (mounted) {
                    // Tidak ada bunyi, hanya refresh data
                    setTimeout(() => {
                        fetchOrders();
                    }, 300);
                }
            });

        // Connection monitoring
        const handleConnected = () => {
            console.log("✅✅✅ Pusher connected successfully!");
            if (mounted) setRealtimeStatus("connected");
        };

        const handleDisconnected = () => {
            console.log("⚠️⚠️⚠️ Pusher disconnected!");
            if (mounted) setRealtimeStatus("disconnected");
        };

        const handleError = (err) => {
            console.error("❌❌❌ Pusher error:", err);
        };

        echoRef.current.connector.pusher.connection.bind(
            "connected",
            handleConnected
        );
        echoRef.current.connector.pusher.connection.bind(
            "disconnected",
            handleDisconnected
        );
        echoRef.current.connector.pusher.connection.bind("error", handleError);

        // Log current connection state
        console.log(
            "🔗 Current Pusher state:",
            echoRef.current.connector.pusher.connection.state
        );

        // Cleanup - Remove listeners dan leave channel
        return () => {
            mounted = false;
            console.log("🔌 Cleanup listeners and leave channel");

            // Clear polling interval
            if (pollingInterval) {
                clearInterval(pollingInterval);
                pollingInterval = null;
                console.log("🔄 Polling stopped");
            }

            if (echoRef.current) {
                // Unbind connection listeners
                echoRef.current.connector.pusher.connection.unbind(
                    "connected",
                    handleConnected
                );
                echoRef.current.connector.pusher.connection.unbind(
                    "disconnected",
                    handleDisconnected
                );
                echoRef.current.connector.pusher.connection.unbind(
                    "error",
                    handleError
                );

                // Leave channel untuk cleanup listeners
                try {
                    echoRef.current.leave("orders");
                    console.log("✅ Left orders channel on cleanup");
                } catch (e) {
                    console.log("⚠️ Error leaving channel:", e.message);
                }
            }
        };
    }, [fetchOrders, playSound]);

    const toggleDone = async (group) => {
        try {
            // Mark all orders in the group as done
            const orderIds = group.orders.map((o) => o.id);

            for (const orderId of orderIds) {
                await api.put(`/admin/orders/${orderId}/status`, {
                    status: "Selesai",
                });
            }

            // Update local state - remove all orders from this group
            setOrders((prev) => prev.filter((o) => !orderIds.includes(o.id)));

            // TIDAK ADA BUNYI saat tandai selesai
        } catch (err) {
            console.error("Error updating order status:", err);
            alert("Gagal mengupdate status pesanan");
        }
    };

    // Settings Modal Functions
    const handleCustomTextChange = (e) => {
        const text = e.target.value;
        const words = text
            .trim()
            .split(/\s+/)
            .filter((w) => w.length > 0);

        if (words.length > 3) {
            setSettingsError("Maksimal 3 kata saja");
            return;
        }

        setSettingsError("");
        setCustomText(text);
    };

    const handleSaveSettings = () => {
        const words = customText
            .trim()
            .split(/\s+/)
            .filter((w) => w.length > 0);

        if (notificationSound === "suara" && words.length === 0) {
            setSettingsError(
                "Teks notifikasi tidak boleh kosong untuk mode Suara"
            );
            return;
        }

        if (notificationSound === "suara" && words.length > 3) {
            setSettingsError("Teks notifikasi maksimal 3 kata");
            return;
        }

        // Simpan pengaturan
        localStorage.setItem(
            "notificationEnabled",
            String(notificationEnabled)
        );
        localStorage.setItem("notificationSound", notificationSound);
        localStorage.setItem("customNotificationText", customText.trim());

        console.log("💾 Settings saved:", {
            enabled: notificationEnabled,
            sound: notificationSound,
            text: customText.trim(),
        });

        setSettingsError("");
        setShowSettingsModal(false);
        alert("✓ Pengaturan berhasil disimpan!");
    };

    const handleTestSound = () => {
        if (!notificationEnabled) {
            alert("Notifikasi dinonaktifkan. Aktifkan terlebih dahulu.");
            return;
        }

        if (notificationSound === "beep") {
            console.log("🔊 Testing Beep sound");
            const audioContext = new (window.AudioContext ||
                window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.value = 800;
            oscillator.type = "sine";

            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(
                0.01,
                audioContext.currentTime + 0.5
            );

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.5);
        } else if (notificationSound === "suara") {
            const words = customText
                .trim()
                .split(/\s+/)
                .filter((w) => w.length > 0);
            if (words.length === 0) {
                alert("Masukkan teks notifikasi terlebih dahulu");
                return;
            }
            if (words.length > 3) {
                alert("Teks notifikasi maksimal 3 kata");
                return;
            }

            console.log("🗣️ Testing TTS:", customText.trim());
            const utterance = new SpeechSynthesisUtterance(customText.trim());

            // Set voice ke bahasa Indonesia
            const voices = window.speechSynthesis.getVoices();
            const idVoice = voices.find((v) => v.lang.startsWith("id-"));
            if (idVoice) utterance.voice = idVoice;

            utterance.rate = 1.0;
            utterance.pitch = 1.0;
            utterance.volume = 1.0;
            utterance.lang = "id-ID";
            utterance.lang = "id-ID";

            window.speechSynthesis.speak(utterance);
        }
    };

    const adminName = sessionStorage.getItem("adminName") || "Admin";

    const statusBadge = (status) => {
        const label = status || "Menunggu Pembayaran";
        const displayLabel =
            label === "Sedang Disiapkan" ? "Sudah Bayar" : label;
        const cls =
            label === "Selesai"
                ? "ok"
                : label === "Sedang Disiapkan"
                ? "proc"
                : label === "Menunggu Pembayaran"
                ? "warn"
                : "muted";
        return <span className={`pill ${cls}`}>{displayLabel}</span>;
    };

    const filteredOrders = orders.filter((o) => {
        if (!filterTable.trim()) return true;
        const search = filterTable.trim().toLowerCase();
        const tableId = String(o.table_id || "");
        const tableName = String(o.table_name || "").toLowerCase();
        return tableId.includes(search) || tableName.includes(search);
    });

    // Group orders by ORDER ID - setiap pesanan terpisah
    const groupedOrders = filteredOrders.map((order) => ({
        key: `order_${order.id}`, // Unique key per order
        customer_name: order.customer_name,
        table_name: order.table_name,
        table_id: order.table_id,
        orders: [order], // Single order per group
        totalAmount: Number(order.total) || 0,
        items: [...(order.items || [])],
        status: order.status,
        created_at: order.created_at || order.createdAt,
        createdAt: order.created_at || order.createdAt,
    }));

    if (loading) {
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
                                        if (
                                            window.confirm(
                                                "Yakin ingin logout?"
                                            )
                                        ) {
                                            localStorage.removeItem(
                                                "admin_token"
                                            );
                                            sessionStorage.removeItem(
                                                "adminLoggedIn"
                                            );
                                            sessionStorage.removeItem(
                                                "adminName"
                                            );
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
                        <button className="side-btn active">Pesanan</button>
                        <button
                            className="side-btn"
                            onClick={() => navigate("/admin/menu")}
                        >
                            Menu
                        </button>
                        <button
                            className="side-btn"
                            onClick={() => navigate("/admin/history")}
                        >
                            Riwayat Pesanan
                        </button>
                        <button
                            className="side-btn"
                            onClick={() =>
                                navigate("/admin/menu", {
                                    state: { openForm: true },
                                })
                            }
                        >
                            Tambah Produk
                        </button>
                    </div>
                </aside>
                <main className="admin-main">
                    <div className="page-header">
                        <div>
                            <h2>Pesanan</h2>
                            <p className="muted">Memuat pesanan...</p>
                        </div>
                    </div>
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
                    <button className="side-btn active">Pesanan</button>
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
                        <h2>Pesanan Aktif</h2>
                        <p className="muted">
                            {groupedOrders.length} pesanan aktif saat ini
                            {" • "}
                            <span
                                style={{
                                    color:
                                        realtimeStatus === "connected"
                                            ? "#10b981"
                                            : realtimeStatus === "connecting"
                                            ? "#f59e0b"
                                            : "#ef4444",
                                    fontWeight: 500,
                                }}
                            >
                                {realtimeStatus === "connected"
                                    ? "🟢 Real-time Active"
                                    : realtimeStatus === "connecting"
                                    ? "🟡 Connecting..."
                                    : "🔴 Using Fallback"}
                            </span>
                        </p>
                    </div>
                    <div className="header-actions">
                        <button
                            className="settings-icon-btn"
                            onClick={() => setShowSettingsModal(true)}
                            title="Pengaturan Notifikasi"
                            style={{
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                padding: "8px",
                                marginRight: "12px",
                                borderRadius: "8px",
                                transition: "all 0.3s ease",
                            }}
                            onMouseEnter={(e) =>
                                (e.currentTarget.style.background = "#f0f0f0")
                            }
                            onMouseLeave={(e) =>
                                (e.currentTarget.style.background = "none")
                            }
                        >
                            {/* Bell Icon untuk Notifikasi */}
                            <svg
                                width="24"
                                height="24"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                            </svg>
                        </button>
                        {/* Pusher Status Indicator */}
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                                padding: "6px 12px",
                                backgroundColor:
                                    realtimeStatus === "connected"
                                        ? "#e8f5e9"
                                        : "#fff3e0",
                                borderRadius: "20px",
                                fontSize: "12px",
                                fontWeight: "500",
                                color:
                                    realtimeStatus === "connected"
                                        ? "#2e7d32"
                                        : "#f57c00",
                                marginRight: "12px",
                            }}
                        >
                            <span
                                style={{
                                    width: "8px",
                                    height: "8px",
                                    borderRadius: "50%",
                                    backgroundColor:
                                        realtimeStatus === "connected"
                                            ? "#4caf50"
                                            : "#ff9800",
                                    animation:
                                        realtimeStatus === "connecting"
                                            ? "pulse 1.5s infinite"
                                            : "none",
                                }}
                            ></span>
                            {realtimeStatus === "connected"
                                ? "Real-time"
                                : realtimeStatus === "connecting"
                                ? "Connecting..."
                                : "Polling (10s)"}
                        </div>
                        <div className="filter-inline">
                            <input
                                type="text"
                                placeholder="Cari Nomor Meja"
                                value={filterTable}
                                onChange={(e) => {
                                    setFilterTable(e.target.value);
                                }}
                            />
                            {filterTable && (
                                <button
                                    className="chip"
                                    onClick={() => setFilterTable("")}
                                >
                                    Reset
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {error && <div className="alert error">{error}</div>}

                {groupedOrders.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">📋</div>
                        <div className="empty-title">
                            Tidak ada pesanan aktif
                        </div>
                        <div className="empty-desc">
                            Pesanan baru akan muncul di sini secara otomatis
                        </div>
                    </div>
                ) : (
                    groupedOrders.map((group, idx) => {
                        const invoiceNumbers = group.orders
                            .map((o) => String(o.id).padStart(2, "0"))
                            .join(", ");

                        // Robust date parsing
                        let orderDate;
                        const dateStr = group.created_at || group.createdAt;
                        if (dateStr) {
                            orderDate = new Date(dateStr);
                            // Check if valid
                            if (isNaN(orderDate.getTime())) {
                                orderDate = new Date();
                            }
                        } else {
                            orderDate = new Date();
                        }

                        const orderTime = orderDate.toLocaleTimeString(
                            "id-ID",
                            {
                                hour: "2-digit",
                                minute: "2-digit",
                            }
                        );
                        const orderDateStr = orderDate.toLocaleDateString(
                            "id-ID",
                            {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                            }
                        );
                        return (
                            <div className="order-card" key={idx}>
                                <div className="order-head-horizontal">
                                    <div className="invoice-badge-large">
                                        INV #{invoiceNumbers}
                                    </div>

                                    <div className="order-info-center">
                                        <div className="customer-name-badge">
                                            👤{" "}
                                            {group.customer_name ||
                                                "Tanpa Nama"}
                                        </div>
                                        <div className="table-number-badge">
                                            🪑{" "}
                                            {group.table_name ||
                                                `Meja ${group.table_id}` ||
                                                "-"}
                                        </div>
                                        <div className="order-time-badge">
                                            🕐 Pesan: {orderTime}
                                        </div>
                                    </div>

                                    <div className="order-summary-right">
                                        {statusBadge(group.status)}
                                    </div>
                                </div>

                                <div className="order-items">
                                    {group.items && group.items.length > 0 ? (
                                        group.items.map((it, itemIdx) => (
                                            <div
                                                className="item-pill"
                                                key={itemIdx}
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
                                                        alt={it.name}
                                                        className="item-thumb"
                                                        onError={(e) => {
                                                            console.error(
                                                                "Image load error:",
                                                                it.image
                                                            );
                                                            e.target.style.display =
                                                                "none";
                                                            e.target.nextSibling.style.display =
                                                                "flex";
                                                        }}
                                                    />
                                                ) : null}
                                                {!it.image || true ? (
                                                    <div
                                                        className="no-image-placeholder"
                                                        style={{
                                                            display: it.image
                                                                ? "none"
                                                                : "flex",
                                                        }}
                                                    >
                                                        🍽️
                                                    </div>
                                                ) : null}
                                                <div className="info">
                                                    <div className="name">
                                                        {it.name ||
                                                            it.menu_name ||
                                                            "Item"}
                                                    </div>
                                                    <div className="qty-badge">
                                                        {it.quantity || it.qty}x
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="muted">
                                            Tidak ada item
                                        </div>
                                    )}
                                </div>

                                <div className="order-footer">
                                    <div className="order-total-section">
                                        <span className="total-label">
                                            TOTAL BAYAR
                                        </span>
                                        <span className="total-value">
                                            Rp
                                            {Math.floor(
                                                group.totalAmount || 0
                                            ).toLocaleString("id-ID")}
                                        </span>
                                    </div>
                                    {group.status === "Selesai" ? (
                                        <button
                                            className="status-btn done"
                                            disabled
                                        >
                                            ✓ Pesanan Selesai
                                        </button>
                                    ) : (
                                        <button
                                            className="status-btn primary"
                                            onClick={() => toggleDone(group)}
                                        >
                                            Tandai Selesai
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </main>

            {/* Settings Modal */}
            {showSettingsModal && (
                <div
                    className="modal-backdrop"
                    onClick={() => setShowSettingsModal(false)}
                    style={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: "rgba(0, 0, 0, 0.5)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        zIndex: 9999,
                    }}
                >
                    <div
                        className="modal-content"
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            backgroundColor: "white",
                            borderRadius: "12px",
                            padding: "24px",
                            maxWidth: "500px",
                            width: "90%",
                            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.15)",
                        }}
                    >
                        <div
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                marginBottom: "20px",
                            }}
                        >
                            <h2 style={{ margin: 0, fontSize: "20px" }}>
                                Pengaturan Notifikasi
                            </h2>
                            <button
                                onClick={() => setShowSettingsModal(false)}
                                style={{
                                    background: "none",
                                    border: "none",
                                    fontSize: "24px",
                                    cursor: "pointer",
                                    padding: "0",
                                    color: "#666",
                                }}
                            >
                                ×
                            </button>
                        </div>

                        {settingsError && (
                            <div
                                style={{
                                    padding: "12px",
                                    backgroundColor: "#fee",
                                    color: "#c33",
                                    borderRadius: "8px",
                                    marginBottom: "16px",
                                }}
                            >
                                {settingsError}
                            </div>
                        )}

                        <div style={{ marginBottom: "20px" }}>
                            <label
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    cursor: "pointer",
                                    fontSize: "15px",
                                }}
                            >
                                <input
                                    type="checkbox"
                                    checked={notificationEnabled}
                                    onChange={(e) =>
                                        setNotificationEnabled(e.target.checked)
                                    }
                                    style={{
                                        marginRight: "10px",
                                        cursor: "pointer",
                                        width: "18px",
                                        height: "18px",
                                    }}
                                />
                                <span>Aktifkan Notifikasi Suara</span>
                            </label>
                        </div>

                        {notificationEnabled && (
                            <>
                                <div style={{ marginBottom: "20px" }}>
                                    <label
                                        style={{
                                            display: "block",
                                            marginBottom: "8px",
                                            fontSize: "14px",
                                            fontWeight: "500",
                                        }}
                                    >
                                        Jenis Suara
                                    </label>
                                    <select
                                        value={notificationSound}
                                        onChange={(e) =>
                                            setNotificationSound(e.target.value)
                                        }
                                        style={{
                                            width: "100%",
                                            padding: "10px",
                                            borderRadius: "8px",
                                            border: "1px solid #ddd",
                                            fontSize: "14px",
                                            cursor: "pointer",
                                        }}
                                    >
                                        <option value="beep">Beep</option>
                                        <option value="suara">Suara</option>
                                    </select>
                                </div>

                                {notificationSound === "suara" && (
                                    <div style={{ marginBottom: "20px" }}>
                                        <label
                                            style={{
                                                display: "block",
                                                marginBottom: "8px",
                                                fontSize: "14px",
                                                fontWeight: "500",
                                            }}
                                        >
                                            Teks Notifikasi (Maksimal 3 kata)
                                        </label>
                                        <input
                                            type="text"
                                            value={customText}
                                            onChange={handleCustomTextChange}
                                            placeholder="Contoh: Pesanan Baru Masuk"
                                            style={{
                                                width: "100%",
                                                padding: "10px",
                                                borderRadius: "8px",
                                                border: "1px solid #ddd",
                                                fontSize: "14px",
                                                boxSizing: "border-box",
                                            }}
                                        />
                                        <div
                                            style={{
                                                fontSize: "12px",
                                                color: "#666",
                                                marginTop: "6px",
                                                textAlign: "right",
                                            }}
                                        >
                                            {
                                                customText
                                                    .trim()
                                                    .split(/\s+/)
                                                    .filter((w) => w).length
                                            }
                                            /3 kata
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        {/* Test Sound Button */}
                        <div
                            style={{ marginBottom: "20px", marginTop: "20px" }}
                        >
                            <button
                                onClick={() => {
                                    console.log(
                                        "🔔 Manual test sound triggered"
                                    );
                                    playSound();
                                }}
                                style={{
                                    width: "100%",
                                    padding: "12px",
                                    backgroundColor: "#4CAF50",
                                    color: "white",
                                    border: "none",
                                    borderRadius: "8px",
                                    fontSize: "14px",
                                    fontWeight: "600",
                                    cursor: "pointer",
                                    transition: "all 0.2s",
                                }}
                                onMouseOver={(e) =>
                                    (e.currentTarget.style.backgroundColor =
                                        "#45a049")
                                }
                                onMouseOut={(e) =>
                                    (e.currentTarget.style.backgroundColor =
                                        "#4CAF50")
                                }
                            >
                                🔊 Test Sound / Suara
                            </button>
                            <div
                                style={{
                                    fontSize: "12px",
                                    color: "#666",
                                    marginTop: "8px",
                                    textAlign: "center",
                                }}
                            >
                                Klik untuk test apakah suara berfungsi
                            </div>
                        </div>

                        <div
                            style={{
                                display: "flex",
                                gap: "12px",
                                marginTop: "24px",
                            }}
                        >
                            <button
                                onClick={handleTestSound}
                                style={{
                                    flex: 1,
                                    padding: "12px",
                                    borderRadius: "8px",
                                    border: "1px solid #ddd",
                                    backgroundColor: "white",
                                    cursor: "pointer",
                                    fontSize: "14px",
                                    fontWeight: "500",
                                }}
                            >
                                Test Suara
                            </button>
                            <button
                                onClick={handleSaveSettings}
                                style={{
                                    flex: 1,
                                    padding: "12px",
                                    borderRadius: "8px",
                                    border: "none",
                                    backgroundColor: "#4CAF50",
                                    color: "white",
                                    cursor: "pointer",
                                    fontSize: "14px",
                                    fontWeight: "500",
                                }}
                            >
                                Simpan Pengaturan
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
