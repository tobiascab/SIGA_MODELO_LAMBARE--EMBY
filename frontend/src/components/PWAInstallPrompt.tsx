"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, X, Smartphone, CheckCircle, Share, Plus } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
    readonly platforms: string[];
    readonly userChoice: Promise<{
        outcome: "accepted" | "dismissed";
        platform: string;
    }>;
    prompt(): Promise<void>;
}

type DeviceType = "android" | "ios" | "desktop" | "unknown";

function detectDevice(): DeviceType {
    if (typeof window === "undefined") return "unknown";
    const ua = navigator.userAgent;
    if (/android/i.test(ua)) return "android";
    if (/iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) return "ios";
    if (/Win|Mac|Linux/.test(navigator.platform) && navigator.maxTouchPoints <= 1) return "desktop";
    return "unknown";
}

function isStandalone(): boolean {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true;
}

export function PWAInstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [showPrompt, setShowPrompt] = useState(false);
    const [isInstalled, setIsInstalled] = useState(false);
    const [dismissed, setDismissed] = useState(false);
    const [device, setDevice] = useState<DeviceType>("unknown");
    const [showIOSGuide, setShowIOSGuide] = useState(false);

    useEffect(() => {
        // Detectar dispositivo
        setDevice(detectDevice());

        // Ya está instalada
        if (isStandalone()) {
            setIsInstalled(true);
            return;
        }

        // No bloquear por dismiss anterior - siempre mostrar si no está instalada

        // Android/Chrome/Edge: evento nativo
        const handleBeforeInstall = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
            setTimeout(() => setShowPrompt(true), 3000);
        };

        window.addEventListener("beforeinstallprompt", handleBeforeInstall);

        // Detectar instalación
        window.addEventListener("appinstalled", () => {
            setIsInstalled(true);
            setShowPrompt(false);
            setDeferredPrompt(null);
            localStorage.setItem("pwa-installed", "true");
        });

        // iOS: mostrar guía manual después de 5 segundos
        const detectedDevice = detectDevice();
        if (detectedDevice === "ios") {
            setTimeout(() => setShowPrompt(true), 5000);
        }

        // Desktop sin prompt nativo: mostrar después de 8 seg
        const timeoutDesktop = setTimeout(() => {
            if (detectedDevice === "desktop" || detectedDevice === "android") {
                setShowPrompt(true);
            }
        }, 8000);

        return () => {
            window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
            clearTimeout(timeoutDesktop);
        };
    }, []);

    const handleInstall = async () => {
        if (deferredPrompt) {
            // Android/Chrome/Edge: prompt nativo
            await deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === "accepted") {
                setIsInstalled(true);
                localStorage.setItem("pwa-installed", "true");
            }
            setShowPrompt(false);
            setDeferredPrompt(null);
        } else if (device === "ios") {
            // iOS: mostrar guía manual
            setShowIOSGuide(true);
        }
    };

    const handleDismiss = () => {
        setShowPrompt(false);
        setShowIOSGuide(false);
        setDismissed(true);
        // Solo se oculta en esta sesión, al recargar vuelve a aparecer
    };

    // No mostrar si ya instalada, rechazada, o no hay razón para mostrar
    if (isInstalled || dismissed || !showPrompt) return null;

    return (
        <AnimatePresence>
            {/* Guía iOS */}
            {showIOSGuide && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[300] flex items-end sm:items-center justify-center p-4"
                    onClick={handleDismiss}
                >
                    <motion.div
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }}
                        className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="bg-gradient-to-r from-[#8B1A1A] to-[#5C0A0A] p-5 text-white">
                            <h3 className="text-lg font-black">Instalar SIGA en iPhone</h3>
                            <p className="text-sm text-red-100 mt-1">Seguí estos 3 pasos simples:</p>
                        </div>
                        <div className="p-5 space-y-4">
                            <div className="flex items-start gap-3">
                                <div className="w-8 h-8 rounded-full bg-[#8B1A1A]/10 flex items-center justify-center shrink-0 text-[#8B1A1A] font-black text-sm">1</div>
                                <div>
                                    <p className="text-sm font-bold text-slate-800">Tocá el botón Compartir</p>
                                    <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                                        El ícono <Share className="h-3.5 w-3.5 inline text-blue-500" /> en la barra inferior
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="w-8 h-8 rounded-full bg-[#8B1A1A]/10 flex items-center justify-center shrink-0 text-[#8B1A1A] font-black text-sm">2</div>
                                <div>
                                    <p className="text-sm font-bold text-slate-800">Buscá "Agregar a inicio"</p>
                                    <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                                        Desplazá y tocá <Plus className="h-3.5 w-3.5 inline text-blue-500" /> Agregar a pantalla de inicio
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="w-8 h-8 rounded-full bg-[#8B1A1A]/10 flex items-center justify-center shrink-0 text-[#8B1A1A] font-black text-sm">3</div>
                                <div>
                                    <p className="text-sm font-bold text-slate-800">Confirmá "Agregar"</p>
                                    <p className="text-xs text-slate-500 mt-0.5">¡Listo! SIGA aparecerá en tu pantalla de inicio</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-4 pt-0">
                            <button
                                onClick={handleDismiss}
                                className="w-full py-3 bg-gradient-to-r from-[#8B1A1A] to-[#5C0A0A] text-white rounded-xl font-bold text-sm active:scale-95 transition-transform"
                            >
                                Entendido
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}

            {/* Banner principal */}
            {!showIOSGuide && (
                <motion.div
                    initial={{ opacity: 0, y: 100, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 100, scale: 0.9 }}
                    className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:bottom-4 sm:w-80 z-[200] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
                >
                    {/* Header con gradiente bordó */}
                    <div className="bg-gradient-to-r from-[#8B1A1A] to-[#5C0A0A] p-4 text-white">
                        <div className="flex items-center gap-3">
                            <div className="h-12 w-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                                <Smartphone className="h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg">Instalar SIGA</h3>
                                <p className="text-sm text-red-100">Acceso rápido desde tu pantalla</p>
                            </div>
                        </div>
                    </div>

                    {/* Contenido */}
                    <div className="p-4 space-y-2.5">
                        <div className="flex items-start gap-2 text-sm text-slate-600">
                            <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                            <span>Abre más rápido, sin barra del navegador</span>
                        </div>
                        <div className="flex items-start gap-2 text-sm text-slate-600">
                            <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                            <span>Recibe notificaciones al instante</span>
                        </div>
                        <div className="flex items-start gap-2 text-sm text-slate-600">
                            <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                            <span>No ocupa espacio como una app normal</span>
                        </div>
                    </div>

                    {/* Botones */}
                    <div className="p-4 pt-0 flex gap-2">
                        <button
                            onClick={handleDismiss}
                            className="flex-1 py-2.5 px-4 text-sm font-medium text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
                        >
                            Ahora no
                        </button>
                        <button
                            onClick={handleInstall}
                            className="flex-1 py-2.5 px-4 text-sm font-bold text-white bg-gradient-to-r from-[#8B1A1A] to-[#5C0A0A] rounded-xl hover:from-[#6B1313] hover:to-[#450808] transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-200"
                        >
                            <Download className="h-4 w-4" />
                            {device === "ios" ? "Cómo instalar" : "Instalar"}
                        </button>
                    </div>

                    {/* Botón cerrar */}
                    <button
                        onClick={handleDismiss}
                        className="absolute top-3 right-3 p-1 text-white/80 hover:text-white hover:bg-white/20 rounded-full transition-colors"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
