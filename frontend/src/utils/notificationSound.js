// Utility untuk memutar notifikasi suara pesanan baru

// Resume AudioContext jika suspended (browser autoplay policy)
let audioContextInstance = null;

const getAudioContext = () => {
    if (!audioContextInstance) {
        audioContextInstance = new (window.AudioContext ||
            window.webkitAudioContext)();
    }
    // Resume jika suspended
    if (audioContextInstance.state === "suspended") {
        audioContextInstance.resume();
    }
    return audioContextInstance;
};

// Init audio context dengan user interaction
export const initAudioContext = () => {
    try {
        const ctx = getAudioContext();
        console.log("🔊 AudioContext initialized:", ctx.state);
        return ctx;
    } catch (error) {
        console.error("❌ Failed to init AudioContext:", error);
        return null;
    }
};

export const playOrderNotification = () => {
    // Ambil pengaturan dari localStorage
    const notificationEnabled = localStorage.getItem("notificationEnabled");
    const notificationSound = localStorage.getItem("notificationSound");
    const customText = localStorage.getItem("customNotificationText");

    // Jika notifikasi dinonaktifkan, JANGAN BUNYI SAMA SEKALI
    if (notificationEnabled === "false") {
        console.log("🔇 Notifikasi dinonaktifkan - tidak ada suara");
        return;
    }

    const soundType = notificationSound || "beep";
    console.log("🔔 Playing notification:", soundType);

    try {
        if (soundType === "beep") {
            // Play beep sound dengan proper AudioContext handling
            const audioContext = getAudioContext();

            // Pastikan context aktif
            if (audioContext.state === "suspended") {
                audioContext.resume().then(() => {
                    playBeep(audioContext);
                });
            } else {
                playBeep(audioContext);
            }
        } else if (soundType === "suara") {
            // HANYA Play TTS dengan text dari admin - DINAMIS 100%
            const text =
                customText && customText.trim() !== "" ? customText : null;
            if (!text) {
                console.log(
                    "🔇 Tidak ada input suara admin, TTS tidak berbunyi"
                );
                return;
            }

            console.log("🗣️ Speaking:", text);

            // Cancel any pending utterances
            window.speechSynthesis.cancel();

            const utterance = new SpeechSynthesisUtterance(text);

            // Set voice ke bahasa Indonesia jika tersedia
            const voices = window.speechSynthesis.getVoices();
            const idVoice = voices.find((v) => v.lang.startsWith("id-"));
            if (idVoice) {
                utterance.voice = idVoice;
                console.log("🎤 Using voice:", idVoice.name);
            }

            utterance.rate = 1.0;
            utterance.pitch = 1.0;
            utterance.volume = 1.0;
            utterance.lang = "id-ID";

            window.speechSynthesis.speak(utterance);
        }
    } catch (error) {
        console.error("❌ Error playing notification sound:", error);
        // Fallback: coba dengan Audio API
        try {
            playFallbackBeep();
        } catch (e) {
            console.error("❌ Fallback also failed:", e);
        }
    }
};

// Helper function untuk play beep
const playBeep = (audioContext) => {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800;
    oscillator.type = "sine";

    gainNode.gain.setValueAtTime(0.5, audioContext.currentTime); // Louder
    gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        audioContext.currentTime + 0.5
    );

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);

    console.log("🔊 Beep played successfully");
};

// Fallback beep menggunakan Audio element (data URI)
const playFallbackBeep = () => {
    // Short beep as base64 audio
    const beepDataUri =
        "data:audio/wav;base64,UklGRl4AAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YToAAAB/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/";
    const audio = new Audio(beepDataUri);
    audio.volume = 0.5;
    audio
        .play()
        .then(() => {
            console.log("🔊 Fallback beep played");
        })
        .catch((err) => {
            console.error("❌ Fallback beep failed:", err);
        });
};
