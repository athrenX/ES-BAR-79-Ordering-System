import React, { useState, useRef, useEffect } from "react";
import storageUrl from "../../utils/storage"; // Pastikan path ini sesuai
import "./ImageCropper.css";

const ImageCropper = ({ imageUrl, onCropComplete, onCancel }) => {
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [showGrid, setShowGrid] = useState(false);
    const [imageLoaded, setImageLoaded] = useState(false);
    const [imageDimensions, setImageDimensions] = useState({
        width: 0,
        height: 0,
    });

    const imgRef = useRef(null);
    const containerRef = useRef(null);
    const handlersRef = useRef({});

    // --- Event Handler Wrappers ---
    const stableWheel = useRef(
        (e) =>
            handlersRef.current.handleWheel &&
            handlersRef.current.handleWheel(e)
    );
    const stableTouchStart = useRef(
        (e) =>
            handlersRef.current.handleTouchStart &&
            handlersRef.current.handleTouchStart(e)
    );
    const stableTouchMove = useRef(
        (e) =>
            handlersRef.current.handleTouchMove &&
            handlersRef.current.handleTouchMove(e)
    );
    const stableTouchEnd = useRef(
        (e) =>
            handlersRef.current.handleTouchEnd &&
            handlersRef.current.handleTouchEnd(e)
    );

    // --- Image Load Logic ---
    const handleImageLoad = () => {
        if (imgRef.current) {
            const img = imgRef.current;
            setImageDimensions({
                width: img.naturalWidth,
                height: img.naturalHeight,
            });
            setImageLoaded(true);
        }
    };

    useEffect(() => {
        setImageLoaded(false);
        setImageDimensions({ width: 0, height: 0 });
        const img = imgRef.current;
        if (!img) return;

        if (img.complete && img.naturalWidth > 0) {
            handleImageLoad();
            return;
        }

        const onLoad = () => handleImageLoad();
        const onError = (e) => {
            console.error("ImageCropper: image failed to load", imageUrl, e);
            setImageLoaded(false);
        };

        img.addEventListener("load", onLoad);
        img.addEventListener("error", onError);

        return () => {
            try {
                img.removeEventListener("load", onLoad);
                img.removeEventListener("error", onError);
            } catch (e) {}
        };
    }, [imageUrl]);

    // --- Reset & Zoom Logic ---
    const handleReset = () => {
        setCrop({ x: 0, y: 0 });
        setZoom(1);
    };

    const handleWheel = (e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        setZoom((prev) => Math.max(0.2, Math.min(3, prev + delta)));
    };

    // --- Touch Logic ---
    const [touchStart, setTouchStart] = useState(null);
    const [lastTouchDistance, setLastTouchDistance] = useState(null);

    const getTouchDistance = (touches) => {
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        return Math.sqrt(dx * dx + dy * dy);
    };

    const handleTouchStart = (e) => {
        if (e.touches.length === 1) {
            setIsDragging(true);
            setTouchStart({
                x: e.touches[0].clientX - crop.x,
                y: e.touches[0].clientY - crop.y,
            });
        } else if (e.touches.length === 2) {
            setLastTouchDistance(getTouchDistance(e.touches));
        }
    };

    const handleTouchMove = (e) => {
        e.preventDefault();
        if (e.touches.length === 1 && isDragging && touchStart) {
            setCrop({
                x: e.touches[0].clientX - touchStart.x,
                y: e.touches[0].clientY - touchStart.y,
            });
        } else if (e.touches.length === 2 && lastTouchDistance) {
            const newDistance = getTouchDistance(e.touches);
            const delta = (newDistance - lastTouchDistance) * 0.01;
            setZoom((prev) => Math.max(0.2, Math.min(3, prev + delta)));
            setLastTouchDistance(newDistance);
        }
    };

    const handleTouchEnd = () => {
        setIsDragging(false);
        setTouchStart(null);
        setLastTouchDistance(null);
    };

    // --- Mouse Logic ---
    const handleMouseDown = (e) => {
        setIsDragging(true);
        setDragStart({ x: e.clientX - crop.x, y: e.clientY - crop.y });
    };

    const handleMouseMove = (e) => {
        if (!isDragging) return;
        setCrop({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    // --- Attach Listeners ---
    useEffect(() => {
        handlersRef.current = {
            handleWheel,
            handleTouchStart,
            handleTouchMove,
            handleTouchEnd,
        };
    }, [handleWheel, handleTouchStart, handleTouchMove, handleTouchEnd]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;
        container.addEventListener("wheel", stableWheel.current, {
            passive: false,
        });
        container.addEventListener("touchstart", stableTouchStart.current, {
            passive: false,
        });
        container.addEventListener("touchmove", stableTouchMove.current, {
            passive: false,
        });
        container.addEventListener("touchend", stableTouchEnd.current, {
            passive: false,
        });
        return () => {
            container.removeEventListener("wheel", stableWheel.current);
            container.removeEventListener(
                "touchstart",
                stableTouchStart.current
            );
            container.removeEventListener("touchmove", stableTouchMove.current);
            container.removeEventListener("touchend", stableTouchEnd.current);
        };
    }, []);

    useEffect(() => {
        const onKey = (e) => {
            if (e.key === "Escape") onCancel && onCancel();
        };
        window.addEventListener("keydown", onKey);
        const container = containerRef.current;
        if (container && container.focus) {
            container.tabIndex = -1;
            container.focus();
        }
        return () => window.removeEventListener("keydown", onKey);
    }, [onCancel]);

    // =========================================================
    // FUNGSI UTAMA: CROP & RESIZE (AGAR FILE KECIL)
    // =========================================================
    const handleCrop = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const img = imgRef.current;
        const container = containerRef.current;

        if (!img || !container) return;
        if (!img.complete || img.naturalWidth === 0) {
            alert(
                "Gambar belum selesai dimuat. Tunggu sebentar dan coba lagi."
            );
            return;
        }

        // 1. KUNCI UTAMA: KITA SET UKURAN OUTPUT FIXED KE 600px
        // Ini menjamin file tidak akan bengkak jadi 5MB++ walau di-zoom
        const outputSize = 600;
        canvas.width = outputSize;
        canvas.height = outputSize;

        // Hitung area mana dari gambar asli yang harus diambil
        const rect = container.getBoundingClientRect();

        // Ratio antara pixel natural gambar vs pixel yang tampil di layar
        const scaleX = img.naturalWidth / (img.width * zoom);
        const scaleY = img.naturalHeight / (img.height * zoom);

        const cropCircleEl = container.querySelector(".crop-circle");
        const circleRect = cropCircleEl
            ? cropCircleEl.getBoundingClientRect()
            : { width: 300, height: 300 }; // Default fallback
        const containerRect = container.getBoundingClientRect();
        const imgRect = img.getBoundingClientRect();

        // Cari titik tengah crop circle di layar
        const cropCenterXPage = containerRect.left + containerRect.width / 2;
        const cropCenterYPage = containerRect.top + containerRect.height / 2;

        // Cari titik tengah itu jatuhnya di koordinat gambar yang mana
        const centerInImageDisplayedX = cropCenterXPage - imgRect.left;
        const centerInImageDisplayedY = cropCenterYPage - imgRect.top;

        // Konversi ke koordinat natural (asli) gambar
        const displayedToNaturalX = img.naturalWidth / imgRect.width;
        const displayedToNaturalY = img.naturalHeight / imgRect.height;

        // Hitung lebar/tinggi area yang mau dicrop dalam pixel asli
        const srcW = circleRect.width * displayedToNaturalX;
        const srcH = circleRect.height * displayedToNaturalY;

        // Hitung titik pojok kiri-atas (Start X/Y) area crop di gambar asli
        const centerNaturalX = centerInImageDisplayedX * displayedToNaturalX;
        const centerNaturalY = centerInImageDisplayedY * displayedToNaturalY;

        let sx = Math.round(centerNaturalX - srcW / 2);
        let sy = Math.round(centerNaturalY - srcH / 2);

        // 2. Background Putih (Wajib untuk JPEG)
        // Mencegah background jadi hitam jika gambar aslinya transparan
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, outputSize, outputSize);

        // 3. Buat Klip Lingkaran
        ctx.beginPath();
        ctx.arc(outputSize / 2, outputSize / 2, outputSize / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();

        try {
            // 4. Gambar ulang: Ambil area (sx, sy, srcW, srcH) -> Taruh di canvas (0, 0, 600, 600)
            // Ini otomatis melakukan resizing
            ctx.drawImage(
                img,
                sx,
                sy,
                srcW,
                srcH,
                0,
                0,
                outputSize,
                outputSize
            );

            // 5. Konversi ke Blob JPEG Kompresi 70%
            canvas.toBlob(
                (blob) => {
                    if (blob) {
                        // Debugging: Lihat ukuran file di console (biasanya 50kb - 150kb)
                        console.log(
                            `Ukuran file hasil crop: ${(
                                blob.size / 1024
                            ).toFixed(2)} KB`
                        );

                        const croppedFile = new File(
                            [blob],
                            "cropped-menu.jpg", // Nama file .jpg
                            { type: "image/jpeg" } // Mime type jpeg
                        );

                        onCropComplete(
                            croppedFile,
                            canvas.toDataURL("image/jpeg")
                        );
                    }
                },
                "image/jpeg", // Format JPEG (Ringan)
                0.7 // Kualitas 70% (Sangat Kecil & Aman)
            );
        } catch (error) {
            console.error("Error cropping image:", error);
            alert("Gagal crop gambar.");
        }
    };

    return (
        <div className="image-cropper-modal">
            <div className="cropper-container">
                <h3>Crop Gambar Menjadi Bulat</h3>
                <div
                    className="preview-meta"
                    style={{
                        textAlign: "center",
                        marginBottom: 12,
                        color: "#6c757d",
                        fontSize: 13,
                    }}
                >
                    {imageLoaded
                        ? `${imageDimensions.width} × ${imageDimensions.height} px (Asli)`
                        : "Pratinjau gambar"}
                </div>

                <div
                    className="crop-area"
                    ref={containerRef}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                >
                    <img
                        ref={imgRef}
                        crossOrigin="anonymous"
                        src={(function () {
                            try {
                                return storageUrl(imageUrl);
                            } catch (e) {
                                return imageUrl;
                            }
                        })()}
                        alt="Crop preview"
                        onLoad={handleImageLoad}
                        style={{
                            transform: `translate(${crop.x}px, ${crop.y}px) scale(${zoom})`,
                            cursor: isDragging ? "grabbing" : "grab",
                            transition: isDragging
                                ? "none"
                                : "transform 0.1s ease-out",
                            maxWidth: imageLoaded ? "none" : "100%",
                            maxHeight: imageLoaded ? "none" : "100%",
                            width: imageLoaded ? "auto" : "100%",
                            height: imageLoaded ? "auto" : "100%",
                            opacity: imageLoaded ? 1 : 0,
                        }}
                        onError={(e) => {
                            console.error("Image failed to load:", imageUrl, e);
                        }}
                    />
                    {!imageLoaded && (
                        <div className="image-loading">
                            <div className="spinner"></div>
                            <p>Memuat gambar...</p>
                        </div>
                    )}
                    <div className="crop-circle"></div>
                    {showGrid && (
                        <>
                            <div
                                className="grid-line grid-h"
                                style={{ top: "33.33%" }}
                            ></div>
                            <div
                                className="grid-line grid-h"
                                style={{ top: "66.66%" }}
                            ></div>
                            <div
                                className="grid-line grid-v"
                                style={{ left: "33.33%" }}
                            ></div>
                            <div
                                className="grid-line grid-v"
                                style={{ left: "66.66%" }}
                            ></div>
                        </>
                    )}
                </div>

                <div className="crop-controls">
                    <div className="control-row">
                        <label>
                            <span className="control-label">
                                🔍 Zoom: {zoom.toFixed(1)}x
                            </span>
                            <input
                                type="range"
                                min="0.2"
                                max="3"
                                step="0.1"
                                value={zoom}
                                onChange={(e) =>
                                    setZoom(parseFloat(e.target.value))
                                }
                                className="zoom-slider"
                            />
                        </label>
                    </div>
                    <div className="control-row control-buttons">
                        <button className="control-btn" onClick={handleReset}>
                            🔄 Reset
                        </button>
                        <button
                            className={`control-btn ${
                                showGrid ? "active" : ""
                            }`}
                            onClick={() => setShowGrid(!showGrid)}
                        >
                            📐 Grid
                        </button>
                    </div>
                    <div className="crop-tips">
                        💡 <strong>Tips:</strong> Drag gambar untuk posisi •
                        Scroll/pinch untuk zoom
                    </div>
                </div>

                <div className="crop-actions">
                    <button className="cancel-btn" onClick={onCancel}>
                        ✖ Batal
                    </button>
                    <button className="crop-btn" onClick={handleCrop}>
                        ✓ Potong & Simpan
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ImageCropper;
