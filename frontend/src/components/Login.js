import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Html5Qrcode } from "html5-qrcode";
import api from "../api/config";
import "./Login.css";

const Login = () => {
    const [nama, setNama] = useState("");
    const [nomorMeja, setNomorMeja] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [qrDetected, setQrDetected] = useState(false);
    const [selectedTableName, setSelectedTableName] = useState("");
    const [showScanner, setShowScanner] = useState(false);
    const [scannerError, setScannerError] = useState("");
    const scannerRef = useRef(null);
    const html5QrRef = useRef(null);
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    // Generate daftar meja 1-20 untuk manual selection
    const tableOptions = Array.from({ length: 20 }, (_, i) => ({
        id: i + 1,
        name: `Meja ${i + 1}`,
    }));

    const handleManualTableSelect = (e) => {
        const tableId = e.target.value;
        if (tableId) {
            const tableName = `Meja ${tableId}`;
            setNomorMeja(tableId);
            setSelectedTableName(tableName);
            setQrDetected(false);
            sessionStorage.setItem("table_id", tableId);
            sessionStorage.setItem("table_name", tableName);
        } else {
            setNomorMeja("");
            setSelectedTableName("");
        }
    };

    // Parse table number dari QR URL atau teks
    const parseTableFromQr = (decodedText) => {
        try {
            // Coba parse sebagai URL: ?table_number=X atau /table/X
            const url = new URL(decodedText);
            const tableNum = url.searchParams.get("table_number");
            if (tableNum) return tableNum;
            // Cek path /table/X
            const pathMatch = url.pathname.match(/\/table\/?(\d+)/);
            if (pathMatch) return pathMatch[1];
        } catch {
            // Bukan URL, coba parse langsung sebagai angka atau "Meja X"
            const directNum = decodedText.match(/\d+/);
            if (directNum) return directNum[0];
        }
        return null;
    };

    // Start QR Camera Scanner
    const startScanner = async () => {
        setScannerError("");
        setShowScanner(true);

        // Tunggu DOM render dulu
        await new Promise((r) => setTimeout(r, 300));

        try {
            const html5Qr = new Html5Qrcode("qr-reader");
            html5QrRef.current = html5Qr;

            await html5Qr.start(
                { facingMode: "environment" }, // Gunakan kamera belakang
                { fps: 10, qrbox: { width: 250, height: 250 } },
                (decodedText) => {
                    // QR berhasil di-scan!
                    const tableNum = parseTableFromQr(decodedText);
                    if (tableNum) {
                        const tableName = `Meja ${tableNum}`;
                        setNomorMeja(tableNum);
                        setSelectedTableName(tableName);
                        setQrDetected(true);
                        sessionStorage.setItem("table_id", tableNum);
                        sessionStorage.setItem("table_name", tableName);
                        stopScanner();
                    } else {
                        setScannerError("QR tidak dikenali. Pastikan scan QR meja ES BAR 79.");
                    }
                },
                () => {} // ignore decode errors (frame by frame)
            );
        } catch (err) {
            console.error("Scanner error:", err);
            setScannerError(
                err?.message?.includes("Permission")
                    ? "Izin kamera ditolak. Mohon izinkan akses kamera di browser."
                    : "Gagal membuka kamera. Pastikan kamera tersedia."
            );
        }
    };

    const stopScanner = async () => {
        try {
            if (html5QrRef.current) {
                await html5QrRef.current.stop();
                html5QrRef.current.clear();
                html5QrRef.current = null;
            }
        } catch (e) {
            // ignore
        }
        setShowScanner(false);
        setScannerError("");
    };

    // Cleanup scanner kalau component unmount
    useEffect(() => {
        return () => {
            if (html5QrRef.current) {
                html5QrRef.current.stop().catch(() => {});
            }
        };
    }, []);

    useEffect(() => {
        // Check if table_number (nomor meja dari QR Code) in URL
        const tableNumberFromQr = searchParams.get("table_number");

        if (tableNumberFromQr) {
            console.log(
                "🔍 QR Code detected! Table number:",
                tableNumberFromQr
            );
            // Set QR detected flag
            setQrDetected(true);

            // Load table data by table number (akan set nomorMeja di dalam fungsi)
            loadTableByNumber(tableNumberFromQr);
        }
    }, [searchParams]);

    const loadTableByNumber = async (tableNumber) => {
        try {
            console.log("📡 Loading table data for:", tableNumber);
            // API akan mencari meja berdasarkan name (nomor meja)
            const res = await api.get(`/tables/${tableNumber}`);
            console.log("✅ Table data received:", res.data);
            const tableData = res.data?.data;

            if (tableData) {
                // Jika tableData.name sudah mengandung "Meja", gunakan langsung
                // Jika tidak, tambahkan prefix "Meja"
                const tableName = tableData.name.toLowerCase().includes("meja")
                    ? tableData.name
                    : `Meja ${tableData.name}`;

                setSelectedTableName(tableName);

                // Simpan table_id (database ID) dan table_name ke session
                sessionStorage.setItem("table_id", tableData.id);
                sessionStorage.setItem("table_name", tableName);
                sessionStorage.setItem("table_number", tableData.name);

                // Set nomorMeja dengan ID untuk form submission
                setNomorMeja(tableData.id.toString());

                console.log("✅ Table info saved:", {
                    id: tableData.id,
                    name: tableName,
                    number: tableData.name,
                });
            }
        } catch (err) {
            console.error("❌ Load table error:", err);
            console.error("Error response:", err.response?.data);
            const tableName = tableNumber
                .toString()
                .toLowerCase()
                .includes("meja")
                ? tableNumber
                : `Meja ${tableNumber}`;
            setSelectedTableName(tableName);
            // Set temporary values jika gagal fetch
            sessionStorage.setItem("table_number", tableNumber);
            sessionStorage.setItem("table_name", tableName);
            setNomorMeja(tableNumber);

            // Tampilkan error ke user
            setError(
                `Gagal load data meja. Silakan scan ulang QR Code atau hubungi kasir.`
            );
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        if (!nama.trim()) {
            setError("Nama wajib diisi");
            return;
        }

        if (!nomorMeja) {
            setError("Scan QR Code di meja untuk mulai memesan");
            return;
        }

        const parsedTable = parseInt(nomorMeja, 10);
        const tableName = selectedTableName || `Meja ${parsedTable}`;

        try {
            setLoading(true);

            // Log data yang akan dikirim
            console.log("Sending to /table/set:", {
                table_id: parsedTable,
                table_name: tableName,
                customer_name: nama,
            });

            // Set table session on the backend
            const resp = await api.post("/table/set", {
                table_id: parsedTable,
                table_name: tableName,
                customer_name: nama,
            });
            console.log("Response dari /table/set:", resp.data);

            const tableId = resp.data?.table?.id || parsedTable;
            console.log("Final Table ID:", tableId);

            // Clear cart untuk user baru di meja ini
            try {
                await api.delete("/cart", {
                    data: { table_id: parseInt(tableId, 10) },
                });
                console.log("Cart cleared untuk user baru");
            } catch (clearErr) {
                console.error("Failed to clear cart:", clearErr);
                // Continue anyway - tidak critical
            }

            // PENTING: Clear session USER lama, tapi JANGAN hapus session ADMIN
            // Session admin harus tetap aman
            const adminLoggedIn = sessionStorage.getItem("adminLoggedIn");
            const adminName = sessionStorage.getItem("adminName");

            // Clear semua session
            sessionStorage.clear();

            // Restore session admin jika ada
            if (adminLoggedIn) {
                sessionStorage.setItem("adminLoggedIn", adminLoggedIn);
            }
            if (adminName) {
                sessionStorage.setItem("adminName", adminName);
            }

            console.log("User sessions cleared (admin preserved)");

            // Persist session baru untuk user ini (sessionStorage & localStorage)
            sessionStorage.setItem("customer_name", nama);
            sessionStorage.setItem("table_id", String(tableId));
            sessionStorage.setItem(
                "table_name",
                selectedTableName || `Meja ${tableId}`
            );
            localStorage.setItem("customer_name", nama);
            localStorage.setItem("table_id", String(tableId));
            localStorage.setItem(
                "table_name",
                selectedTableName || `Meja ${tableId}`
            );
            console.log("SessionStorage & localStorage disimpan:");
            console.log(
                "  - customer_name:",
                sessionStorage.getItem("customer_name"),
                localStorage.getItem("customer_name")
            );
            console.log(
                "  - table_id:",
                sessionStorage.getItem("table_id"),
                localStorage.getItem("table_id")
            );

            console.log("Navigating to /catalog...");
            console.log("=== LOGIN DEBUG END ===");
            navigate("/catalog", { state: { nama, nomorMeja: tableId } });
        } catch (err) {
            console.error("Login/set table ERROR:", err);
            console.error("Error response:", err.response);
            setError(
                err?.response?.data?.message ||
                    "Gagal login. Silakan coba lagi."
            );
        } finally {
            setLoading(false);
        }
    };

    // Helper function to safely load images
    const loadImage = (imageName) => {
        try {
            return require(`../assets/${imageName}`);
        } catch (err) {
            // Try SVG version
            const svgName = imageName.replace(".png", ".svg");
            try {
                return require(`../assets/${svgName}`);
            } catch (svgErr) {
                console.warn(
                    `Image ${imageName} not found. Please add it to src/assets/`
                );
                return null;
            }
        }
    };

    return (
        <div className="login-container">
            {/* Background Decorations - ONLY strawberry left and mint right */}
            {loadImage("strawberry.png") && (
                <div className="decoration decoration-strawberry-top-left">
                    <img src={loadImage("strawberry.png")} alt="Strawberry" />
                </div>
            )}

            {loadImage("mint.png") && (
                <div className="decoration decoration-mint-top-right">
                    <img src={loadImage("mint.png")} alt="Mint" />
                </div>
            )}

            {/* Ice Cream Image - OUTSIDE the card, in red background */}
            {loadImage("ice-cream.png") && (
                <div className="ice-cream-image">
                    <img src={loadImage("ice-cream.png")} alt="Ice Cream" />
                </div>
            )}

            {/* Login Card - Below ice cream */}
            <div className="login-card">
                {/* Logo and Title */}
                <div className="logo-section">
                    <div className="logo-box">
                        <div className="logo-text">
                            <span className="es-text">ES BAR 79</span>
                            <span className="subtitle">ICE CREAM & COFFEE</span>
                        </div>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="login-form">
                    {/* QR Code Detection Banner */}
                    {qrDetected && selectedTableName && (
                        <div
                            style={{
                                background: "#ff4444",
                                color: "white",
                                padding: "12px 16px",
                                borderRadius: "8px",
                                marginBottom: "20px",
                                textAlign: "center",
                                border: "2px solid rgba(255, 255, 255, 0.3)",
                                boxShadow: "0 2px 8px rgba(255, 68, 68, 0.3)",
                            }}
                        >
                            <div
                                style={{
                                    fontSize: "14px",
                                    fontWeight: "600",
                                    marginBottom: "2px",
                                }}
                            >
                                Anda berada di {selectedTableName}
                            </div>
                            <div style={{ fontSize: "12px", opacity: 0.9 }}>
                                Silakan masukkan nama Anda
                            </div>
                        </div>
                    )}

                    <div className="form-group">
                        <label htmlFor="nama">Nama</label>
                        <input
                            type="text"
                            id="nama"
                            value={nama}
                            onChange={(e) => setNama(e.target.value)}
                            placeholder={qrDetected ? "Masukkan nama Anda" : ""}
                            required
                        />
                    </div>

                    {/* Pilih Meja: dropdown + tombol scan jika tidak ada QR, info meja jika ada QR */}
                    {!qrDetected ? (
                        <div className="form-group">
                            <label htmlFor="meja-select">Pilih Meja</label>
                            <select
                                id="meja-select"
                                value={nomorMeja}
                                onChange={handleManualTableSelect}
                                style={{
                                    width: "100%",
                                    padding: "14px 16px",
                                    borderRadius: "8px",
                                    border: nomorMeja
                                        ? "2px solid #ff4444"
                                        : "2px solid #dee2e6",
                                    fontSize: "14px",
                                    color: nomorMeja ? "#333" : "#999",
                                    background: "white",
                                    outline: "none",
                                    cursor: "pointer",
                                    appearance: "auto",
                                    marginBottom: "10px",
                                }}
                            >
                                <option value="">-- Pilih nomor meja --</option>
                                {tableOptions.map((t) => (
                                    <option key={t.id} value={t.id}>
                                        {t.name}
                                    </option>
                                ))}
                            </select>
                            {/* Tombol Scan QR */}
                            <button
                                type="button"
                                onClick={startScanner}
                                style={{
                                    width: "100%",
                                    padding: "12px",
                                    background: "linear-gradient(135deg, #ff4444, #cc0000)",
                                    color: "white",
                                    border: "none",
                                    borderRadius: "8px",
                                    fontSize: "14px",
                                    fontWeight: "600",
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: "8px",
                                    letterSpacing: "0.3px",
                                }}
                            >
                                📷 Scan QR Code Meja
                            </button>
                        </div>
                    ) : (
                        <div style={{
                            background: "#fff3f3",
                            border: "2px solid #ff4444",
                            borderRadius: "8px",
                            padding: "12px 16px",
                            marginBottom: "15px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                        }}>
                            <div>
                                <div style={{ fontWeight: "700", color: "#ff4444", fontSize: "15px" }}>
                                    ✅ {selectedTableName}
                                </div>
                                <div style={{ fontSize: "12px", color: "#888", marginTop: "2px" }}>
                                    Terdeteksi dari QR Code
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => { setQrDetected(false); setNomorMeja(""); setSelectedTableName(""); }}
                                style={{
                                    background: "none",
                                    border: "1px solid #ccc",
                                    borderRadius: "6px",
                                    padding: "5px 10px",
                                    fontSize: "12px",
                                    cursor: "pointer",
                                    color: "#666",
                                }}
                            >
                                Ganti
                            </button>
                        </div>
                    )}

                    {/* QR Scanner Modal */}
                    {showScanner && (
                        <div style={{
                            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
                            backgroundColor: "rgba(0,0,0,0.85)",
                            display: "flex", flexDirection: "column",
                            alignItems: "center", justifyContent: "center",
                            zIndex: 9999,
                        }}>
                            <div style={{
                                background: "white", borderRadius: "16px",
                                padding: "24px", width: "340px", maxWidth: "95vw",
                                textAlign: "center",
                            }}>
                                <h3 style={{ margin: "0 0 8px", color: "#333", fontSize: "18px" }}>
                                    📷 Scan QR Code Meja
                                </h3>
                                <p style={{ margin: "0 0 16px", color: "#666", fontSize: "13px" }}>
                                    Arahkan kamera ke QR Code di meja
                                </p>

                                {/* Kamera scan area */}
                                <div
                                    id="qr-reader"
                                    ref={scannerRef}
                                    style={{
                                        width: "280px",
                                        margin: "0 auto 16px",
                                        borderRadius: "12px",
                                        overflow: "hidden",
                                        border: "3px solid #ff4444",
                                    }}
                                />

                                {scannerError && (
                                    <div style={{
                                        background: "#fff3f3", color: "#cc0000",
                                        padding: "10px", borderRadius: "8px",
                                        fontSize: "13px", marginBottom: "12px",
                                        border: "1px solid #ffcccc",
                                    }}>
                                        ⚠️ {scannerError}
                                    </div>
                                )}

                                <button
                                    type="button"
                                    onClick={stopScanner}
                                    style={{
                                        width: "100%", padding: "12px",
                                        background: "#6c757d", color: "white",
                                        border: "none", borderRadius: "8px",
                                        fontSize: "14px", fontWeight: "600",
                                        cursor: "pointer",
                                    }}
                                >
                                    ✕ Tutup Scanner
                                </button>
                            </div>
                        </div>
                    )}

                    {error && <div className="error-text">{error}</div>}

                    <button
                        type="submit"
                        className="submit-button"
                        disabled={loading || !nomorMeja}
                    >
                        {loading ? "Memproses..." : "Pesan Sekarang!"}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Login;
