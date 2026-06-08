import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./Admin.css";

const AdminSettings = () => {
    const navigate = useNavigate();
    const [showDropdown, setShowDropdown] = useState(false);
    const [notificationEnabled, setNotificationEnabled] = useState(true);
    const [notificationSound, setNotificationSound] = useState("beep"); // beep, voice
    const [customText, setCustomText] = useState("Ada pesanan baru");
    const [error, setError] = useState("");

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
    }, [navigate]);

    const handleLogout = () => {
        sessionStorage.removeItem("adminLoggedIn");
        navigate("/admin");
    };

    const handleCustomTextChange = (e) => {
        const text = e.target.value;
        const words = text
            .trim()
            .split(/\s+/)
            .filter((w) => w.length > 0);

        if (words.length > 3) {
            setError("Maksimal 3 kata saja");
            return;
        }

        setError("");
        setCustomText(text);
    };

    const handleSaveSettings = () => {
        const words = customText
            .trim()
            .split(/\s+/)
            .filter((w) => w.length > 0);

        if (notificationSound === "voice" && words.length === 0) {
            setError("Teks notifikasi tidak boleh kosong");
            return;
        }

        if (notificationSound === "voice" && words.length > 3) {
            setError("Teks notifikasi maksimal 3 kata");
            return;
        }

        localStorage.setItem("notificationEnabled", notificationEnabled);
        localStorage.setItem("notificationSound", notificationSound);
        localStorage.setItem("customNotificationText", customText.trim());
        setError("");
        alert("✓ Pengaturan berhasil disimpan!");
    };

    const handleTestSound = () => {
        if (!notificationEnabled) {
            alert("Notifikasi dinonaktifkan. Aktifkan terlebih dahulu.");
            return;
        }

        if (notificationSound === "beep") {
            // Play simple beep sound
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
        } else if (notificationSound === "voice") {
            // Validasi 3 kata
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

            // Use speech synthesis
            const utterance = new SpeechSynthesisUtterance(customText.trim());
            utterance.rate = 1.0;
            utterance.pitch = 1.0;
            utterance.volume = 1.0;
            utterance.lang = "id-ID";

            window.speechSynthesis.speak(utterance);
        }
    };

    return (
        <div className="admin-dashboard-container">
            {/* Sidebar */}
            <aside className="admin-sidebar">
                <div className="sidebar-header">
                    <h2 className="sidebar-title">Admin Panel</h2>
                    <div
                        className="profile-dropdown-wrapper"
                        onMouseEnter={() => setShowDropdown(true)}
                        onMouseLeave={() => setShowDropdown(false)}
                    >
                        <div className="profile-icon">
                            <svg
                                width="24"
                                height="24"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                            >
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                <circle cx="12" cy="7" r="4" />
                            </svg>
                        </div>
                        {showDropdown && (
                            <div className="profile-dropdown">
                                <button
                                    className="logout-button"
                                    onClick={handleLogout}
                                >
                                    Logout
                                </button>
                            </div>
                        )}
                    </div>
                </div>
                <nav className="admin-nav">
                    <button
                        className="nav-button"
                        onClick={() => navigate("/admin/dashboard")}
                    >
                        <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                        >
                            <rect x="3" y="3" width="7" height="7" />
                            <rect x="14" y="3" width="7" height="7" />
                            <rect x="14" y="14" width="7" height="7" />
                            <rect x="3" y="14" width="7" height="7" />
                        </svg>
                        Dashboard
                    </button>
                    <button
                        className="nav-button"
                        onClick={() => navigate("/admin/cashier")}
                    >
                        <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                        >
                            <rect x="3" y="3" width="18" height="18" rx="2" />
                            <path d="M3 9h18" />
                        </svg>
                        Kasir
                    </button>
                    <button
                        className="nav-button"
                        onClick={() => navigate("/admin/menu")}
                    >
                        <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                        >
                            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                        </svg>
                        Kelola Menu
                    </button>
                    <button
                        className="nav-button"
                        onClick={() => navigate("/admin/tables")}
                    >
                        <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                        >
                            <rect x="3" y="3" width="18" height="18" rx="2" />
                        </svg>
                        Kelola Meja
                    </button>
                    <button
                        className="nav-button active"
                        onClick={() => navigate("/admin/settings")}
                    >
                        <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                        >
                            <circle cx="12" cy="12" r="3" />
                            <path d="M12 1v6m0 6v6m6-10.32l-5.2 3m-1.6 0L6 7.32m0 9.36l5.2-3m1.6 0l5.2 3" />
                        </svg>
                        Pengaturan
                    </button>
                    <button
                        className="nav-button"
                        onClick={() => navigate("/admin/history")}
                    >
                        <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                        >
                            <circle cx="12" cy="12" r="10" />
                            <path d="M12 6v6l4 2" />
                        </svg>
                        Riwayat Pesanan
                    </button>
                </nav>
            </aside>

            {/* Main Content */}
            <main className="admin-main-content">
                <div className="admin-header">
                    <h1 className="admin-title">Pengaturan Notifikasi</h1>
                    <p className="muted">Atur notifikasi suara pesanan masuk</p>
                </div>

                <div className="settings-container">
                    <div className="settings-card">
                        <h2 className="settings-section-title">
                            Notifikasi Pesanan Masuk
                        </h2>

                        {error && (
                            <div
                                style={{
                                    background: "#fee",
                                    border: "1px solid #fcc",
                                    borderRadius: "8px",
                                    padding: "12px",
                                    marginBottom: "20px",
                                    color: "#c33",
                                }}
                            >
                                {error}
                            </div>
                        )}

                        <div className="setting-item">
                            <label className="setting-label">
                                <input
                                    type="checkbox"
                                    checked={notificationEnabled}
                                    onChange={(e) =>
                                        setNotificationEnabled(e.target.checked)
                                    }
                                />
                                <span>Aktifkan notifikasi suara</span>
                            </label>
                        </div>

                        {notificationEnabled && (
                            <>
                                <div className="setting-item">
                                    <label className="setting-label">
                                        Jenis Suara:
                                    </label>
                                    <select
                                        className="setting-select"
                                        value={notificationSound}
                                        onChange={(e) =>
                                            setNotificationSound(e.target.value)
                                        }
                                    >
                                        <option value="beep">
                                            Beep (Suara sederhana)
                                        </option>
                                        <option value="voice">
                                            Suara (Text-to-Speech)
                                        </option>
                                    </select>
                                </div>

                                {notificationSound === "voice" && (
                                    <div className="setting-item">
                                        <label className="setting-label">
                                            Teks Notifikasi (Maksimal 3 kata):
                                        </label>
                                        <input
                                            type="text"
                                            className="setting-input"
                                            value={customText}
                                            onChange={handleCustomTextChange}
                                            placeholder="Contoh: Pesanan masuk"
                                        />
                                        <small
                                            style={{
                                                color: "#666",
                                                display: "block",
                                                marginTop: "8px",
                                            }}
                                        >
                                            Jumlah kata:{" "}
                                            {
                                                customText
                                                    .trim()
                                                    .split(/\s+/)
                                                    .filter((w) => w.length > 0)
                                                    .length
                                            }
                                            /3
                                        </small>
                                    </div>
                                )}

                                <div className="setting-actions">
                                    <button
                                        className="test-sound-btn"
                                        onClick={handleTestSound}
                                    >
                                        Test Suara
                                    </button>
                                </div>
                            </>
                        )}

                        <div className="setting-actions">
                            <button
                                className="save-settings-btn"
                                onClick={handleSaveSettings}
                            >
                                Simpan Pengaturan
                            </button>
                        </div>
                    </div>

                    <div className="settings-info">
                        <h3>Informasi</h3>
                        <p>
                            Notifikasi suara akan berbunyi di halaman Dashboard
                            setiap kali ada pesanan baru masuk.
                        </p>
                        <p>
                            Untuk mode "Suara (Text-to-Speech)", masukkan teks
                            maksimal 3 kata yang akan dibacakan sistem.
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default AdminSettings;
