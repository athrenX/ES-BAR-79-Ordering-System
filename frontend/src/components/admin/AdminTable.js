import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/config";
import "./Admin.css";

const AdminTable = () => {
    const navigate = useNavigate();
    const [tables, setTables] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [tableNumber, setTableNumber] = useState("");
    const [showQrPreview, setShowQrPreview] = useState(false);
    const [previewQrUrl, setPreviewQrUrl] = useState("");
    const [previewTableName, setPreviewTableName] = useState("");
    const [showDropdown, setShowDropdown] = useState(false);

    useEffect(() => {
        const ok = sessionStorage.getItem("adminLoggedIn") === "1";
        if (!ok) navigate("/admin");
    }, [navigate]);

    useEffect(() => {
        fetchTables();
    }, []);

    const fetchTables = async () => {
        try {
            setError("");
            const response = await api.get("/admin/tables");
            const data = response.data?.data || response.data || [];

            // Sort tables by number (extract number from "Meja X" and sort ascending)
            const sortedData = Array.isArray(data)
                ? data.sort((a, b) => {
                      const numA = parseInt(a.name.replace(/\D/g, ""), 10) || 0;
                      const numB = parseInt(b.name.replace(/\D/g, ""), 10) || 0;
                      return numA - numB;
                  })
                : [];

            setTables(sortedData);
        } catch (err) {
            console.error("Error fetching tables:", err);
            setError(err?.response?.data?.message || "Gagal memuat meja");
        } finally {
            setLoading(false);
        }
    };

    const handleAddClick = () => {
        setEditingId(null);
        setTableNumber("");
        setShowForm(true);
    };

    const handleEditClick = (table) => {
        setEditingId(table.id);
        // Extract number from "Meja X"
        const num = table.name.replace(/^Meja\s*/i, "");
        setTableNumber(num);
        setShowForm(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validasi input hanya angka
        if (!/^\d+$/.test(tableNumber)) {
            alert("Nomor meja harus berupa angka saja!");
            return;
        }

        const tableName = `Meja ${tableNumber}`;

        // Cek duplikasi nomor meja
        const isDuplicate = tables.some(
            (t) => t.name === tableName && t.id !== editingId
        );

        if (isDuplicate) {
            alert(
                `Nomor meja ${tableNumber} sudah ada! Silakan gunakan nomor lain.`
            );
            return;
        }

        try {
            if (editingId) {
                await api.put(`/admin/tables/${editingId}`, {
                    name: tableName,
                });
            } else {
                await api.post("/admin/tables", { name: tableName });
            }
            setShowForm(false);
            setTableNumber("");
            await fetchTables();
        } catch (err) {
            console.error("Error saving table:", err);
            setError(err?.response?.data?.message || "Gagal menyimpan meja");
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm("Apakah Anda yakin ingin menghapus meja ini?")) {
            try {
                await api.delete(`/admin/tables/${id}`);
                await fetchTables();
            } catch (err) {
                console.error("Error deleting table:", err);
                setError(
                    err?.response?.data?.message || "Gagal menghapus meja"
                );
            }
        }
    };

    const handlePreviewQr = async (tableId, tableName) => {
        try {
            const response = await api.get(`/admin/tables/${tableId}/qr-url`);
            const qrUrl = response.data.data.qr_url;
            setPreviewQrUrl(qrUrl);
            setPreviewTableName(tableName);
            setShowQrPreview(true);
        } catch (err) {
            console.error("Error preview QR:", err);
            setError("Gagal memuat QR Code");
        }
    };

    const handleDownloadQr = async (tableId, tableName) => {
        try {
            const response = await api.get(`/admin/tables/${tableId}/qr`, {
                responseType: "blob",
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute(
                "download",
                `QR_${tableName.replace(/\s+/g, "_")}.png`
            );
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error("Error downloading QR:", err);
            setError("Gagal mengunduh QR Code");
        }
    };

    const handlePrintAllQr = async () => {
        if (tables.length === 0) {
            setError("Tidak ada meja untuk dicetak");
            return;
        }

        try {
            const printWindow = window.open("", "_blank");
            printWindow.document.write(`
        <html>
          <head>
            <title>Cetak Semua QR Code - ES BAR 79</title>
            <style>
              body { 
                font-family: Arial, sans-serif; 
                padding: 20px; 
                display: flex;
                flex-wrap: wrap;
                gap: 20px;
              }
              .qr-item { 
                border: 2px solid #333; 
                padding: 15px; 
                text-align: center;
                page-break-inside: avoid;
                width: 300px;
              }
              .qr-item h3 { 
                margin: 0 0 10px 0; 
                font-size: 18px;
              }
              .qr-item img { 
                width: 250px; 
                height: 250px;
                border: 1px solid #ddd;
              }
              .qr-item p {
                margin: 10px 0 0 0;
                font-size: 12px;
                color: #666;
              }
              @media print {
                body { gap: 15px; }
                .qr-item { 
                  width: 45%; 
                  margin-bottom: 20px;
                }
              }
            </style>
          </head>
          <body>
            <h1 style="width: 100%; text-align: center; margin-bottom: 30px;">QR Code ES BAR 79</h1>
      `);

            for (const table of tables) {
                const qrResponse = await api.get(
                    `/admin/tables/${table.id}/qr-url`
                );
                const qrUrl = qrResponse.data.data.qr_url;

                printWindow.document.write(`
          <div class="qr-item">
            <h3>${table.name}</h3>
            <img src="${qrUrl}" alt="QR ${table.name}" />
            <p>Scan untuk pesan di ${table.name}</p>
          </div>
        `);
            }

            printWindow.document.write(`
          </body>
        </html>
      `);
            printWindow.document.close();

            setTimeout(() => {
                printWindow.print();
            }, 500);
        } catch (err) {
            console.error("Error printing QR codes:", err);
            setError("Gagal mencetak QR Code");
        }
    };

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
                    <button className="side-btn active">Kelola Meja</button>
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
                        <h2>Kelola Meja</h2>
                        <p className="muted">Tambah, edit, atau hapus meja</p>
                    </div>
                    <div className="header-actions">
                        <button
                            onClick={handlePrintAllQr}
                            style={{
                                padding: "10px 20px",
                                background: "#6c757d",
                                color: "white",
                                border: "none",
                                borderRadius: "6px",
                                cursor: "pointer",
                                fontSize: "14px",
                                fontWeight: "500",
                                marginRight: "10px",
                            }}
                        >
                            Cetak Semua QR
                        </button>
                        <button className="chip" onClick={handleAddClick}>
                            Tambah Meja
                        </button>
                    </div>
                </div>

                {error && <div className="alert error">{error}</div>}

                {showForm && (
                    <div
                        className="modal-overlay"
                        onClick={() => setShowForm(false)}
                    >
                        <div
                            className="modal-content"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h4>
                                {editingId ? "Edit Meja" : "Tambah Meja Baru"}
                            </h4>
                            <form
                                onSubmit={handleSubmit}
                                style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: "12px",
                                }}
                            >
                                <input
                                    type="text"
                                    placeholder="Nomor Meja (contoh: 1, 2, 3)"
                                    value={tableNumber}
                                    onChange={(e) => {
                                        // Hanya izinkan angka
                                        const value = e.target.value.replace(
                                            /\D/g,
                                            ""
                                        );
                                        setTableNumber(value);
                                    }}
                                    required
                                    style={{
                                        padding: "10px",
                                        border: "1px solid #ccc",
                                        borderRadius: "4px",
                                    }}
                                />
                                <div
                                    style={{ fontSize: "12px", color: "#666" }}
                                >
                                    {tableNumber &&
                                        `Akan disimpan sebagai: Meja ${tableNumber}`}
                                </div>
                                <div style={{ display: "flex", gap: "10px" }}>
                                    <button
                                        type="submit"
                                        className="edit-btn"
                                        style={{ flex: 1 }}
                                    >
                                        {editingId ? "Update" : "Simpan"}
                                    </button>
                                    <button
                                        type="button"
                                        className="delete-btn"
                                        style={{ flex: 1 }}
                                        onClick={() => setShowForm(false)}
                                    >
                                        Batal
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* QR Preview Modal */}
                {showQrPreview && (
                    <div
                        style={{
                            position: "fixed",
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: "rgba(0,0,0,0.7)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            zIndex: 1000,
                        }}
                        onClick={() => setShowQrPreview(false)}
                    >
                        <div
                            style={{
                                background: "white",
                                padding: "30px",
                                borderRadius: "12px",
                                textAlign: "center",
                                maxWidth: "400px",
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h3 style={{ marginTop: 0, color: "#333" }}>
                                QR Code {previewTableName}
                            </h3>
                            <img
                                src={previewQrUrl}
                                alt="QR Code"
                                style={{
                                    width: "300px",
                                    height: "300px",
                                    border: "2px solid #ddd",
                                    borderRadius: "8px",
                                }}
                            />
                            <p
                                style={{
                                    fontSize: "12px",
                                    color: "#666",
                                    marginTop: "15px",
                                }}
                            >
                                Customer scan QR ini untuk pesan di{" "}
                                {previewTableName}
                            </p>
                            <button
                                onClick={() => setShowQrPreview(false)}
                                style={{
                                    marginTop: "15px",
                                    padding: "10px 24px",
                                    background: "#6c757d",
                                    color: "white",
                                    border: "none",
                                    borderRadius: "6px",
                                    cursor: "pointer",
                                    fontSize: "14px",
                                }}
                            >
                                Tutup
                            </button>
                        </div>
                    </div>
                )}

                {loading ? (
                    <p>Memuat meja...</p>
                ) : (
                    <div className="menu-grid">
                        {tables.length === 0 ? (
                            <div className="empty">Belum ada meja</div>
                        ) : (
                            tables.map((t) => (
                                <div key={t.id} className="menu-card">
                                    <div className="menu-name">{t.name}</div>
                                    <div
                                        style={{
                                            fontSize: "12px",
                                            color: "#666",
                                            marginBottom: "8px",
                                        }}
                                    >
                                        ID: {t.id}
                                    </div>
                                    <div
                                        className="menu-actions"
                                        style={{
                                            display: "flex",
                                            gap: "6px",
                                            flexWrap: "wrap",
                                        }}
                                    >
                                        <button
                                            onClick={() =>
                                                handlePreviewQr(t.id, t.name)
                                            }
                                            style={{
                                                flex: "1 1 calc(50% - 3px)",
                                                fontSize: "11px",
                                                padding: "8px 10px",
                                                background: "#e9ecef",
                                                color: "#495057",
                                                border: "1px solid #ced4da",
                                                borderRadius: "4px",
                                                cursor: "pointer",
                                                fontWeight: "500",
                                            }}
                                        >
                                            Preview QR
                                        </button>
                                        <button
                                            onClick={() =>
                                                handleDownloadQr(t.id, t.name)
                                            }
                                            style={{
                                                flex: "1 1 calc(50% - 3px)",
                                                fontSize: "11px",
                                                padding: "8px 10px",
                                                background: "#28a745",
                                                color: "white",
                                                border: "none",
                                                borderRadius: "4px",
                                                cursor: "pointer",
                                                fontWeight: "500",
                                            }}
                                        >
                                            Download
                                        </button>
                                        <button
                                            onClick={() => handleEditClick(t)}
                                            style={{
                                                flex: "1 1 calc(50% - 3px)",
                                                fontSize: "11px",
                                                padding: "8px 10px",
                                                background: "#6c757d",
                                                color: "white",
                                                border: "none",
                                                borderRadius: "4px",
                                                cursor: "pointer",
                                                fontWeight: "500",
                                            }}
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => handleDelete(t.id)}
                                            style={{
                                                flex: "1 1 calc(50% - 3px)",
                                                fontSize: "11px",
                                                padding: "8px 10px",
                                                background: "#dc3545",
                                                color: "white",
                                                border: "none",
                                                borderRadius: "4px",
                                                cursor: "pointer",
                                                fontWeight: "500",
                                            }}
                                        >
                                            Hapus
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </main>
        </div>
    );
};

export default AdminTable;
