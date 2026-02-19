"use client";

import { useEffect, useState } from "react";
import { X, Clock, CalendarClock } from "lucide-react";
import { useConfig } from "@/context/ConfigContext";

// Key for sessionStorage to persist dismissal within session
const DISMISS_KEY = "deadline_notification_dismissed_session";

export function DeadlineNotification() {
    const { fechaAsamblea } = useConfig();
    const [isVisible, setIsVisible] = useState(false);
    const [timeLeft, setTimeLeft] = useState("");

    const DEADLINE = new Date(fechaAsamblea + "T00:00:00").getTime();

    const handleDismiss = () => {
        setIsVisible(false);
        // Persist dismissal for this browser SESSION (until tab/browser closes)
        sessionStorage.setItem(DISMISS_KEY, "true");
    };

    useEffect(() => {
        // Don't show if already dismissed this session
        if (sessionStorage.getItem(DISMISS_KEY) === "true") {
            return;
        }

        // Don't show if deadline has passed
        const now = new Date().getTime();
        if (DEADLINE - now < 0) {
            return;
        }

        // Show after 5 seconds (less intrusive)
        const timer = setTimeout(() => {
            setIsVisible(true);
        }, 5000);

        // Auto-hide after 15 seconds
        const autoHide = setTimeout(() => {
            handleDismiss();
        }, 20000);

        return () => {
            clearTimeout(timer);
            clearTimeout(autoHide);
        };
    }, [fechaAsamblea, DEADLINE]);

    // Countdown Timer
    useEffect(() => {
        const interval = setInterval(() => {
            const now = new Date().getTime();
            const distance = DEADLINE - now;

            if (distance < 0) {
                setTimeLeft("FINALIZADO");
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

    const dateFormatted = new Date(fechaAsamblea).toLocaleDateString("es-PY", {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });

    return (
        <div className={`fixed z-[100] transition-all duration-700 ease-out bottom-0 left-0 right-0 px-3 pb-3 sm:left-auto sm:right-4 sm:bottom-4 sm:w-auto sm:max-w-sm ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0 pointer-events-none'}`}>
            <div className="bg-white/95 backdrop-blur-xl rounded-2xl p-3.5 shadow-2xl shadow-violet-200/50 border border-violet-100 relative overflow-hidden">
                {/* Subtle gradient accent */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 via-purple-500 to-teal-500 rounded-t-2xl" />

                <button
                    onClick={handleDismiss}
                    className="absolute top-2.5 right-2.5 text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-full p-1.5 transition-all z-20 touch-manipulation"
                    aria-label="Cerrar notificación"
                >
                    <X size={14} />
                </button>

                <div className="flex items-center gap-3 pr-8">
                    <div className="bg-gradient-to-br from-violet-500 to-purple-600 p-2 rounded-xl flex-shrink-0 shadow-lg shadow-violet-200">
                        <CalendarClock className="text-white h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <h4 className="font-black text-slate-800 text-[10px] uppercase tracking-widest flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse shrink-0" />
                            Fecha de Asamblea
                        </h4>
                        <p className="text-slate-500 text-[11px] font-medium mt-0.5">
                            {dateFormatted}
                        </p>
                    </div>
                </div>

                <div className="flex items-center justify-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100 mt-2.5">
                    <Clock size={12} className="text-violet-500" />
                    <span className="text-[10px] text-slate-500 font-bold uppercase">Restan</span>
                    <span className="text-xs font-black text-slate-700 font-mono tabular-nums">
                        {timeLeft}
                    </span>
                </div>
            </div>
        </div>
    );
}
