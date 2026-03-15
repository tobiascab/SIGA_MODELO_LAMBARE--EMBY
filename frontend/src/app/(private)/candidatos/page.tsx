"use client";

import React, { useState, useEffect } from "react";
import {
    Award,
    Shield,
    Users,
    User,
    Briefcase,
    Crown,
    X,
    Star,
    Heart,
    ArrowRight,
    Share2,
    ThumbsUp,
    Sparkles,
    Eye,
    Bell,
    BellOff
} from "lucide-react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";

interface Candidato {
    id: number;
    socio: {
        nombreCompleto: string;
        cedula?: string;
    };
    organo: string;
    tipo: string;
    foto?: string;
    biografia?: string;
    orden: number;
    likes?: number;
}

const ORGANO_INFO: Record<string, { label: string, icon: React.ComponentType<{ className?: string }>, color: string, bg: string, text: string, gradient: string, lightBg: string, shadow: string }> = {
    "CONSEJO_ADMINISTRACION": {
        label: "Consejo de Administración",
        icon: Crown,
        color: "emerald",
        bg: "bg-emerald-500",
        text: "text-emerald-600",
        gradient: "from-emerald-500 to-teal-600",
        lightBg: "bg-emerald-50",
        shadow: "shadow-emerald-500/25"
    },
    "JUNTA_VIGILANCIA": {
        label: "Junta de Vigilancia",
        icon: Shield,
        color: "blue",
        bg: "bg-blue-500",
        text: "text-blue-600",
        gradient: "from-blue-500 to-indigo-600",
        lightBg: "bg-blue-50",
        shadow: "shadow-blue-500/25"
    },
    "JUNTA_ELECTORAL": {
        label: "Junta Electoral",
        icon: Users,
        color: "amber",
        bg: "bg-amber-500",
        text: "text-amber-600",
        gradient: "from-amber-500 to-orange-600",
        lightBg: "bg-amber-50",
        shadow: "shadow-amber-500/25"
    }
};

// Convierte "APELLIDO, NOMBRE" → "Nombre Apellido" (capitalizado)
function formatNombreNatural(nombreCompleto: string): string {
    const parts = nombreCompleto.split(",");
    if (parts.length < 2) return capitalize(nombreCompleto);
    const apellido = parts[0].trim();
    const nombre = parts[1].trim();
    return `${capitalize(nombre)} ${capitalize(apellido)}`;
}

function capitalize(text: string): string {
    return text
        .toLowerCase()
        .split(" ")
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
}

// Función para generar el texto persuasivo de compartir con biografía
function buildShareText(candidato: Candidato): string {
    const nombreRaw = candidato.socio?.nombreCompleto || "mi candidato";
    const nombre = formatNombreNatural(nombreRaw);
    const organoInfo = ORGANO_INFO[candidato.organo];
    const organoLabel = organoInfo ? organoInfo.label : "la cooperativa";
    const bio = candidato.biografia ? candidato.biografia.trim() : "";

    let texto = `🗳️✨ *¡Conocé a ${nombre}!*\n`;
    texto += `📋 Candidato/a para *${organoLabel}* — ${candidato.tipo === "TITULAR" ? "Titular" : "Suplente"}\n\n`;

    if (bio) {
        const primerNombre = nombre.split(" ")[0];
        texto += `📖 *Sobre ${primerNombre}:*\n`;
        texto += `"${bio}"\n\n`;
    }

    texto += `💚 ¡Te invito a apoyar a este/a gran candidato/a en las elecciones de nuestra Cooperativa Lambaré!\n`;
    texto += `👉 Conocé a todos los candidatos en: https://asamblea.cloud/candidatos\n\n`;
    texto += `🤝 *¡Tu voto cuenta! Compartí con otros socios.*`;


    return texto;
}

// Función para compartir con imagen (Web Share API) o fallback a WhatsApp
async function shareCandidate(candidato: Candidato) {
    const texto = buildShareText(candidato);

    // Intentar usar Web Share API con imagen
    if (candidato.foto && navigator.share) {
        try {
            // Descargar la imagen y convertirla a File para compartir
            const response = await fetch(candidato.foto);
            const blob = await response.blob();
            const fileName = `candidato_${candidato.socio?.nombreCompleto?.replace(/[^a-zA-Z0-9]/g, '_') || 'foto'}.jpg`;
            const file = new File([blob], fileName, { type: blob.type || 'image/jpeg' });

            // Verificar si se puede compartir con archivos
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    text: texto,
                    files: [file],
                });
                return; // Éxito con Web Share API
            }
        } catch (err: unknown) {
            // Si el usuario canceló, no hacer fallback
            if (err instanceof Error && err.name === 'AbortError') return;
            console.log("Web Share con imagen no disponible, usando fallback");
        }
    }

    // Fallback: intentar Web Share sin imagen
    if (navigator.share) {
        try {
            await navigator.share({
                text: texto,
            });
            return;
        } catch (err: unknown) {
            if (err instanceof Error && err.name === 'AbortError') return;
        }
    }

    // Fallback final: WhatsApp directo
    const url = `https://wa.me/?text=${encodeURIComponent(texto)}`;
    window.open(url, '_blank');
}

export default function CandidatosPage() {
    const [candidatos, setCandidatos] = useState<Candidato[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCandidate, setSelectedCandidate] = useState<Candidato | null>(null);
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);
    const [spotlightGlobalEnabled, setSpotlightGlobalEnabled] = useState(true);

    useEffect(() => {
        cargarCandidatos();
        const userData = localStorage.getItem("user");
        if (userData) {
            const user = JSON.parse(userData);
            setIsSuperAdmin(user.rol === "SUPER_ADMIN" || user.rol === "DIRECTIVO");
        }
    }, []);

    const cargarCandidatos = async () => {
        try {
            const token = localStorage.getItem("token");
            const res = await axios.get("/api/candidatos", {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCandidatos(res.data);

            // Cargar configuración global
            const configRes = await axios.get("/api/configuracion", {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (configRes.data && configRes.data["CANDIDATE_SPOTLIGHT_ENABLED"] === "false") {
                setSpotlightGlobalEnabled(false);
            } else {
                setSpotlightGlobalEnabled(true);
            }
        } catch (error) {
            console.error("Error al cargar datos:", error);
        } finally {
            setLoading(false);
        }
    };

    const toggleGlobalSpotlight = async () => {
        try {
            const token = localStorage.getItem("token");
            const newValue = !spotlightGlobalEnabled;

            await axios.post("/api/configuracion",
                { "CANDIDATE_SPOTLIGHT_ENABLED": newValue ? "true" : "false" },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setSpotlightGlobalEnabled(newValue);

            // Feedback visual (opcional)
            alert(newValue
                ? "Notificaciones de candidatos activadas globalmente"
                : "Notificaciones de candidatos desactivadas globalmente"
            );
        } catch (error) {
            console.error("Error al cambiar configuración:", error);
            alert("Error al guardar la configuración");
        }
    };

    if (loading) {
        return (
            <div className="fixed inset-0 z-[300] bg-gradient-to-br from-slate-900 via-emerald-900 to-slate-900 flex flex-col items-center justify-center p-6">
                <div className="absolute inset-0 overflow-hidden">
                    <motion.div
                        animate={{ x: [0, 100, 0], y: [0, -50, 0], scale: [1, 1.2, 1] }}
                        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute top-20 left-20 w-64 h-64 bg-emerald-500/20 rounded-full blur-3xl"
                    />
                </div>
                <div className="relative z-10">
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                        className="h-28 w-28 md:h-32 md:w-32 rounded-full border-4 border-emerald-500/20 border-t-emerald-400"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Award className="h-10 w-10 text-emerald-400 animate-pulse" />
                    </div>
                </div>
                <div className="mt-10 text-center space-y-3 relative z-10">
                    <motion.h2
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-2xl md:text-3xl font-bold text-white"
                    >
                        Cargando <span className="text-emerald-400">Candidatos</span>
                    </motion.h2>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-100 via-emerald-50 to-teal-100 overflow-hidden">
            {/* Animated background */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <motion.div
                    animate={{ x: [0, 50, 0], y: [0, -30, 0], scale: [1, 1.1, 1] }}
                    transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute -top-20 -right-20 w-96 h-96 bg-gradient-to-br from-emerald-300/40 to-teal-300/30 rounded-full blur-3xl"
                />
                <motion.div
                    animate={{ x: [0, -40, 0], y: [0, 40, 0], scale: [1, 1.2, 1] }}
                    transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute top-1/3 -left-32 w-80 h-80 bg-gradient-to-br from-teal-200/40 to-emerald-200/30 rounded-full blur-3xl"
                />
            </div>

            <div className="relative z-10">
                {/* Header */}
                <header className="relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-emerald-900 to-teal-900" />
                    <div className="relative px-4 sm:px-6 lg:px-8 py-12 md:py-20">
                        <div className="max-w-5xl mx-auto text-center">
                            <motion.div
                                initial={{ opacity: 0, y: -20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="inline-flex items-center gap-2 bg-emerald-500/20 backdrop-blur-sm border border-emerald-400/30 px-4 py-2 rounded-full mb-6"
                            >
                                <Sparkles className="h-4 w-4 text-emerald-400" />
                                <span className="text-emerald-300 text-xs md:text-sm font-semibold">
                                    Elecciones Asamblea 2026
                                </span>
                            </motion.div>
                            <motion.h1
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                                className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4"
                            >
                                Conoce a tus{" "}
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">
                                    Candidatos
                                </span>
                            </motion.h1>
                            <motion.p
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="text-base md:text-lg text-slate-300 max-w-2xl mx-auto"
                            >
                                Explora los perfiles, apoya a tus favoritos y comparte con otros socios
                            </motion.p>

                            {isSuperAdmin && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.3 }}
                                    className="mt-8 flex justify-center"
                                >
                                    <button
                                        onClick={toggleGlobalSpotlight}
                                        className={`
                                            flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm shadow-lg transition-all border
                                            ${spotlightGlobalEnabled
                                                ? 'bg-red-500/90 text-white hover:bg-red-600 border-red-400'
                                                : 'bg-emerald-500 text-white hover:bg-emerald-600 border-emerald-400'
                                            }
                                        `}
                                    >
                                        {spotlightGlobalEnabled ? (
                                            <>
                                                <BellOff className="h-4 w-4" />
                                                Desactivar Notificaciones Globales
                                            </>
                                        ) : (
                                            <>
                                                <Bell className="h-4 w-4" />
                                                Activar Notificaciones Globales
                                            </>
                                        )}
                                    </button>
                                </motion.div>
                            )}
                        </div>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0">
                        <svg viewBox="0 0 1440 80" fill="none" className="w-full h-auto">
                            <path d="M0 80L1440 80V40C1200 70 960 80 720 70C480 60 240 40 0 50V80Z" className="fill-slate-100/80" />
                        </svg>
                    </div>
                </header>

                {/* Main Content */}
                <main className="px-4 sm:px-6 lg:px-8 py-8 md:py-12">
                    <div className="max-w-7xl mx-auto space-y-16 md:space-y-24">
                        {Object.keys(ORGANO_INFO).map((key, sectionIdx) => {
                            const info = ORGANO_INFO[key];
                            const candidatosOrgano = candidatos.filter((c: Candidato) => c.organo === key);
                            if (candidatosOrgano.length === 0) return null;

                            const titulares = candidatosOrgano.filter((c: Candidato) => c.tipo === "TITULAR");
                            const suplentes = candidatosOrgano.filter((c: Candidato) => c.tipo === "SUPLENTE");
                            const IconComponent = info.icon;

                            return (
                                <motion.section
                                    key={key}
                                    initial={{ opacity: 0, y: 50 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true, margin: "-100px" }}
                                    transition={{ duration: 0.6, delay: sectionIdx * 0.1 }}
                                    className="space-y-8"
                                >
                                    {/* Section Header */}
                                    <motion.div
                                        initial={{ opacity: 0, x: -30 }}
                                        whileInView={{ opacity: 1, x: 0 }}
                                        viewport={{ once: true }}
                                        className={`inline-flex items-center gap-4 bg-white/80 backdrop-blur-xl px-6 py-4 rounded-3xl shadow-2xl ${info.shadow} border border-white/50`}
                                    >
                                        <div className={`h-14 w-14 md:h-16 md:w-16 bg-gradient-to-br ${info.gradient} rounded-2xl flex items-center justify-center shadow-xl`}>
                                            <IconComponent className="h-7 w-7 md:h-8 md:w-8 text-white" />
                                        </div>
                                        <div>
                                            <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-slate-800">{info.label}</h2>
                                            <p className={`text-sm ${info.text} font-semibold`}>
                                                {titulares.length} titular{titulares.length !== 1 ? 'es' : ''} · {suplentes.length} suplente{suplentes.length !== 1 ? 's' : ''}
                                            </p>
                                        </div>
                                    </motion.div>

                                    {/* Titulares Grid */}
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-3 px-2">
                                            <Star className={`h-5 w-5 ${info.text}`} />
                                            <h3 className="text-sm font-bold text-slate-600 uppercase tracking-wider">Candidatos Titulares</h3>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                            {titulares.map((can: Candidato, idx: number) => (
                                                <FloatingCard
                                                    key={can.id}
                                                    can={can}
                                                    idx={idx}
                                                    onClick={() => setSelectedCandidate(can)}
                                                    showLikesCount={isSuperAdmin}
                                                />
                                            ))}
                                        </div>
                                    </div>

                                    {/* Suplentes Grid */}
                                    {suplentes.length > 0 && (
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            whileInView={{ opacity: 1 }}
                                            viewport={{ once: true }}
                                            className="bg-white/40 backdrop-blur-xl p-6 md:p-8 rounded-[2rem] border border-white/60 shadow-xl"
                                        >
                                            <div className="flex items-center gap-3 mb-6">
                                                <Users className="h-5 w-5 text-slate-500" />
                                                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Candidatos Suplentes</h3>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                                {suplentes.map((can: Candidato, idx: number) => (
                                                    <FloatingCard
                                                        key={can.id}
                                                        can={can}
                                                        idx={idx}
                                                        isSmall
                                                        onClick={() => setSelectedCandidate(can)}
                                                        showLikesCount={isSuperAdmin}
                                                    />
                                                ))}
                                            </div>
                                        </motion.div>
                                    )}
                                </motion.section>
                            );
                        })}
                    </div>
                </main>
            </div>

            {/* Modal */}
            <AnimatePresence>
                {selectedCandidate && (
                    <CandidateModal
                        candidate={selectedCandidate}
                        onClose={() => setSelectedCandidate(null)}
                        isSuperAdmin={isSuperAdmin}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

// Floating Card Component
function FloatingCard({ can, idx, isSmall = false, onClick, showLikesCount = false }: {
    can: Candidato,
    idx: number,
    isSmall?: boolean,
    onClick: () => void,
    showLikesCount?: boolean
}) {
    const info = ORGANO_INFO[can.organo] || ORGANO_INFO["CONSEJO_ADMINISTRACION"];
    const [localLikes, setLocalLikes] = useState(can.likes || 0);
    const [isLiking, setIsLiking] = useState(false);
    const [hasLiked, setHasLiked] = useState(false);

    useEffect(() => {
        const likedIds = JSON.parse(localStorage.getItem("likedCandidatos") || "[]");
        setHasLiked(likedIds.includes(can.id));
    }, [can.id]);

    const handleLike = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (hasLiked || isLiking) return;

        setIsLiking(true);
        try {
            const token = localStorage.getItem("token");
            const res = await axios.post(`/api/candidatos/${can.id}/like`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setLocalLikes(res.data.likes);
            setHasLiked(true);
            const likedIds = JSON.parse(localStorage.getItem("likedCandidatos") || "[]");
            likedIds.push(can.id);
            localStorage.setItem("likedCandidatos", JSON.stringify(likedIds));
        } catch (err) {
            console.error("Error al dar like:", err);
        } finally {
            setIsLiking(false);
        }
    };

    const handleShare = (e: React.MouseEvent) => {
        e.stopPropagation();
        shareCandidate(can);
    };

    const floatDuration = 4 + (idx % 3);
    const floatY = isSmall ? 5 : 8;

    return (
        <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: idx * 0.05, duration: 0.5, type: "spring" }}
            className="relative"
        >
            <motion.div
                animate={{ y: [-floatY, floatY, -floatY] }}
                transition={{ duration: floatDuration, repeat: Infinity, ease: "easeInOut", delay: idx * 0.2 }}
                whileHover={{ scale: 1.02, y: 0 }}
                onClick={onClick}
                className={`
                    group relative bg-white/90 backdrop-blur-xl 
                    rounded-3xl overflow-hidden cursor-pointer
                    border border-white/60
                    shadow-2xl ${info.shadow}
                    hover:shadow-3xl transition-shadow duration-500
                    ${isSmall ? 'p-4' : 'p-6'}
                `}
            >
                <motion.div className={`absolute inset-0 bg-gradient-to-br ${info.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500`} />

                <div className={`relative flex ${isSmall ? 'flex-row items-center gap-4' : 'flex-col items-center text-center'}`}>
                    {/* Photo */}
                    <div className="relative flex-shrink-0">
                        <motion.div
                            className={`absolute inset-0 bg-gradient-to-br ${info.gradient} blur-xl opacity-30 scale-110`}
                            animate={{ opacity: [0.2, 0.4, 0.2] }}
                            transition={{ duration: 3, repeat: Infinity }}
                        />
                        <div className={`
                            relative overflow-hidden 
                            ${isSmall ? 'h-16 w-16 md:h-20 md:w-20 rounded-2xl' : 'h-32 w-32 sm:h-36 sm:w-36 rounded-3xl mb-4'}
                            ring-4 ring-white shadow-2xl
                        `}>
                            {can.foto ? (
                                <img src={can.foto} alt={can.socio?.nombreCompleto} className="h-full w-full object-cover" />
                            ) : (
                                <div className="h-full w-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                                    <User className={`${isSmall ? 'h-8 w-8' : 'h-12 w-12'} text-slate-400`} />
                                </div>
                            )}
                        </div>
                        {!isSmall && (
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.3, type: "spring" }}
                                className={`absolute -bottom-2 left-1/2 -translate-x-1/2 bg-gradient-to-r ${info.gradient} text-white text-xs font-bold uppercase tracking-wide px-4 py-1.5 rounded-full shadow-lg`}
                            >
                                {can.tipo}
                            </motion.div>
                        )}
                    </div>

                    {/* Info */}
                    <div className={`${isSmall ? 'flex-1 min-w-0' : 'w-full mt-4'}`}>
                        <h3 className={`font-bold text-slate-800 leading-tight ${isSmall ? 'text-sm md:text-base truncate' : 'text-lg'}`}>
                            {can.socio?.nombreCompleto}
                        </h3>
                        {isSmall && (
                            <span className={`text-xs font-semibold ${info.text} uppercase block mt-1`}>
                                {can.tipo}
                            </span>
                        )}

                        {/* Likes Counter for Admin */}
                        {showLikesCount && !isSmall && (
                            <div className="mt-2 flex items-center justify-center gap-2">
                                <Heart className={`h-4 w-4 ${hasLiked ? 'text-red-500 fill-red-500' : 'text-slate-300'}`} />
                                <span className="text-sm font-bold text-slate-600">{localLikes}</span>
                                <span className="text-xs text-slate-400">apoyos</span>
                            </div>
                        )}
                    </div>

                    {/* Action Buttons */}
                    {!isSmall && (
                        <div className="w-full mt-4 space-y-3">
                            <div className="flex gap-2">
                                <motion.button
                                    whileTap={{ scale: 0.95 }}
                                    onClick={handleLike}
                                    disabled={hasLiked || isLiking}
                                    className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 font-bold text-xs uppercase tracking-wide transition-all ${hasLiked
                                        ? 'bg-red-50 text-red-500 border-2 border-red-200'
                                        : 'bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-500 border-2 border-slate-200 hover:border-red-200'
                                        }`}
                                >
                                    <Heart className={`h-4 w-4 ${hasLiked ? 'fill-red-500' : ''}`} />
                                    {hasLiked ? '¡Apoyado!' : 'Apoyar'}
                                </motion.button>
                                <motion.button
                                    whileTap={{ scale: 0.95 }}
                                    onClick={handleShare}
                                    className="flex-1 py-3 rounded-xl flex items-center justify-center gap-2 font-bold text-xs uppercase tracking-wide bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg"
                                >
                                    <Share2 className="h-4 w-4" />
                                    Compartir
                                </motion.button>
                            </div>
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className={`w-full py-3 px-4 rounded-xl bg-gradient-to-r ${info.gradient} text-white font-semibold text-sm shadow-xl ${info.shadow} flex items-center justify-center gap-2`}
                                onClick={(e: React.MouseEvent) => {
                                    e.stopPropagation();
                                    onClick();
                                }}
                            >
                                <Eye className="h-4 w-4" />
                                Ver Perfil
                            </motion.button>
                        </div>
                    )}

                    {isSmall && (
                        <motion.button
                            whileTap={{ scale: 0.95 }}
                            className={`h-10 w-10 rounded-xl bg-gradient-to-r ${info.gradient} text-white shadow-lg flex items-center justify-center flex-shrink-0`}
                            onClick={(e: React.MouseEvent) => {
                                e.stopPropagation();
                                onClick();
                            }}
                        >
                            <Eye className="h-4 w-4" />
                        </motion.button>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
}

// Modal Component - Fully Responsive
function CandidateModal({ candidate, onClose, isSuperAdmin }: { candidate: Candidato, onClose: () => void, isSuperAdmin: boolean }) {
    const info = ORGANO_INFO[candidate.organo] || ORGANO_INFO["CONSEJO_ADMINISTRACION"];
    const IconComponent = info.icon;
    const [localLikes, setLocalLikes] = useState(candidate.likes || 0);
    const [hasLiked, setHasLiked] = useState(false);
    const [isLiking, setIsLiking] = useState(false);

    useEffect(() => {
        const likedIds = JSON.parse(localStorage.getItem("likedCandidatos") || "[]");
        setHasLiked(likedIds.includes(candidate.id));
    }, [candidate.id]);

    const handleLike = async () => {
        if (hasLiked || isLiking) return;
        setIsLiking(true);
        try {
            const token = localStorage.getItem("token");
            const res = await axios.post(`/api/candidatos/${candidate.id}/like`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setLocalLikes(res.data.likes);
            setHasLiked(true);
            const likedIds = JSON.parse(localStorage.getItem("likedCandidatos") || "[]");
            likedIds.push(candidate.id);
            localStorage.setItem("likedCandidatos", JSON.stringify(likedIds));
        } catch (err) {
            console.error("Error al dar like:", err);
        } finally {
            setIsLiking(false);
        }
    };

    const handleShare = () => {
        shareCandidate(candidate);
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md overflow-y-auto"
            onClick={onClose}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 30 }}
                transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
                className="relative w-full max-w-lg my-auto bg-white rounded-[2rem] shadow-2xl overflow-hidden"
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
            >
                {/* Header */}
                <div className={`relative bg-gradient-to-br ${info.gradient} p-6 md:p-8 text-center overflow-hidden`}>
                    <motion.div
                        className="absolute inset-0 opacity-30"
                        animate={{
                            background: [
                                "radial-gradient(circle at 0% 0%, white 0%, transparent 50%)",
                                "radial-gradient(circle at 100% 100%, white 0%, transparent 50%)",
                                "radial-gradient(circle at 0% 0%, white 0%, transparent 50%)",
                            ]
                        }}
                        transition={{ duration: 5, repeat: Infinity }}
                    />

                    <motion.button
                        whileHover={{ scale: 1.1, rotate: 90 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={onClose}
                        className="absolute top-4 right-4 h-10 w-10 flex items-center justify-center bg-white/20 hover:bg-white/30 text-white rounded-full transition-colors backdrop-blur-sm"
                    >
                        <X className="h-5 w-5" />
                    </motion.button>

                    <motion.div
                        initial={{ y: -20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.1 }}
                        className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full mb-4"
                    >
                        <IconComponent className="h-4 w-4 text-white" />
                        <span className="text-white/90 text-sm font-medium">{info.label}</span>
                    </motion.div>

                    {/* Photo */}
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.2, type: "spring" }}
                        className="relative inline-block mb-4"
                    >
                        <motion.div
                            className="absolute inset-0 bg-white blur-2xl opacity-40 scale-125"
                            animate={{ opacity: [0.3, 0.5, 0.3] }}
                            transition={{ duration: 3, repeat: Infinity }}
                        />
                        <div className="relative h-28 w-28 sm:h-36 sm:w-36 md:h-40 md:w-40 rounded-[2rem] overflow-hidden ring-4 ring-white/50 shadow-2xl mx-auto">
                            {candidate.foto ? (
                                <img src={candidate.foto} alt="" className="h-full w-full object-cover" />
                            ) : (
                                <div className="h-full w-full bg-white/20 flex items-center justify-center">
                                    <User className="h-12 w-12 md:h-16 md:w-16 text-white/60" />
                                </div>
                            )}
                        </div>
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.4, type: "spring" }}
                            className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-white text-slate-800 text-xs font-bold uppercase tracking-wide px-4 py-2 rounded-full shadow-xl"
                        >
                            {candidate.tipo}
                        </motion.div>
                    </motion.div>

                    <motion.h2
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="text-xl sm:text-2xl md:text-3xl font-bold text-white mt-4"
                    >
                        {candidate.socio?.nombreCompleto}
                    </motion.h2>
                </div>

                {/* Content */}
                <div className="p-5 md:p-6 space-y-4">
                    {/* Likes Counter for Admin */}
                    {isSuperAdmin && (
                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.35 }}
                            className="flex items-center justify-center gap-3 py-3 bg-slate-50 rounded-2xl"
                        >
                            <Heart className={`h-5 w-5 ${hasLiked ? 'text-red-500 fill-red-500' : 'text-slate-400'}`} />
                            <span className="text-lg font-bold text-slate-700">{localLikes}</span>
                            <span className="text-sm text-slate-500">apoyos totales</span>
                        </motion.div>
                    )}

                    {/* Biography */}
                    {candidate.biografia && (
                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.4 }}
                            className={`${info.lightBg} p-4 rounded-2xl border border-slate-100`}
                        >
                            <h3 className={`${info.text} text-sm font-semibold mb-2 flex items-center gap-2`}>
                                <Briefcase className="h-4 w-4" />
                                Biografía
                            </h3>
                            <p className="text-slate-700 text-sm leading-relaxed">
                                "{candidate.biografia}"
                            </p>
                        </motion.div>
                    )}

                    {/* Action Buttons */}
                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className="grid grid-cols-2 gap-3"
                    >
                        <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={handleLike}
                            disabled={hasLiked || isLiking}
                            className={`py-3 px-4 rounded-xl flex items-center justify-center gap-2 font-semibold text-sm transition-all ${hasLiked
                                ? 'bg-red-50 text-red-500 border-2 border-red-200'
                                : 'bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-500 border-2 border-slate-200 hover:border-red-200'
                                }`}
                        >
                            <Heart className={`h-5 w-5 ${hasLiked ? 'fill-red-500' : ''}`} />
                            {hasLiked ? '¡Apoyado!' : 'Apoyar'}
                        </motion.button>

                        <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={handleShare}
                            className="py-3 px-4 rounded-xl bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg"
                        >
                            <Share2 className="h-5 w-5" />
                            Compartir
                        </motion.button>
                    </motion.div>

                    <motion.button
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.55 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={onClose}
                        className="w-full py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
                    >
                        <ArrowRight className="h-4 w-4 rotate-180" />
                        Volver a la Lista
                    </motion.button>
                </div>
            </motion.div>
        </motion.div>
    );
}
