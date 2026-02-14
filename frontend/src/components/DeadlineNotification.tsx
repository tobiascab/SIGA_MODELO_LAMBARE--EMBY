"use client";

import { useEffect, useState, useRef } from "react";
import { X, Bell, Clock, AlertTriangle, CalendarClock } from "lucide-react";
import { useConfig } from "@/context/ConfigContext";

const MESSAGES_TEMPLATES = [
    "¡Hola {user}! 🚀 ¡Apresúrate! El tiempo vuela. La carga de listas finaliza el {date}. ¡No te quedes fuera!",
    "¡Atención {user}! ⏳ El reloj no se detiene. Tienes hasta el {dateText} para cargar tu lista. ¡Hazlo ahora!",
    "¡Hola {user}! 🔔 Recordatorio urgente: El sistema de carga se cerrará el {date}. ¡Evita contratiempos!",
    "¡Saludos {user}! 🌟 Queda muy poco tiempo. El {dateText} es el ÚLTIMO día. ¡Carga tu lista ya!",
    "¡Hey {user}! ⚡ ¡Actúa rápido! Solo tienes hasta el {date}. ¡Asegura tu participación!",
    "¡Hola {user}! 📅 Marca tu calendario: {dateText}, fecha límite. ¡No dejes para mañana lo que puedes cargar hoy!",
    "¡Importante {user}! 🚨 El sistema se deshabilitará el {date} a las 00:00. ¡Carga tu lista antes!",
    "¡Hola {user}! 🏃‍♂️ ¡Corre! El tiempo se agota. El {dateText} es el cierre definitivo. ¡Vamos!",
    "¡Atento {user}! 🛑 No esperes al último minuto. La fecha límite es el {date}. ¡Carga ahora!",
    "¡Hola {user}! ✨ Asegúrate de tener todo listo antes del {dateText}. ¡El tiempo es oro!",
];

// Key for localStorage to persist dismissal
const DISMISS_KEY = "deadline_notification_dismissed";

export function DeadlineNotification() {
    const { fechaAsamblea } = useConfig();
    const [isVisible, setIsVisible] = useState(false);
    const [message, setMessage] = useState("");
    const [timeLeft, setTimeLeft] = useState("");
    const [user, setUser] = useState<any>(null);

    const assembleDateObj = new Date(fechaAsamblea);
    const DEADLINE = new Date(fechaAsamblea + "T00:00:00").getTime();
    const dateFormatted = new Date(fechaAsamblea).toLocaleDateString("es-PY");
    const dateText = new Date(fechaAsamblea).toLocaleDateString("es-PY", { day: 'numeric', month: 'long' });

    const handleDismiss = () => {
        setIsVisible(false);
        // Persist dismissal for today
        const today = new Date().toISOString().split('T')[0];
        localStorage.setItem(DISMISS_KEY, today);
    };

    useEffect(() => {
        const userData = localStorage.getItem("user");
        if (userData) {
            setUser(JSON.parse(userData));
        }

        // Check if already dismissed today
        const today = new Date().toISOString().split('T')[0];
        const lastDismissed = localStorage.getItem(DISMISS_KEY);
        if (lastDismissed === today) {
            return; // Don't show if dismissed today
        }

        const randomMsgTemplate = MESSAGES_TEMPLATES[Math.floor(Math.random() * MESSAGES_TEMPLATES.length)];
        const userName = userData ? JSON.parse(userData).nombreCompleto.split(' ')[0] : "Usuario";

        const personalizedMsg = randomMsgTemplate
            .replace("{user}", userName)
            .replace("{date}", dateFormatted)
            .replace("{dateText}", dateText);

        setMessage(personalizedMsg);

        const timer = setTimeout(() => {
            setIsVisible(true);
        }, 3000);

        return () => clearTimeout(timer);
    }, [fechaAsamblea, dateFormatted, dateText]);

    // Countdown Timer
    useEffect(() => {
        const interval = setInterval(() => {
            const now = new Date().getTime();
            const distance = DEADLINE - now;

            if (distance < 0) {
                setTimeLeft("¡TIEMPO AGOTADO!");
                clearInterval(interval);
                return;
            }

            const days = Math.floor(distance / (1000 * 60 * 60 * 24));
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);

            setTimeLeft(`${days}d ${hours}h ${minutes}m ${seconds}s`);
        }, 1000);

        return () => clearInterval(interval);
    }, [DEADLINE]);

    return (
        <div className={`fixed z-[100] transition-all duration-500 bottom-0 left-0 right-0 px-2 pb-2 sm:left-auto sm:right-4 sm:w-auto sm:max-w-sm ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0 pointer-events-none'}`}>
            <div className="bg-slate-900/95 backdrop-blur-xl rounded-2xl p-3 shadow-2xl border border-white/10 relative overflow-hidden">
                <button
                    onClick={handleDismiss}
                    className="absolute top-2 right-2 text-white/40 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-1.5 transition-all z-20 touch-manipulation"
                    aria-label="Cerrar notificación"
                >
                    <X size={16} />
                </button>

                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 pr-8">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="bg-amber-500 p-1.5 rounded-lg flex-shrink-0">
                            <CalendarClock className="text-white h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                            <h4 className="font-black text-white text-[10px] uppercase tracking-widest flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
                                CIERRE DE CARGAS
                            </h4>
                            <p className="text-indigo-100/90 text-[10px] font-medium">
                                Finaliza el {new Date(fechaAsamblea).toLocaleDateString("es-PY", { day: '2-digit', month: '2-digit' })}. ¡Carga ya!
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-2 bg-black/40 px-3 py-2 rounded-xl border border-white/5">
                        <span className="text-[8px] text-indigo-300 font-bold uppercase tracking-tighter sm:hidden">RESTAN</span>
                        <div className="flex items-center gap-1.5">
                            <Clock size={12} className="text-amber-400" />
                            <span className="text-xs sm:text-sm font-black text-white font-mono tabular-nums">
                                {timeLeft}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
