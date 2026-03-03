"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import axios from "axios";

function ImpersonateBridge() {
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        const token = searchParams.get("token");
        const adminToken = searchParams.get("adminToken");

        if (!token) {
            router.push("/login");
            return;
        }

        const handleImpersonation = async () => {
            try {
                // Si venimos de Admin, guardamos el token original
                if (adminToken) {
                    localStorage.setItem("adminToken", adminToken);
                    const currentUser = localStorage.getItem("user");
                    if (currentUser) {
                        localStorage.setItem("adminUser", currentUser);
                    }
                }

                // Guardar el nuevo token
                localStorage.setItem("token", token);

                // Obtener datos del usuario impersonado para actualizar el storage
                const response = await axios.get("/api/auth/me", {
                    headers: { "Authorization": `Bearer ${token}` }
                });

                if (response.data) {
                    const userData = response.data;

                    // Si es impersonación, forzamos que no pida cambio de contraseña
                    // y marcamos que es una sesión de impersonación
                    if (adminToken) {
                        userData.requiresPasswordChange = false;
                        userData.isImpersonation = true;
                    }

                    localStorage.setItem("user", JSON.stringify(userData));
                    localStorage.setItem("session-start", Date.now().toString());

                    // Pequeña pausa para asegurar storage
                    setTimeout(() => {
                        window.location.href = "/dashboard";
                    }, 500);
                } else {
                    console.error("Error obteniendo datos del usuario");
                    router.push("/login");
                }
            } catch (error) {
                console.error("Error en el puente de impersonación:", error);
                router.push("/login");
            }
        };

        handleImpersonation();
    }, [searchParams, router]);

    return (
        <div className="flex h-screen w-full flex-col items-center justify-center bg-gradient-to-br from-teal-50 to-emerald-100">
            <div className="flex flex-col items-center gap-6 p-8 bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-2xl border border-white">
                <div className="relative">
                    <div className="absolute inset-0 bg-emerald-200 blur-2xl opacity-50 animate-pulse rounded-full" />
                    <Loader2 className="h-16 w-16 animate-spin text-emerald-600 relative z-10" />
                </div>
                <div className="text-center space-y-2">
                    <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Cambiando de Perfil</h2>
                    <p className="text-slate-500 font-medium">Iniciando sesión segura...</p>
                </div>
            </div>
        </div>
    );
}

export default function ImpersonatePage() {
    return (
        <Suspense fallback={<div>Cargando...</div>}>
            <ImpersonateBridge />
        </Suspense>
    );
}
