import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/config";
import "./Cart.css"; // Kembalikan ke CSS lama yang lebih bagus

const Cart = () => {
    const navigate = useNavigate();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [paymentStatus, setPaymentStatus] = useState("idle");

    // State untuk session
    const [tableId, setTableId] = useState(
        () =>
            sessionStorage.getItem("table_id") ||
            localStorage.getItem("table_id") ||
            ""
    );
    const [customerName, setCustomerName] = useState(
        () =>
            sessionStorage.getItem("customer_name") ||
            localStorage.getItem("customer_name") ||
            "Pelanggan"
    );

    // Sync session dari storage ke state setiap kali storage berubah
    useEffect(() => {
        const syncSession = () => {
            const tId =
                sessionStorage.getItem("table_id") ||
                localStorage.getItem("table_id") ||
                "";
            const cName =
                sessionStorage.getItem("customer_name") ||
                localStorage.getItem("customer_name") ||
                "Pelanggan";
            setTableId(tId);
            setCustomerName(cName);
        };
        syncSession();
        window.addEventListener("storage", syncSession);
        return () => window.removeEventListener("storage", syncSession);
    });

    useEffect(() => {
        if (!tableId) {
            // Tidak ada session meja, redirect tanpa error
            navigate("/", { replace: true });
        }
    }, [tableId, navigate]);

    const mergeCart = (cartData, menuData) => {
        if (!Array.isArray(cartData)) return [];

        return cartData
            .map((row) => {
                const menu = (menuData || []).find(
                    (m) => Number(m.id) === Number(row.menu_id)
                );

                if (!menu) return null;

                return {
                    id: row.menu_id,
                    name: menu.name,
                    description: menu.description,
                    price: menu.price,
                    image: menu.image,
                    image_cropped: menu.image_cropped,
                    updated_at: menu.updated_at,
                    qty: row.quantity,
                };
            })
            .filter((item) => item !== null);
    };

    const fetchAll = async () => {
        try {
            setError("");
            if (!tableId) {
                // Jika session hilang saat fetch, redirect tanpa error
                navigate("/", { replace: true });
                return;
            }

            try {
                await api.post("/table/set", {
                    table_id: parseInt(tableId, 10),
                    customer_name: customerName,
                });
            } catch (e) {
                console.warn("Sesi backend mungkin sudah aktif.");
            }

            const [menuRes, cartRes] = await Promise.all([
                api.get("/menus"),
                api.get("/cart", {
                    params: { table_id: parseInt(tableId, 10) },
                }),
            ]);

            console.log("=== FETCH CART DEBUG ===");
            console.log("Table ID dari session:", tableId);
            console.log("Response dari /cart:", cartRes.data);

            const menuData = menuRes.data.data || menuRes.data || [];
            const cartData = cartRes.data.data || cartRes.data || [];

            console.log("Cart Data:", cartData);
            console.log("Menu Data count:", menuData.length);

            const merged = mergeCart(cartData, menuData);
            console.log("Merged cart:", merged);
            console.log("=== FETCH CART END ===");

            setItems(merged);
        } catch (err) {
            console.error("Load cart error:", err);
            if (err.response && err.response.status === 404) {
                setItems([]);
            } else {
                setError(
                    err?.response?.data?.message || "Gagal memuat keranjang"
                );
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // DISABLED: cart_snapshot menyebabkan data lama muncul
        // const cartSnapshot = localStorage.getItem(
        //     "cart_snapshot_before_payment"
        // );
        // if (cartSnapshot) {
        //     try {
        //         const parsed = JSON.parse(cartSnapshot);
        //         if (Array.isArray(parsed) && parsed.length > 0) {
        //             setItems(parsed);
        //             setLoading(false);
        //             setError("");
        //             return;
        //         }
        //     } catch {}
        // }

        // Always fetch fresh cart from server
        fetchAll();
    }, [fetchAll]);

    useEffect(() => {
        const onPaymentSuccess = () => {
            localStorage.removeItem("cart_snapshot_before_payment");
        };
        window.addEventListener("payment-success", onPaymentSuccess);
        return () =>
            window.removeEventListener("payment-success", onPaymentSuccess);
    }, []);

    const handleQuantityChange = async (productId, delta) => {
        try {
            const target = items.find(
                (it) => Number(it.id) === Number(productId)
            );
            if (!target) return;
            const next = Math.max(0, target.qty + delta);

            if (delta > 0) {
                await api.post("/cart", {
                    menu_id: productId,
                    quantity: 1,
                    table_id: parseInt(tableId, 10),
                });
            } else {
                if (next <= 0) {
                    await api.delete(`/cart/${productId}`, {
                        params: { table_id: parseInt(tableId, 10) },
                        data: { table_id: parseInt(tableId, 10) },
                    });
                } else {
                    // FIX: Gunakan endpoint yang benar untuk update quantity
                    await api.put(`/cart/${productId}`, {
                        quantity: next,
                        table_id: parseInt(tableId, 10),
                    });
                }
            }
            await fetchAll();
        } catch (err) {
            console.error("Update qty error:", err);
            setError(err?.response?.data?.message || "Gagal mengubah jumlah");
        }
    };

    const handleCheckout = async () => {
        try {
            if (items.length === 0) {
                setError("Keranjang kosong");
                return;
            }

            console.log("=== CHECKOUT START ===");
            console.log("tableId:", tableId);
            console.log("customerName:", customerName);
            console.log("items count:", items.length);

            localStorage.setItem(
                "cart_snapshot_before_payment",
                JSON.stringify(items)
            );
            setError("");
            setPaymentStatus("processing");

            // FIX SESSION: Menambahkan table_id agar tidak error session di Laravel saat Checkout
            const orderRes = await api.post("/orders", {
                customer_name: customerName,
                order_type: "dine_in",
                table_id: parseInt(tableId, 10),
            });

            console.log("✅ Order API Response:", orderRes.data);

            // Simpan ulang session ke sessionStorage dan localStorage agar persist
            sessionStorage.setItem("table_id", tableId);
            sessionStorage.setItem("customer_name", customerName);
            localStorage.setItem("table_id", tableId);
            localStorage.setItem("customer_name", customerName);

            console.log("Order response:", orderRes.data);

            // Extract dari orderRes.data.data karena format response Laravel: {success, message, data}
            const orderData = orderRes.data.data || orderRes.data;
            const { id, tracking_code, total } = orderData;

            console.log("📦 Order Created Successfully:");
            console.log("  - Order ID:", id);
            console.log("  - Tracking:", tracking_code);
            console.log("  - Total:", total);
            console.log("  - Full orderData:", orderData);

            if (!id) {
                throw new Error("Order ID not received from server");
            }

            // Langsung redirect ke payment page
            console.log("🔄 Navigating to payment page with state:", {
                orderId: id,
                tracking: tracking_code,
                total: total,
            });

            navigate("/checkout/payment", {
                state: {
                    orderId: id,
                    tracking: tracking_code,
                    total: total,
                    clearCartAfterPayment: true,
                },
            });
        } catch (err) {
            console.error("❌ Checkout error:", err);
            console.error("Error details:", err.response?.data);
            setError(err?.response?.data?.message || "Gagal membuat pesanan");
            setPaymentStatus("idle");
        }
    };

    const calculatedTotal = useMemo(() => {
        return items.reduce(
            (sum, item) => sum + parseFloat(item.price) * item.qty,
            0
        );
    }, [items]);

    if (loading) {
        return (
            <div className="cart-page">
                <div
                    style={{
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        blockSize: "80vh",
                        flexDirection: "column",
                    }}
                >
                    <div
                        className="loading-dots"
                        style={{ display: "flex", gap: "8px" }}
                    >
                        <span
                            style={{
                                inlineSize: "10px",
                                blockSize: "10px",
                                background: "#f9585b",
                                borderRadius: "50%",
                                animation: "bounce 1.4s infinite",
                            }}
                        ></span>
                        <span
                            style={{
                                inlineSize: "10px",
                                blockSize: "10px",
                                background: "#f9585b",
                                borderRadius: "50%",
                                animation: "bounce 1.4s infinite 0.2s",
                            }}
                        ></span>
                        <span
                            style={{
                                inlineSize: "10px",
                                blockSize: "10px",
                                background: "#f9585b",
                                borderRadius: "50%",
                                animation: "bounce 1.4s infinite 0.4s",
                            }}
                        ></span>
                    </div>
                    <p
                        style={{
                            color: "#666",
                            fontSize: "14px",
                            marginTop: "10px",
                        }}
                    >
                        Memuat keranjang...
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="cart-page">
            <div className="cart-header-wrapper">
                <button
                    className="back-btn-top"
                    onClick={() => navigate("/catalog")}
                >
                    ←
                </button>
            </div>
            <div
                className="cart-header"
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: "60px",
                }}
            >
                <div className="brand-logo" style={{ textAlign: "center" }}>
                    <span className="brand-name" style={{ display: "block" }}>
                        ES BAR 79
                    </span>
                    <span className="brand-sub" style={{ display: "block" }}>
                        ICE CREAM & COFFEE
                    </span>
                </div>
            </div>{" "}
            <h1 className="cart-title">Keranjang Saya</h1>
            {error && <div className="alert">{error}</div>}
            <div className="cart-list">
                {items.length === 0 ? (
                    <div className="empty">
                        Keranjang kosong. Tambahkan produk dari katalog.
                    </div>
                ) : (
                    items.map((item) => (
                        <div className="cart-item" key={item.id}>
                            <div className="cart-item-left">
                                {/* PERBAIKAN LEBAR: Menggunakan 70px x 70px agar tidak lonjong/gepeng */}
                                <div
                                    className="product-image-container"
                                    style={{
                                        width: "120px",
                                        height: "70px",
                                        flexShrink: 0,
                                    }}
                                >
                                    <div
                                        className="product-image"
                                        style={{
                                            width: "100%",
                                            height: "100%",
                                        }}
                                    >
                                        {item.image ? (
                                            <img
                                                src={`${require("../utils/storage").storageUrl(
                                                    item.image_cropped ||
                                                        item.image
                                                )}?t=${new Date(
                                                    item.updated_at
                                                ).getTime()}`}
                                                alt={item.name}
                                                style={{
                                                    width: "100%",
                                                    height: "100%",
                                                    objectFit: "cover",
                                                    borderRadius: "50%",
                                                }}
                                                onError={(e) => {
                                                    e.target.onerror = null;
                                                    e.target.src =
                                                        "https://via.placeholder.com/150?text=No+Image";
                                                }}
                                            />
                                        ) : (
                                            <div
                                                style={{
                                                    width: "100%",
                                                    height: "100%",
                                                    borderRadius: "50%",
                                                    background: "#eee",
                                                }}
                                            ></div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="cart-item-body">
                                <div className="cart-item-title">
                                    {item.name}
                                </div>
                                <div className="cart-item-price">
                                    <span>Rp </span>
                                    <span>
                                        {Math.floor(
                                            Number(item.price || 0)
                                        ).toLocaleString("id-ID")}
                                    </span>
                                </div>
                            </div>

                            <div className="cart-item-actions">
                                <button
                                    className="remove-btn"
                                    onClick={() =>
                                        handleQuantityChange(item.id, -item.qty)
                                    }
                                >
                                    {" "}
                                    ✕{" "}
                                </button>
                                <div className="qty-controls">
                                    <button
                                        onClick={() =>
                                            handleQuantityChange(item.id, -1)
                                        }
                                        disabled={item.qty <= 1}
                                    >
                                        {" "}
                                        -{" "}
                                    </button>
                                    <span>{item.qty}</span>
                                    <button
                                        onClick={() =>
                                            handleQuantityChange(item.id, 1)
                                        }
                                    >
                                        {" "}
                                        +{" "}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
            <div className="cart-bottom-bar cart-bottom-bar-vertical">
                <div className="cart-bottom-total cart-bottom-total-center">
                    <span className="cart-bottom-label">Total</span>
                    <span className="cart-bottom-currency">Rp </span>
                    <span className="cart-bottom-value">
                        {Math.floor(calculatedTotal).toLocaleString("id-ID")}
                    </span>
                </div>
                <button
                    className="cart-bottom-checkout-btn"
                    onClick={handleCheckout}
                    disabled={
                        paymentStatus === "processing" || items.length === 0
                    }
                >
                    {paymentStatus === "processing"
                        ? "Membuat Pesanan..."
                        : "Lanjutkan Pembayaran"}
                </button>
            </div>
        </div>
    );
};

export default Cart;
