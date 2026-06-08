import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/config";
import "./TableSelect.css";

const TableSelect = () => {
    const [tables, setTables] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const navigate = useNavigate();

    useEffect(() => {
        loadTables();
    }, []);

    const loadTables = async () => {
        try {
            setLoading(true);
            const res = await api.get("/tables");
            const tablesData = res.data?.data || [];
            // Filter only available tables
            const availableTables = tablesData.filter(
                (t) => t.status === "available"
            );
            setTables(availableTables);
        } catch (err) {
            console.error("Error loading tables:", err);
            setError("Gagal memuat daftar meja");
        } finally {
            setLoading(false);
        }
    };

    const handleTableSelect = (table) => {
        // Redirect ke login dengan table_number parameter
        navigate(`/?table_number=${encodeURIComponent(table.name)}`);
    };

    if (loading) {
        return (
            <div className="table-select-container">
                <div className="loading-spinner">Memuat daftar meja...</div>
            </div>
        );
    }

    return (
        <div className="table-select-container">
            <div className="table-select-card">
                <h1 className="table-select-title">🍦 ES BAR 79</h1>
                <h2 className="table-select-subtitle">Pilih Nomor Meja</h2>

                {error && <div className="error-message">{error}</div>}

                {tables.length === 0 ? (
                    <div className="no-tables">
                        <p>Tidak ada meja tersedia saat ini</p>
                        <button onClick={loadTables} className="retry-btn">
                            🔄 Muat Ulang
                        </button>
                    </div>
                ) : (
                    <div className="tables-grid">
                        {tables.map((table) => (
                            <button
                                key={table.id}
                                onClick={() => handleTableSelect(table)}
                                className="table-item"
                            >
                                <div className="table-icon">🪑</div>
                                <div className="table-name">{table.name}</div>
                                <div className="table-capacity">
                                    👥 {table.capacity} orang
                                </div>
                            </button>
                        ))}
                    </div>
                )}

                <div className="table-select-footer">
                    <p className="footer-text">
                        💡 Atau scan QR Code di meja untuk lebih cepat
                    </p>
                </div>
            </div>
        </div>
    );
};

export default TableSelect;
