"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Lock, User, RefreshCcw, Eye, EyeOff, ChevronRight, Sparkles, Shield, Fingerprint } from "lucide-react";
import axios from "axios";
import {
    isBiometricAvailable,
    isBiometricEnabled,
    saveBiometricCredentials,
    authenticateWithBiometric,
} from "@/lib/biometric";

export default function LoginPage() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [focusedField, setFocusedField] = useState<string | null>(null);
    const router = useRouter();

    const [showChangePassword, setShowChangePassword] = useState(false);
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    // Cooperativa data (dynamic from admin)
    const [coopData, setCoopData] = useState({ nombre: '', nombreCorto: '', logo: '/logo.png', eslogan: '' });

    // Fetch cooperativa data on mount
    useEffect(() => {
        fetch('/api/cooperativa/publica')
            .then(r => r.ok ? r.json() : null)
            .then(data => { if (data) setCoopData(data); })
            .catch(() => { });
    }, []);

    // Biometric states
    const [biometricAvailable, setBiometricAvailable] = useState(false);
    const [biometricReady, setBiometricReady] = useState(false);
    const [showBiometricOffer, setShowBiometricOffer] = useState(false);
    const [biometricLoading, setBiometricLoading] = useState(false);
    const [pendingCredentials, setPendingCredentials] = useState<{ username: string; password: string } | null>(null);

    // Check biometric availability on mount (only on mobile/tablet)
    useEffect(() => {
        const checkBiometric = async () => {
            // Only offer biometric on mobile/tablet devices, not desktop
            const isMobileDevice = /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
                || ('ontouchstart' in window && window.innerWidth < 1024);
            if (!isMobileDevice) return;

            const available = await isBiometricAvailable();
            setBiometricAvailable(available);
            if (available && isBiometricEnabled()) {
                setBiometricReady(true);
            }
        };
        checkBiometric();
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const response = await axios.post("/api/auth/login", {
                username,
                password,
            });

            const userData = response.data;
            localStorage.setItem("token", userData.token);
            localStorage.setItem("user", JSON.stringify(userData));

            if (userData.requiresPasswordChange) {
                setShowChangePassword(true);
            } else if (biometricAvailable && !isBiometricEnabled()) {
                // Offer biometric setup after successful login
                setPendingCredentials({ username, password });
                setShowBiometricOffer(true);
            } else {
                // If biometric already enabled, update stored credentials silently
                if (biometricAvailable && isBiometricEnabled()) {
                    saveBiometricCredentials(username, password);
                }
                router.push("/dashboard");
            }
        } catch (err: any) {
            if (err.response?.status === 403 && err.response?.data?.error) {
                setError(err.response.data.error);
            } else {
                setError("Usuario o contraseña incorrectos");
            }
            localStorage.removeItem("token");
            localStorage.removeItem("user");
        } finally {
            setLoading(false);
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword.length < 4) {
            setError("La contraseña debe tener al menos 4 caracteres");
            return;
        }
        if (newPassword !== confirmPassword) {
            setError("Las contraseñas no coinciden");
            return;
        }

        setLoading(true);
        setError("");

        try {
            const token = localStorage.getItem("token");
            await axios.post("/api/auth/change-password",
                { password: newPassword },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            const userStr = localStorage.getItem("user");
            if (userStr) {
                const user = JSON.parse(userStr);
                user.requiresPasswordChange = false;
                localStorage.setItem("user", JSON.stringify(user));
            }

            router.push("/dashboard");
        } catch (err: any) {
            setError("Error al cambiar contraseña: " + (err.response?.data?.error || err.message));
        } finally {
            setLoading(false);
        }
    };

    // Handle biometric login
    const handleBiometricLogin = async () => {
        setBiometricLoading(true);
        setError("");
        try {
            const creds = await authenticateWithBiometric();
            if (creds) {
                // Use stored credentials to login
                const response = await axios.post("/api/auth/login", {
                    username: creds.username,
                    password: creds.password,
                });
                const userData = response.data;
                localStorage.setItem("token", userData.token);
                localStorage.setItem("user", JSON.stringify(userData));
                // Update stored credentials in case password changed
                saveBiometricCredentials(creds.username, creds.password);
                router.push("/dashboard");
            } else {
                setError("Verificación biométrica cancelada");
            }
        } catch (err: any) {
            setError("Error en acceso biométrico. Usá usuario y contraseña.");
        } finally {
            setBiometricLoading(false);
        }
    };

    // Handle biometric offer response
    const handleBiometricAccept = () => {
        if (pendingCredentials) {
            saveBiometricCredentials(pendingCredentials.username, pendingCredentials.password);
        }
        setShowBiometricOffer(false);
        router.push("/dashboard");
    };

    const handleBiometricDecline = () => {
        setShowBiometricOffer(false);
        router.push("/dashboard");
    };

    // ========================================================================
    // PANTALLA DE OFERTA BIOMÉTRICA (después de login exitoso)
    // ========================================================================
    if (showBiometricOffer) {
        return (
            <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-emerald-100 via-emerald-50 to-amber-50 px-3 py-4 sm:p-4 md:p-6">
                <main className="relative z-10 w-full max-w-md animate-fade-in">
                    <div className="overflow-hidden rounded-3xl bg-white/95 backdrop-blur-xl border border-white/50 shadow-2xl">
                        {/* Header */}
                        <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 p-6 text-center">
                            <div className="h-20 w-20 mx-auto bg-white/20 rounded-2xl flex items-center justify-center mb-4 backdrop-blur-sm">
                                <Fingerprint className="h-10 w-10 text-white" />
                            </div>
                            <h2 className="text-xl font-black text-white">Acceso Rápido</h2>
                            <p className="text-emerald-100 text-sm mt-1">¿Querés usar tu huella o Face ID para ingresar?</p>
                        </div>

                        {/* Content */}
                        <div className="p-6 space-y-4">
                            <div className="space-y-3">
                                <div className="flex items-center gap-3 text-sm text-slate-600">
                                    <div className="h-8 w-8 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                                        <Shield className="h-4 w-4 text-emerald-500" />
                                    </div>
                                    <span>Ingresá más rápido sin escribir contraseña</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-slate-600">
                                    <div className="h-8 w-8 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                                        <Fingerprint className="h-4 w-4 text-emerald-500" />
                                    </div>
                                    <span>Usa la huella dactilar o Face ID de tu dispositivo</span>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={handleBiometricDecline}
                                    className="flex-1 py-3 px-4 text-sm font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 active:scale-95 transition-all"
                                >
                                    Ahora no
                                </button>
                                <button
                                    onClick={handleBiometricAccept}
                                    className="flex-1 py-3 px-4 text-sm font-bold text-white bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl shadow-lg shadow-emerald-200 hover:shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2"
                                >
                                    <Fingerprint className="h-4 w-4" />
                                    Habilitar
                                </button>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    // ========================================================================
    // PANTALLA DE CAMBIO DE CONTRASEÑA
    // ========================================================================
    if (showChangePassword) {
        return (
            <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-emerald-100 via-emerald-50 to-amber-50 px-3 py-4 sm:p-4 md:p-6">
                <main className="relative z-10 w-full max-w-md animate-fade-in shadow-2xl">
                    <div className="overflow-hidden rounded-3xl bg-white/95 backdrop-blur-xl border border-white/50 p-8">
                        <div className="text-center mb-8">
                            <h1 className="text-2xl font-black text-slate-800 mb-2">Cambio Requerido</h1>
                            <p className="text-slate-500 font-medium text-sm">Por seguridad, debes cambiar tu contraseña inicial</p>
                        </div>

                        <form onSubmit={handleChangePassword} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Nueva Contraseña</label>
                                <input
                                    type="password"
                                    autoComplete="new-password"
                                    required
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full rounded-xl border-2 border-slate-100 bg-slate-50 py-3 px-4 font-bold text-slate-700 outline-none focus:border-emerald-500 transition-all"
                                    placeholder="Nueva contraseña"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Confirmar Contraseña</label>
                                <input
                                    type="password"
                                    autoComplete="new-password"
                                    required
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full rounded-xl border-2 border-slate-100 bg-slate-50 py-3 px-4 font-bold text-slate-700 outline-none focus:border-emerald-500 transition-all"
                                    placeholder="Confirmar contraseña"
                                />
                            </div>

                            {error && (
                                <div className="rounded-xl bg-red-50 p-4 text-xs font-bold text-red-600 border-2 border-red-100 animate-shake">
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 py-4 font-black text-white shadow-xl hover:shadow-2xl active:scale-[0.98] transition-all disabled:opacity-50"
                            >
                                {loading ? "ACTUALIZANDO..." : "CAMBIAR Y CONTINUAR"}
                            </button>
                        </form>
                    </div>
                </main>
            </div>
        );
    }

    // ========================================================================
    // PANTALLA DE LOGIN PRINCIPAL
    // ========================================================================
    return (
        <>
            {/* ============================================================ */}
            {/* VERSIÓN MÓVIL - DISEÑO COMPACTO CON FONDO CLARO (Solo visible en móvil) */}
            {/* ============================================================ */}
            <div className="md:hidden relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-gradient-to-br from-emerald-100 via-emerald-50 to-amber-50 p-4">
                {/* Formas decorativas de fondo */}
                <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
                    <div className="absolute -left-10 -top-10 h-[200px] w-[180px] rounded-[40%_60%_70%_30%/60%_30%_70%_40%] bg-gradient-to-br from-emerald-400/25 via-emerald-300/20 to-emerald-200/25 blur-2xl" />
                    <div className="absolute -right-10 -bottom-10 h-[180px] w-[180px] rounded-[60%_40%_30%_70%/40%_70%_30%_60%] bg-gradient-to-tr from-emerald-400/25 via-emerald-300/20 to-green-400/25 blur-2xl" />
                </div>

                {/* Main Container */}
                <main className="relative z-10 w-full max-w-sm animate-fade-in">

                    {/* Card con sombras elegantes */}
                    <div className="overflow-hidden rounded-3xl bg-white shadow-[0_20px_60px_-15px_rgba(16,185,129,0.3)] border border-emerald-100">

                        {/* Header Bordó + Gold */}
                        <div className="relative bg-gradient-to-br from-emerald-500 via-emerald-500 to-emerald-600 px-5 py-6">
                            <div className="absolute -top-10 -right-10 w-24 h-24 bg-amber-400/10 rounded-full blur-xl" />

                            <div className="relative z-10 flex flex-col items-center text-center gap-3">
                                {/* Logo */}
                                <div className="h-16 w-16 rounded-full bg-white flex items-center justify-center shadow-lg border-2 border-amber-400 overflow-hidden">
                                    <img
                                        src={coopData.logo || '/logo.png'}
                                        alt={coopData.nombreCorto || 'Logo'}
                                        className="w-full h-full object-cover bg-white"
                                        onError={(e) => { (e.target as HTMLImageElement).src = '/logo.png'; }}
                                    />
                                </div>

                                <div>
                                    <h1 className="text-2xl font-black text-white leading-tight tracking-tight">
                                        {coopData.nombreCorto || 'SIGA'}
                                    </h1>
                                    {coopData.nombre && coopData.nombreCorto && (
                                        <p className="text-xs text-white/70 font-medium mt-0.5 leading-tight">
                                            {coopData.nombre}
                                        </p>
                                    )}
                                    <div className="flex items-center justify-center gap-2 mt-1.5">
                                        <span className="text-sm font-black text-amber-300 tracking-widest">SIGA</span>
                                        <span className="text-[10px] text-amber-200 bg-white/15 px-1.5 py-0.5 rounded font-bold">{coopData.eslogan || 'Sistema de Asambleas'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Form Section Compacto con fondo claro */}
                        <div className="p-5 bg-white">
                            <form onSubmit={handleLogin} className="space-y-3">
                                {/* Username */}
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Usuario</label>
                                    <div className={`relative rounded-xl transition-all ${focusedField === 'username' ? 'ring-2 ring-emerald-400' : ''}`}>
                                        <div className="absolute left-3 top-1/2 -translate-y-1/2">
                                            <User className={`h-4 w-4 ${focusedField === 'username' ? 'text-emerald-500' : 'text-slate-400'}`} />
                                        </div>
                                        <input
                                            type="text"
                                            autoComplete="username"
                                            required
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value)}
                                            onFocus={() => setFocusedField('username')}
                                            onBlur={() => setFocusedField(null)}
                                            className="w-full rounded-xl border-2 border-slate-100 bg-slate-50 py-3 pl-10 pr-3 text-slate-700 text-sm outline-none focus:border-emerald-400 focus:bg-white transition-all font-medium placeholder:text-slate-400"
                                            placeholder="Cédula o usuario"
                                        />
                                    </div>
                                </div>

                                {/* Password */}
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Contraseña</label>
                                    <div className={`relative rounded-xl transition-all ${focusedField === 'password' ? 'ring-2 ring-emerald-400' : ''}`}>
                                        <div className="absolute left-3 top-1/2 -translate-y-1/2">
                                            <Lock className={`h-4 w-4 ${focusedField === 'password' ? 'text-emerald-500' : 'text-slate-400'}`} />
                                        </div>
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            autoComplete="current-password"
                                            required
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            onFocus={() => setFocusedField('password')}
                                            onBlur={() => setFocusedField(null)}
                                            className="w-full rounded-xl border-2 border-slate-100 bg-slate-50 py-3 pl-10 pr-10 text-slate-700 text-sm outline-none focus:border-emerald-400 focus:bg-white transition-all font-medium placeholder:text-slate-400"
                                            placeholder="Tu contraseña"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 active:text-emerald-500"
                                        >
                                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                </div>

                                {/* Error */}
                                {error && (
                                    <div className="rounded-xl bg-red-50 border-2 border-red-100 p-2.5 text-xs font-bold text-red-600 flex items-center gap-2">
                                        <div className="h-1.5 w-1.5 rounded-full bg-red-500" />
                                        {error}
                                    </div>
                                )}

                                {/* Submit */}
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 py-3.5 font-bold text-white shadow-lg shadow-emerald-200 active:scale-[0.98] transition-all disabled:opacity-50"
                                >
                                    <span className="flex items-center justify-center gap-2">
                                        {loading ? (
                                            <>
                                                <RefreshCcw className="h-4 w-4 animate-spin" />
                                                <span>INGRESANDO...</span>
                                            </>
                                        ) : (
                                            <>
                                                <span>INGRESAR</span>
                                                <ChevronRight className="h-4 w-4" />
                                            </>
                                        )}
                                    </span>
                                </button>
                            </form>

                            {/* Biometric Login Button - Mobile */}
                            {biometricReady && (
                                <button
                                    onClick={handleBiometricLogin}
                                    disabled={biometricLoading}
                                    className="w-full mt-3 rounded-xl bg-gradient-to-r from-slate-800 to-slate-900 py-3.5 font-bold text-white shadow-lg active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {biometricLoading ? (
                                        <>
                                            <RefreshCcw className="h-4 w-4 animate-spin" />
                                            <span>VERIFICANDO...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Fingerprint className="h-5 w-5" />
                                            <span>INGRESAR CON HUELLA / FACE ID</span>
                                        </>
                                    )}
                                </button>
                            )}

                            {/* Footer Minimalista */}
                            <p className="mt-4 text-center text-[9px] text-slate-400 font-medium">
                                © 2026 Avanzantec Group SRL
                            </p>
                        </div>
                    </div>
                </main>
            </div>

            {/* ============================================================ */}
            {/* VERSIÓN DESKTOP - DISEÑO ORIGINAL (Solo visible en PC) */}
            {/* ============================================================ */}
            <div className="hidden md:flex relative min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-emerald-100 via-emerald-50 to-amber-50 p-6">
                {/* Formas decorativas de fondo */}
                <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
                    <div className="absolute -left-20 -top-20 h-[500px] w-[400px] rounded-[40%_60%_70%_30%/60%_30%_70%_40%] bg-gradient-to-br from-emerald-400/30 via-emerald-400/20 to-emerald-300/30 blur-3xl animate-blob"></div>
                    <div className="absolute -right-20 -bottom-20 h-[450px] w-[450px] rounded-[60%_40%_30%_70%/40%_70%_30%_60%] bg-gradient-to-tr from-emerald-400/30 via-emerald-300/20 to-green-400/30 blur-3xl animate-blob animation-delay-2000"></div>
                    <div className="absolute left-1/2 top-1/2 h-[350px] w-[350px] -translate-x-1/2 -translate-y-1/2 rounded-[70%_30%_50%_50%/30%_60%_40%_70%] bg-gradient-to-bl from-amber-300/20 via-emerald-300/20 to-emerald-400/20 blur-3xl animate-blob animation-delay-4000"></div>
                </div>

                {/* Card principal */}
                <main className="relative z-10 w-full max-w-5xl animate-fade-in shadow-2xl">
                    <div className="overflow-hidden rounded-[3rem] bg-white/95 backdrop-blur-xl border border-white/50">
                        <div className="grid md:grid-cols-2">
                            {/* Panel izquierdo - Branding */}
                            <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500 via-emerald-500 to-emerald-600 p-12 flex flex-col justify-center items-center min-h-[600px]">
                                <div className="absolute -left-10 -top-10 h-[300px] w-[300px] rounded-[60%_40%_70%_30%/50%_60%_40%_50%] bg-amber-500/15 blur-2xl" aria-hidden="true"></div>
                                <div className="absolute -right-10 bottom-0 h-[250px] w-[250px] rounded-[40%_60%_30%_70%/60%_40%_70%_30%] bg-amber-400/15 blur-2xl" aria-hidden="true"></div>

                                <div className="relative z-10 text-center space-y-8">
                                    <div className="flex justify-center">
                                        <div className="h-40 w-40 rounded-full bg-white backdrop-blur-md flex items-center justify-center shadow-2xl border-4 border-amber-400 overflow-hidden relative ring-2 ring-amber-300/50">
                                            <img
                                                src={coopData.logo || '/logo.png'}
                                                alt={coopData.nombre || 'Logo'}
                                                className="w-full h-full object-cover bg-white"
                                                onError={(e) => { (e.target as HTMLImageElement).src = '/logo.png'; }}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <h2 className="text-5xl font-black text-white tracking-tight leading-tight">
                                            {coopData.nombreCorto || coopData.nombre || 'Cooperativa'}
                                        </h2>
                                        <div className="h-1 w-24 mx-auto bg-amber-400/70 rounded-full"></div>
                                    </div>

                                    <div className="space-y-2">
                                        <p className="text-amber-300 text-3xl font-black tracking-widest">
                                            SIGA
                                        </p>
                                        <p className="text-emerald-100 text-lg font-bold">
                                            {coopData.eslogan || 'Sistema de Asambleas'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Panel derecho - Formulario */}
                            <div className="flex flex-col">
                                <div className="p-12 flex-1 flex flex-col justify-center">
                                    <section className="space-y-8">
                                        <div className="text-left">
                                            <h3 className="text-3xl font-black text-slate-800 mb-1">Iniciar Sesión</h3>
                                            <p className="text-slate-500 font-medium">Ingresa tus credenciales para continuar</p>
                                        </div>

                                        <form onSubmit={handleLogin} className="space-y-6">
                                            <div className="space-y-2">
                                                <label htmlFor="username-desktop" className="text-xs font-black text-slate-400 uppercase tracking-widest">Usuario</label>
                                                <div className="relative group">
                                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors">
                                                        <User className="h-5 w-5" />
                                                    </div>
                                                    <input
                                                        id="username-desktop"
                                                        type="text"
                                                        autoComplete="username"
                                                        required
                                                        value={username}
                                                        onChange={(e) => setUsername(e.target.value)}
                                                        className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 py-4 pl-12 pr-4 text-slate-700 outline-none focus:border-emerald-500 focus:bg-white transition-all font-bold"
                                                        placeholder="Usuario del sistema"
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <label htmlFor="password-desktop" className="text-xs font-black text-slate-400 uppercase tracking-widest">Contraseña</label>
                                                <div className="relative group">
                                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors">
                                                        <Lock className="h-5 w-5" />
                                                    </div>
                                                    <input
                                                        id="password-desktop"
                                                        type={showPassword ? "text" : "password"}
                                                        autoComplete="current-password"
                                                        required
                                                        value={password}
                                                        onChange={(e) => setPassword(e.target.value)}
                                                        className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 py-4 pl-12 pr-12 text-slate-700 outline-none focus:border-emerald-500 focus:bg-white transition-all font-bold"
                                                        placeholder="Tu contraseña"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowPassword(!showPassword)}
                                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-500 transition-colors"
                                                    >
                                                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                                    </button>
                                                </div>
                                            </div>

                                            {error && (
                                                <div className="rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-600 border-2 border-red-100 animate-shake">
                                                    {error}
                                                </div>
                                            )}

                                            <button
                                                type="submit"
                                                disabled={loading}
                                                className="group w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 py-5 font-black text-white shadow-xl shadow-emerald-200 hover:shadow-2xl hover:shadow-emerald-300 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                                            >
                                                {loading ? (
                                                    <>
                                                        <RefreshCcw className="h-5 w-5 animate-spin" />
                                                        <span>INGRESANDO...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <span>INGRESAR AL SISTEMA</span>
                                                        <ChevronRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                                                    </>
                                                )}
                                            </button>

                                            {/* Biometric Login Button - Desktop */}
                                            {biometricReady && (
                                                <button
                                                    onClick={handleBiometricLogin}
                                                    disabled={biometricLoading}
                                                    className="group w-full rounded-2xl bg-gradient-to-r from-slate-800 to-slate-900 py-4 font-black text-white shadow-lg hover:shadow-xl active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                                                >
                                                    {biometricLoading ? (
                                                        <>
                                                            <RefreshCcw className="h-5 w-5 animate-spin" />
                                                            <span>VERIFICANDO...</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Fingerprint className="h-5 w-5" />
                                                            <span>INGRESAR CON HUELLA / FACE ID</span>
                                                        </>
                                                    )}
                                                </button>
                                            )}
                                        </form>

                                        <footer className="pt-4 border-t border-slate-100 flex flex-col items-center gap-1">
                                            <p className="text-center text-xs text-slate-600 font-bold uppercase tracking-widest">
                                                SIGA - Gestión Integral de Asambleas
                                            </p>
                                            <p className="text-center text-[10px] text-slate-400 font-semibold">
                                                © 2026 Avanzantec Group SRL
                                            </p>
                                        </footer>
                                    </section>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>

            <style jsx global>{`
                @keyframes blob {
                    0%, 100% { transform: translate(0, 0) scale(1); }
                    25% { transform: translate(20px, -20px) scale(1.1); }
                    50% { transform: translate(-20px, 20px) scale(0.9); }
                    75% { transform: translate(-10px, -10px) scale(1.05); }
                }
                
                @keyframes fade-in {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-10px); }
                    75% { transform: translateX(10px); }
                }
                
                @keyframes pulse-slow {
                    0%, 100% { opacity: 0.5; transform: scale(1); }
                    50% { opacity: 0.8; transform: scale(1.05); }
                }
                
                .animate-blob {
                    animation: blob 15s ease-in-out infinite;
                }
                
                .animation-delay-2000 {
                    animation-delay: 2s;
                }
                
                .animation-delay-4000 {
                    animation-delay: 4s;
                }
                
                .animate-fade-in {
                    animation: fade-in 0.8s ease-out forwards;
                }
                
                .animate-shake {
                    animation: shake 0.3s ease-in-out;
                }
                
                .animate-pulse-slow {
                    animation: pulse-slow 4s ease-in-out infinite;
                }
            `}</style>
        </>
    );
}
