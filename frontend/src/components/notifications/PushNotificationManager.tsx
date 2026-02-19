"use client";

import { useEffect, useState } from 'react';
import axios from 'axios';
import { X } from 'lucide-react';

function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

export default function PushNotificationManager({ userRole }: { userRole?: string }) {
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [permission, setPermission] = useState('default');
    const [dismissed, setDismissed] = useState(false);
    const [mounted, setMounted] = useState(false);

    const isAllowedRole = userRole === 'SUPER_ADMIN' || userRole === 'DIRECTIVO';

    useEffect(() => {
        setMounted(true);
        // Verificar si el usuario ya descartó el prompt suficientes veces
        const dismissCount = parseInt(localStorage.getItem('pushPromptDismissCount') || '0', 10);
        // Mostrar solo cada 5 sesiones
        if (dismissCount > 0 && dismissCount % 5 !== 0) {
            setDismissed(true);
        }
        // También respetar el descarte de sesión actual
        const wasDismissed = sessionStorage.getItem('pushPromptDismissed');
        if (wasDismissed === 'true') {
            setDismissed(true);
        }

        if (!isAllowedRole) return;

        if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window) {
            setPermission(Notification.permission);

            // Registrar el service worker
            navigator.serviceWorker.register('/sw.js', { scope: '/' })
                .then(async (registration) => {
                    const subscription = await registration.pushManager.getSubscription();
                    if (subscription) {
                        setIsSubscribed(true);
                    }
                })
                .catch((error) => {
                    console.error('Push: Error al registrar Service Worker:', error);
                });
        }
    }, [userRole, isAllowedRole]);

    const handleDismiss = () => {
        setDismissed(true);
        sessionStorage.setItem('pushPromptDismissed', 'true');
        // Incrementar contador para mostrar cada 5 sesiones
        const count = parseInt(localStorage.getItem('pushPromptDismissCount') || '0', 10);
        localStorage.setItem('pushPromptDismissCount', String(count + 1));
    };

    const subscribeUser = async () => {
        if ('serviceWorker' in navigator && 'PushManager' in window) {
            try {
                const registration = await navigator.serviceWorker.ready;
                const permissionResult = await Notification.requestPermission();
                setPermission(permissionResult);

                if (permissionResult === 'granted') {
                    const response = await axios.get('/api/push/public-key', {
                        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                    });
                    const publicKey = response.data.publicKey;

                    const existingSub = await registration.pushManager.getSubscription();
                    if (existingSub) {
                        await existingSub.unsubscribe();
                    }

                    const convertedVapidKey = urlBase64ToUint8Array(publicKey);
                    const subscription = await registration.pushManager.subscribe({
                        userVisibleOnly: true,
                        applicationServerKey: convertedVapidKey
                    });

                    const subJson = subscription.toJSON();
                    await axios.post('/api/push/subscribe', {
                        endpoint: subJson.endpoint,
                        keys_p256dh: subJson.keys?.p256dh,
                        keys_auth: subJson.keys?.auth
                    }, {
                        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                    });

                    setIsSubscribed(true);
                    new Notification("🚀 Notificaciones Activas", {
                        body: "Recibirás alertas de chat y actividad en tiempo real.",
                        icon: '/logo.png'
                    });
                }
            } catch (error) {
                console.error('Push: Error en suscripción:', error);
                alert("Para recibir notificaciones, por favor habilítalas en la configuración de tu navegador.");
            }
        }
    };

    if (!mounted || !isAllowedRole || permission === 'denied' || isSubscribed || dismissed) {
        return null;
    }

    return (
        <div className="fixed bottom-2 left-2 right-2 sm:left-auto sm:bottom-6 sm:right-6 bg-white p-4 sm:p-5 rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.2)] border border-slate-100 z-[100] flex flex-col gap-3 sm:gap-4 sm:max-w-[320px] animate-in fade-in slide-in-from-bottom-5 duration-700">
            <button
                onClick={handleDismiss}
                className="absolute top-3 right-3 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all"
                title="Cerrar"
            >
                <X className="h-4 w-4" />
            </button>

            <div className="flex gap-4">
                <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-3 rounded-2xl text-white shadow-lg shadow-emerald-200 shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>
                </div>
                <div className="pt-1">
                    <h4 className="font-bold text-slate-900 leading-tight">Activar Alertas Push</h4>
                    <p className="text-sm text-slate-500 mt-1 lines-clamp-2">
                        Enterate al instante de nuevos mensajes y consultas, incluso con la web cerrada.
                    </p>
                </div>
            </div>

            <div className="flex flex-col gap-2">
                <button
                    onClick={subscribeUser}
                    className="w-full bg-slate-900 hover:bg-black text-white font-semibold py-3 px-4 rounded-xl transition-all shadow-md active:scale-[0.98] text-sm"
                >
                    Habilitar ahora
                </button>
                <button
                    onClick={handleDismiss}
                    className="w-full bg-slate-50 hover:bg-slate-100 text-slate-600 font-medium py-2 px-4 rounded-xl transition-all text-xs"
                >
                    Quizás más tarde
                </button>
            </div>
        </div>
    );
}

