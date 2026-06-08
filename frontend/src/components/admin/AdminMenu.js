import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../../api/config";
import ImageCropper from "./ImageCropper";
import "./Admin.css";

const AdminMenu = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [menus, setMenus] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [filterCategory, setFilterCategory] = useState("");
    const [filterStatus, setFilterStatus] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [showCropper, setShowCropper] = useState(false);
    const [tempImageUrl, setTempImageUrl] = useState(null);
    const [showDropdown, setShowDropdown] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        category: "Es Krim", // Default value disesuaikan
        price: "",
        status: "Tersedia",
        description: "",
        image: null,
        imagePreview: null,
    });
    const imageInputRef = useRef(null);

    useEffect(() => {
        const ok = sessionStorage.getItem("adminLoggedIn") === "1";
        if (!ok) navigate("/admin");
        if (location.state?.openForm) {
            setShowForm(true);
        }
    }, [navigate, location.state]);

    // Fetch menus
    useEffect(() => {
        const fetchMenus = async () => {
            try {
                setError("");
                const response = await api.get("/admin/menus");
                const data = response.data.data || response.data;
                setMenus(Array.isArray(data) ? data : []);
            } catch (err) {
                console.error("Error fetching menus:", err);
                setError(err?.response?.data?.message || "Gagal memuat menu");
            } finally {
                setLoading(false);
            }
        };
        fetchMenus();
    }, []);

    const handleAddClick = () => {
        setEditingId(null);
        setFormData({
            name: "",
            category: "Es Krim",
            price: "",
            status: "Tersedia",
            description: "",
            image: null,
            imagePreview: null,
        });
        setShowForm(true);
    };

    const handleEditClick = (menu) => {
        setEditingId(menu.id);
        setFormData({
            name: menu.name,
            category: menu.category,
            price: menu.price,
            status: menu.status || "Tersedia",
            description: menu.description || "",
            image: null,
            imagePreview: menu.image_cropped || menu.image || null,
        });
        setShowForm(true);
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const url = URL.createObjectURL(file);
            setTempImageUrl(url);
            setShowCropper(true);
        }
    };

    const handleCropComplete = async (croppedFile) => {
        if (editingId) {
            const form = new FormData();
            form.append("cropped", croppedFile);

            try {
                // 1. Upload file
                await api.post(`/admin/menus/${editingId}/crop`, form, {
                    headers: { "Content-Type": "multipart/form-data" },
                    transformRequest: (data) => data,
                });

                // 2. Ambil data terbaru dari server
                const response2 = await api.get("/admin/menus");
                const data = response2.data.data || response2.data;
                const menusTerbaru = Array.isArray(data) ? data : [];

                // Update daftar menu di grid
                setMenus(menusTerbaru);

                // 3. Cari data menu yang baru saja diupdate
                const menuBaru = menusTerbaru.find((m) => m.id === editingId);

                // 4. Update preview dengan "Cache Buster" (?t=timestamp)
                // Ini memaksa browser menampilkan gambar hasil crop yang baru
                const time = new Date().getTime();
                const newPreview = menuBaru?.image_cropped || menuBaru?.image;

                setFormData((f) => ({
                    ...f,
                    image: null,
                    imagePreview: newPreview ? `${newPreview}?t=${time}` : null,
                }));

                setShowCropper(false);
                if (tempImageUrl) URL.revokeObjectURL(tempImageUrl);
                setTempImageUrl(null);

                alert("Gambar berhasil diperbarui!");
            } catch (err) {
                console.error("Detail Error:", err.response?.data);
                setError(
                    "Gagal upload: " +
                        (err.response?.data?.message || err.message)
                );
            }
        } else {
            // Logika untuk menu baru
            const objectUrl = URL.createObjectURL(croppedFile);
            setFormData({
                ...formData,
                image: croppedFile,
                imagePreview: objectUrl,
            });
            setShowCropper(false);
            if (tempImageUrl) URL.revokeObjectURL(tempImageUrl);
            setTempImageUrl(null);
        }
    };

    const handleCropCancel = () => {
        if (tempImageUrl) {
            URL.revokeObjectURL(tempImageUrl);
        }
        setShowCropper(false);
        setTempImageUrl(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(""); // Clear error

        // Validasi nama menu (maksimal 3 kata)
        const nameWords = formData.name.trim().split(/\s+/);
        if (nameWords.length > 3) {
            setError("Nama menu maksimal 3 kata");
            return;
        }

        // Validasi deskripsi (minimal 10 karakter, maksimal sekitar 2 baris ~100 karakter)
        const descLength = formData.description.trim().length;
        if (descLength < 10) {
            setError("Deskripsi minimal 10 karakter");
            return;
        }
        if (descLength > 100) {
            setError("Deskripsi maksimal 100 karakter (sekitar 2 baris)");
            return;
        }

        try {
            const submitData = new FormData();
            submitData.append("name", formData.name.trim());
            submitData.append("category", formData.category);
            submitData.append("price", formData.price);
            submitData.append("status", formData.status);
            submitData.append("description", formData.description.trim());

            // Validasi gambar untuk menu baru
            if (!editingId && !formData.image) {
                setError("Gambar menu harus diisi untuk menu baru");
                return;
            }

            // Upload gambar jika ada
            if (formData.image && typeof formData.image !== "string") {
                // formData.image sudah berisi File object dari cropper atau file asli
                submitData.append("image", formData.image);
            }

            if (editingId) {
                // Update menu (Edit)
                submitData.append("_method", "PUT");
                await api.post(`/admin/menus/${editingId}`, submitData, {
                    headers: { "Content-Type": "multipart/form-data" },
                });
            } else {
                // Create menu (Baru)
                await api.post("/admin/menus", submitData, {
                    headers: { "Content-Type": "multipart/form-data" },
                });
            }

            // Refresh Data
            const response2 = await api.get("/admin/menus");
            const data = response2.data.data || response2.data;
            setMenus(Array.isArray(data) ? data : []);

            setShowForm(false);
            setFormData({
                name: "",
                category: "Es Krim",
                price: "",
                status: "Tersedia",
                description: "",
                image: null,
                imagePreview: null,
            });
        } catch (err) {
            console.error("Error saving menu:", err);
            // Menampilkan pesan error validasi lebih detail
            if (err.response && err.response.status === 422) {
                const validationErrors = err.response.data.errors;
                let errorMsg = "Validasi Gagal:\n";
                for (const key in validationErrors) {
                    errorMsg += `- ${validationErrors[key][0]}\n`;
                }
                setError(errorMsg);
            } else {
                setError(
                    err?.response?.data?.message || "Gagal menyimpan menu"
                );
            }
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm("Yakin ingin menghapus menu ini?")) {
            try {
                await api.delete(`/admin/menus/${id}`);
                setMenus((prev) => prev.filter((m) => m.id !== id));
            } catch (err) {
                console.error("Error deleting menu:", err);
                setError(
                    err?.response?.data?.message || "Gagal menghapus menu"
                );
            }
        }
    };

    // Render sama seperti sebelumnya...
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
                    <button className="side-btn active">Menu</button>
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
                        <h2>Menu</h2>
                        <p className="muted">Kelola daftar menu & gambar</p>
                    </div>
                    <div className="header-actions">
                        <input
                            type="text"
                            placeholder="🔍 Cari menu..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{
                                padding: "8px 16px",
                                borderRadius: "8px",
                                border: "1px solid #ddd",
                                minWidth: "200px",
                                fontSize: "14px",
                            }}
                        />
                        <select
                            value={filterCategory}
                            onChange={(e) => setFilterCategory(e.target.value)}
                            className="chip"
                            style={{ minWidth: "160px" }}
                        >
                            <option value="">Semua Kategori</option>
                            <option value="Es Krim">🍦 Ice Cream</option>
                            <option value="Makanan">🍕 Makanan</option>
                            <option value="Minuman">☕ Minuman</option>
                        </select>
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="chip"
                            style={{ minWidth: "140px" }}
                        >
                            <option value="">Semua Status</option>
                            <option value="Tersedia">✅ Tersedia</option>
                            <option value="Habis">❌ Habis</option>
                        </select>
                        <button className="chip" onClick={handleAddClick}>
                            ➕ Tambah Produk
                        </button>
                    </div>
                </div>

                {showForm && (
                    <div
                        className="modal-overlay"
                        onClick={() => setShowForm(false)}
                    >
                        <div
                            className="modal-content"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button
                                className="modal-close"
                                onClick={() => setShowForm(false)}
                                style={{
                                    position: "absolute",
                                    top: "15px",
                                    right: "15px",
                                    background: "transparent",
                                    border: "none",
                                    fontSize: "24px",
                                    cursor: "pointer",
                                    color: "#666",
                                }}
                            >
                                ×
                            </button>
                            <h4
                                style={{
                                    textAlign: "center",
                                    margin: "0 0 20px 0",
                                }}
                            >
                                {editingId ? "Edit Menu" : "Tambah Menu Baru"}
                            </h4>

                            {error && (
                                <div
                                    className="alert error"
                                    style={{
                                        whiteSpace: "pre-wrap",
                                        marginTop: "16px",
                                        marginBottom: "16px",
                                    }}
                                >
                                    {error}
                                </div>
                            )}
                            <form
                                onSubmit={handleSubmit}
                                style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: "16px",
                                }}
                            >
                                <div>
                                    <label
                                        className="input-label"
                                        style={{
                                            display: "block",
                                            marginBottom: "8px",
                                            fontWeight: "600",
                                            color: "#333",
                                        }}
                                    >
                                        Nama Menu
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Contoh: Ice Cream Vanilla, Nasi Goreng, Kopi Susu"
                                        value={formData.name}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                name: e.target.value,
                                            })
                                        }
                                        required
                                        className="form-input"
                                    />
                                </div>

                                <div>
                                    <label
                                        className="input-label"
                                        style={{
                                            display: "block",
                                            marginBottom: "8px",
                                            fontWeight: "600",
                                            color: "#333",
                                        }}
                                    >
                                        Kategori
                                    </label>
                                    <select
                                        value={formData.category}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                category: e.target.value,
                                            })
                                        }
                                        className="form-input"
                                    >
                                        <option value="Es Krim">
                                            Ice Cream
                                        </option>
                                        <option value="Makanan">Makanan</option>
                                        <option value="Minuman">Minuman</option>
                                    </select>
                                </div>

                                <div className="form-row">
                                    <div className="form-col">
                                        <label className="input-label">
                                            Harga
                                        </label>
                                        <input
                                            type="number"
                                            placeholder="Contoh: 12000"
                                            value={formData.price}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    price: parseFloat(
                                                        e.target.value
                                                    ),
                                                })
                                            }
                                            required
                                            className="form-input"
                                        />
                                    </div>
                                    <div className="form-col">
                                        <label className="input-label">
                                            Status
                                        </label>
                                        <select
                                            value={formData.status}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    status: e.target.value,
                                                })
                                            }
                                            className="form-input"
                                        >
                                            <option value="Tersedia">
                                                Tersedia
                                            </option>
                                            <option value="Habis">Habis</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="image-upload-section">
                                    <label className="image-upload-label">
                                        Gambar Produk
                                    </label>
                                    {formData.imagePreview ? (
                                        <div style={{ textAlign: "center" }}>
                                            <div
                                                role="button"
                                                tabIndex={0}
                                                title="Klik untuk ganti gambar"
                                                onClick={() =>
                                                    imageInputRef.current &&
                                                    imageInputRef.current.click()
                                                }
                                                style={{
                                                    width: "150px",
                                                    height: "150px",
                                                    borderRadius: "50%",
                                                    overflow: "hidden",
                                                    border: "3px solid #ddd",
                                                    boxShadow:
                                                        "0 4px 12px rgba(0,0,0,0.1)",
                                                    margin: "12px auto",
                                                    position: "relative",
                                                    cursor: "pointer",
                                                }}
                                            >
                                                {(() => {
                                                    let previewSrc = "";
                                                    const value =
                                                        formData.imagePreview;
                                                    try {
                                                        const storage = require("../../utils/storage");
                                                        if (
                                                            typeof value ===
                                                            "string"
                                                        ) {
                                                            previewSrc =
                                                                storage.storageUrl(
                                                                    value
                                                                );
                                                        } else if (
                                                            value instanceof
                                                            Blob
                                                        ) {
                                                            previewSrc =
                                                                URL.createObjectURL(
                                                                    value
                                                                );
                                                        } else {
                                                            previewSrc = "";
                                                        }
                                                    } catch (err) {
                                                        if (
                                                            typeof value ===
                                                            "string"
                                                        )
                                                            previewSrc = value;
                                                    }

                                                    return (
                                                        <img
                                                            src={previewSrc}
                                                            alt="Preview"
                                                            style={{
                                                                width: "100%",
                                                                height: "100%",
                                                                objectFit:
                                                                    "cover",
                                                                display:
                                                                    "block",
                                                            }}
                                                            onError={(e) => {
                                                                e.target.style.display =
                                                                    "none";
                                                            }}
                                                        />
                                                    );
                                                })()}
                                            </div>
                                            <div
                                                style={{
                                                    display: "flex",
                                                    gap: "10px",
                                                    justifyContent: "center",
                                                }}
                                            >
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        imageInputRef.current &&
                                                        imageInputRef.current.click()
                                                    }
                                                    style={{
                                                        padding: "10px 20px",
                                                        background: "#ff3d3d",
                                                        color: "white",
                                                        border: "none",
                                                        borderRadius: "8px",
                                                        cursor: "pointer",
                                                        fontWeight: "600",
                                                        marginTop: "10px",
                                                    }}
                                                >
                                                    📷 Ganti Gambar
                                                </button>
                                            </div>
                                            <input
                                                id="imageInput"
                                                ref={imageInputRef}
                                                type="file"
                                                accept="image/*"
                                                onChange={handleImageChange}
                                                style={{ display: "none" }}
                                            />
                                        </div>
                                    ) : (
                                        <div
                                            style={{
                                                textAlign: "center",
                                                padding: "20px",
                                            }}
                                        >
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    imageInputRef.current &&
                                                    imageInputRef.current.click()
                                                }
                                                style={{
                                                    padding: "15px 30px",
                                                    background: "#f0f0f0",
                                                    color: "#333",
                                                    border: "2px dashed #ccc",
                                                    borderRadius: "8px",
                                                    cursor: "pointer",
                                                    fontWeight: "600",
                                                    fontSize: "15px",
                                                }}
                                            >
                                                📁 Pilih Gambar
                                            </button>
                                            <input
                                                id="imageInput"
                                                ref={imageInputRef}
                                                type="file"
                                                accept="image/*"
                                                onChange={handleImageChange}
                                                style={{ display: "none" }}
                                            />
                                            <p
                                                style={{
                                                    fontSize: "12px",
                                                    color: "#999",
                                                    marginTop: "10px",
                                                }}
                                            >
                                                Gambar akan dipangkas bulat
                                                otomatis
                                            </p>
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <textarea
                                        placeholder="Deskripsi (opsional)"
                                        value={formData.description}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                description: e.target.value,
                                            })
                                        }
                                        className="form-input"
                                        style={{
                                            minHeight: "100px",
                                            resize: "vertical",
                                        }}
                                    />
                                </div>

                                <div className="form-actions">
                                    <button type="submit" className="edit-btn">
                                        {editingId
                                            ? "Update Menu"
                                            : "Simpan Menu"}
                                    </button>
                                    <button
                                        type="button"
                                        className="delete-btn"
                                        onClick={() => setShowForm(false)}
                                    >
                                        Batal
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Sisa render menu grid tetap sama */}
                {loading ? (
                    <p>Memuat menu...</p>
                ) : (
                    <>
                        <div className="menu-grid">
                            {menus
                                .filter((m) => {
                                    if (
                                        filterCategory &&
                                        m.category !== filterCategory
                                    )
                                        return false;
                                    if (
                                        filterStatus &&
                                        m.status !== filterStatus
                                    )
                                        return false;
                                    if (searchTerm) {
                                        const search = searchTerm.toLowerCase();
                                        const name = (
                                            m.name || ""
                                        ).toLowerCase();
                                        const category = (
                                            m.category || ""
                                        ).toLowerCase();
                                        const description = (
                                            m.description || ""
                                        ).toLowerCase();
                                        return (
                                            name.includes(search) ||
                                            category.includes(search) ||
                                            description.includes(search)
                                        );
                                    }
                                    return true;
                                })
                                .map((m) => {
                                    const isOutOfStock = m.status === "Habis";
                                    return (
                                        <div
                                            key={m.id}
                                            className={`menu-card ${
                                                isOutOfStock ? "soldout" : ""
                                            }`}
                                        >
                                            <div
                                                className={`badge ${
                                                    isOutOfStock
                                                        ? "grey"
                                                        : "green"
                                                }`}
                                            >
                                                {m.status || "Tersedia"}
                                            </div>
                                            <div
                                                className="menu-thumb"
                                                style={{ overflow: "hidden" }}
                                            >
                                                {m.image_cropped || m.image ? (
                                                    <img
                                                        src={require("../../utils/storage").storageUrl(
                                                            m.image_cropped ||
                                                                m.image
                                                        )}
                                                        alt={m.name}
                                                        style={{
                                                            width: "100%",
                                                            height: "100%",
                                                            objectFit: "cover",
                                                            filter: isOutOfStock
                                                                ? "grayscale(100%)"
                                                                : "none",
                                                            opacity:
                                                                isOutOfStock
                                                                    ? 0.6
                                                                    : 1,
                                                        }}
                                                    />
                                                ) : null}
                                            </div>
                                            <div className="menu-name">
                                                {m.name}
                                            </div>
                                            <div
                                                style={{
                                                    fontSize: "12px",
                                                    color: "#666",
                                                    marginBottom: "8px",
                                                }}
                                            >
                                                {m.category}
                                            </div>
                                            <div className="menu-price">
                                                RP{" "}
                                                {Math.floor(
                                                    m.price || 0
                                                ).toLocaleString("id-ID")}
                                            </div>
                                            <div className="menu-actions">
                                                <button
                                                    className="edit-btn"
                                                    onClick={() =>
                                                        handleEditClick(m)
                                                    }
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    className="delete-btn"
                                                    onClick={() =>
                                                        handleDelete(m.id)
                                                    }
                                                >
                                                    Hapus
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>
                    </>
                )}
            </main>

            {showCropper && tempImageUrl && (
                <ImageCropper
                    imageUrl={tempImageUrl}
                    onCropComplete={handleCropComplete}
                    onCancel={handleCropCancel}
                />
            )}
        </div>
    );
};

export default AdminMenu;
