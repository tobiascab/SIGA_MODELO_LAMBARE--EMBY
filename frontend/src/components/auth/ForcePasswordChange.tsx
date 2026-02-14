"use client";

import { useState } from "react";
import { Lock, Shield, Eye, EyeOff, Loader2, CheckCircle2, ShieldAlert } from "lucide-react";
import axios from "axios";

interface ForcePasswordChangeProps {
    onSuccess: () => void;
}

export default function ForcePasswordChange({ onSuccess }: ForcePasswordChangeProps) {
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [showPass, setShowPass] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (password.length < 4) {
            setError("La contraseña debe tener al menos 4 caracteres");
            return;
        }

        if (password !== confirm) {
            setError("Las contraseñas no coinciden");
            return;
        }

        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            await axios.post("/api/auth/change-password",
                { password },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            // 1. Force refresh of user data from server to ensure state is synced
            const userRes = await axios.get("/api/auth/me", {
                headers: { Authorization: `Bearer ${token}` }
            });

            const freshUser = userRes.data;

            // 2. Persist fresh user (where requiresPasswordChange is now false)
            localStorage.setItem("user", JSON.stringify(freshUser));

            // 3. Notify parent (onSuccess will trigger setUser in layout)
            setSuccess(true);
            setTimeout(() => onSuccess(), 1000); // Call onSuccess directly to update state immediately
        } catch (err: any) {
            setError(err.response?.data?.error || "Error al cambiar la contraseña");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[9999] flex items-center justify-center p-3 sm:p-4">
            <div className="bg-white rounded-2xl sm:rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto">
                <div className="p-6 sm:p-10 text-center">
                    <div className="inline-flex p-5 bg-teal-50 rounded-3xl mb-6 relative">
                        <ShieldAlert className="h-10 w-10 text-teal-500 animate-pulse" />
                        <div className="absolute -top-1 -right-1 h-4 w-4 bg-teal-500 rounded-full border-4 border-white"></div>
                    </div>

                    <h2 className="text-2xl font-black text-slate-800 mb-2 tracking-tight">Seguridad Requerida</h2>
                    <p className="text-slate-500 text-sm font-medium leading-relaxed">
                        Por seguridad, debes cambiar tu contraseña predeterminada para continuar a tu panel de socio.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="px-6 pb-6 sm:px-10 sm:pb-10 space-y-5 sm:space-y-6">
                    {error && (
                        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-xs font-bold animate-in slide-in-from-top-2">
                            {error}
                        </div>
                    )}

                    {success ? (
                        <div className="flex flex-col items-center justify-center py-6 space-y-4 animate-in fade-in zoom-in">
                            <div className="h-16 w-16 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-500">
                                <CheckCircle2 className="h-10 w-10" />
                            </div>
                            <p className="text-teal-500 font-black uppercase tracking-widest text-xs">Acceso Autorizado</p>
                        </div>
                    ) : (
                        <>
                            <div className="space-y-4">
                                <div className="relative group">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Nueva Contraseña</label>
                                    <div className="relative">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within:text-teal-500 transition-colors" />
                                        <input
                                            type={showPass ? "text" : "password"}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full pl-12 pr-12 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:border-teal-500 focus:bg-white outline-none transition-all font-mono"
                                            placeholder="••••••••"
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPass(!showPass)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                        >
                                            {showPass ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                        </button>
                                    </div>
                                </div>

                                <div className="relative group">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Confirmar Nueva Contraseña</label>
                                    <div className="relative">
                                        <Shield className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within:text-teal-500 transition-colors" />
                                        <input
                                            type={showPass ? "text" : "password"}
                                            value={confirm}
                                            onChange={(e) => setConfirm(e.target.value)}
                                            className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:border-teal-500 focus:bg-white outline-none transition-all font-mono"
                                            placeholder="••••••••"
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-4 sm:py-5 bg-teal-500 text-white rounded-xl sm:rounded-[1.5rem] font-black uppercase tracking-[0.15em] sm:tracking-[0.2em] text-xs shadow-2xl shadow-teal-100 hover:bg-teal-600 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-3 disabled:opacity-50 touch-manipulation"
                            >
                                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Actualizar Contraseña"}
                            </button>
                        </>
                    )}
                </form>
            </div>
        </div>
    );
}
