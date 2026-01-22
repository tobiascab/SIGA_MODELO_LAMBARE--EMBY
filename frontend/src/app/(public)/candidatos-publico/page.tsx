"use client";

import { useState, useEffect } from "react";
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
    Sparkles,
    Eye,
    Share2
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

export default function CandidatosPage() {
    const [candidatos, setCandidatos] = useState<Candidato[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCandidate, setSelectedCandidate] = useState<Candidato | null>(null);

    useEffect(() => {
        cargarCandidatos();
    }, []);

    const cargarCandidatos = async () => {
        try {
            const res = await axios.get("/api/candidatos/publico");
            setCandidatos(res.data);
        } catch (error) {
            console.error("Error al cargar candidatos:", error);
            try {
                const token = localStorage.getItem("token");
                if (token) {
                    const res = await axios.get("/api/candidatos", {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    setCandidatos(res.data);
                }
            } catch (e) {
                console.error("Fallback also failed:", e);
            }
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="fixed inset-0 z-[300] bg-gradient-to-br from-slate-900 via-emerald-900 to-slate-900 flex flex-col items-center justify-center p-6">
                {/* Animated background orbs */}
                <div className="absolute inset-0 overflow-hidden">
                    <motion.div
                        animate={{
                            x: [0, 100, 0],
                            y: [0, -50, 0],
                            scale: [1, 1.2, 1]
                        }}
                        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute top-20 left-20 w-64 h-64 bg-emerald-500/20 rounded-full blur-3xl"
                    />
                    <motion.div
                        animate={{
                            x: [0, -80, 0],
                            y: [0, 60, 0],
                            scale: [1, 1.3, 1]
                        }}
                        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute bottom-20 right-20 w-80 h-80 bg-teal-500/15 rounded-full blur-3xl"
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
                    <p className="text-emerald-200/60 text-sm">
                        Asamblea General 2026
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-100 via-emerald-50 to-teal-100 overflow-hidden">
            {/* Animated background elements */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <motion.div
                    animate={{
                        x: [0, 50, 0],
                        y: [0, -30, 0],
                        scale: [1, 1.1, 1]
                    }}
                    transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute -top-20 -right-20 w-96 h-96 bg-gradient-to-br from-emerald-300/40 to-teal-300/30 rounded-full blur-3xl"
                />
                <motion.div
                    animate={{
                        x: [0, -40, 0],
                        y: [0, 40, 0],
                        scale: [1, 1.2, 1]
                    }}
                    transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute top-1/3 -left-32 w-80 h-80 bg-gradient-to-br from-teal-200/40 to-emerald-200/30 rounded-full blur-3xl"
                />
                <motion.div
                    animate={{
                        x: [0, 30, 0],
                        y: [0, -20, 0],
                        scale: [1, 1.15, 1]
                    }}
                    transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute bottom-40 right-1/4 w-60 h-60 bg-gradient-to-br from-blue-200/30 to-indigo-200/20 rounded-full blur-3xl"
                />
                <motion.div
                    animate={{
                        x: [0, -60, 0],
                        y: [0, 30, 0],
                    }}
                    transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute bottom-20 left-1/3 w-72 h-72 bg-gradient-to-br from-amber-200/25 to-orange-200/15 rounded-full blur-3xl"
                />
            </div>

            <div className="relative z-10">
                {/* Premium Hero Header */}
                <header className="relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-emerald-900 to-teal-900" />
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />

                    {/* Animated particles */}
                    <div className="absolute inset-0 overflow-hidden">
                        {[...Array(6)].map((_, i) => (
                            <motion.div
                                key={i}
                                animate={{
                                    y: [-20, -100],
                                    opacity: [0, 1, 0],
                                }}
                                transition={{
                                    duration: 3 + i,
                                    repeat: Infinity,
                                    delay: i * 0.5,
                                    ease: "easeOut"
                                }}
                                className="absolute bottom-0 w-2 h-2 bg-emerald-400/30 rounded-full"
                                style={{ left: `${15 + i * 15}%` }}
                            />
                        ))}
                    </div>

                    <div className="relative px-4 sm:px-6 lg:px-8 py-16 md:py-24">
                        <div className="max-w-5xl mx-auto text-center">
                            {/* Badge */}
                            <motion.div
                                initial={{ opacity: 0, y: -20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="inline-flex items-center gap-2 bg-emerald-500/20 backdrop-blur-sm border border-emerald-400/30 px-4 py-2 rounded-full mb-6"
                            >
                                <motion.div
                                    animate={{ rotate: [0, 360] }}
                                    transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                                >
                                    <Sparkles className="h-4 w-4 text-emerald-400" />
                                </motion.div>
                                <span className="text-emerald-300 text-xs md:text-sm font-semibold">
                                    Elecciones Asamblea 2026
                                </span>
                            </motion.div>

                            {/* Main Title */}
                            <motion.h1
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                                className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight"
                            >
                                Conoce a Nuestros{" "}
                                <motion.span
                                    className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-400 bg-[length:200%_auto]"
                                    animate={{ backgroundPosition: ["0%", "100%", "0%"] }}
                                    transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
                                >
                                    Candidatos
                                </motion.span>
                            </motion.h1>

                            {/* Subtitle */}
                            <motion.p
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="text-lg md:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed px-4"
                            >
                                Explora los perfiles de los socios que postulan para liderar
                                y velar por el futuro de nuestra cooperativa
                            </motion.p>

                            {/* Stats with pulse */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className="flex flex-wrap justify-center gap-4 md:gap-6 mt-10"
                            >
                                {Object.keys(ORGANO_INFO).map((key) => {
                                    const info = ORGANO_INFO[key];
                                    const count = candidatos.filter((c: Candidato) => c.organo === key).length;
                                    if (count === 0) return null;
                                    const IconComponent = info.icon;
                                    return (
                                        <motion.div
                                            key={key}
                                            whileHover={{ scale: 1.05 }}
                                            className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/20 shadow-xl"
                                        >
                                            <div className={`h-10 w-10 bg-gradient-to-br ${info.gradient} rounded-xl flex items-center justify-center shadow-lg`}>
                                                <IconComponent className="h-5 w-5 text-white" />
                                            </div>
                                            <div className="text-left">
                                                <span className="text-white font-bold text-lg">{count}</span>
                                                <span className="text-white/60 text-xs block">candidatos</span>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </motion.div>
                        </div>
                    </div>

                    {/* Bottom wave */}
                    <div className="absolute bottom-0 left-0 right-0">
                        <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
                            <path
                                d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 85C1200 90 1320 90 1380 90L1440 90V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z"
                                className="fill-slate-100/80"
                            />
                            <path
                                d="M0 120L60 115C120 110 240 100 360 95C480 90 600 90 720 92C840 94 960 98 1080 100C1200 102 1320 102 1380 102L1440 102V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z"
                                className="fill-emerald-50/60"
                            />
                        </svg>
                    </div>
                </header>

                {/* Main Content */}
                <main className="px-4 sm:px-6 lg:px-8 py-12 md:py-16">
                    <div className="max-w-7xl mx-auto space-y-20 md:space-y-28">
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
                                    className="space-y-10"
                                >
                                    {/* Section Header - Full Width */}
                                    <div className="relative">
                                        <motion.div
                                            initial={{ opacity: 0, x: -30 }}
                                            whileInView={{ opacity: 1, x: 0 }}
                                            viewport={{ once: true }}
                                            className={`
                                                inline-flex items-center gap-4 
                                                bg-white/80 backdrop-blur-xl 
                                                px-6 py-4 rounded-3xl 
                                                shadow-2xl ${info.shadow}
                                                border border-white/50
                                            `}
                                        >
                                            <motion.div
                                                className={`h-14 w-14 md:h-16 md:w-16 bg-gradient-to-br ${info.gradient} rounded-2xl flex items-center justify-center shadow-xl`}
                                                whileHover={{ rotate: [0, -10, 10, 0] }}
                                                transition={{ duration: 0.5 }}
                                            >
                                                <IconComponent className="h-7 w-7 md:h-8 md:w-8 text-white" />
                                            </motion.div>
                                            <div>
                                                <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-slate-800">{info.label}</h2>
                                                <p className={`text-sm ${info.text} font-semibold`}>
                                                    {titulares.length} titular{titulares.length !== 1 ? 'es' : ''} · {suplentes.length} suplente{suplentes.length !== 1 ? 's' : ''}
                                                </p>
                                            </div>
                                        </motion.div>
                                    </div>

                                    {/* Titulares Grid */}
                                    <div className="space-y-6">
                                        <div className="flex items-center gap-3 px-2">
                                            <motion.div
                                                animate={{ scale: [1, 1.2, 1] }}
                                                transition={{ duration: 2, repeat: Infinity }}
                                            >
                                                <Star className={`h-5 w-5 ${info.text}`} />
                                            </motion.div>
                                            <h3 className="text-sm font-bold text-slate-600 uppercase tracking-wider">
                                                Candidatos Titulares
                                            </h3>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                                            {titulares.map((can: Candidato, idx: number) => (
                                                <FloatingCard
                                                    key={can.id}
                                                    can={can}
                                                    idx={idx}
                                                    onClick={() => setSelectedCandidate(can)}
                                                    delay={idx * 0.3}
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
                                            className="bg-white/40 backdrop-blur-xl p-6 md:p-10 rounded-[2rem] border border-white/60 shadow-xl"
                                        >
                                            <div className="flex items-center gap-3 mb-6">
                                                <Users className="h-5 w-5 text-slate-500" />
                                                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">
                                                    Candidatos Suplentes
                                                </h3>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                                                {suplentes.map((can: Candidato, idx: number) => (
                                                    <FloatingCard
                                                        key={can.id}
                                                        can={can}
                                                        idx={idx}
                                                        isSmall
                                                        onClick={() => setSelectedCandidate(can)}
                                                        delay={idx * 0.2}
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

                {/* Footer */}
                <footer className="relative mt-16 py-12 text-center">
                    <div className="absolute inset-0 bg-gradient-to-t from-emerald-100/80 to-transparent" />
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="relative"
                    >
                        <div className="flex items-center justify-center gap-2 mb-3">
                            <Heart className="h-5 w-5 text-emerald-500 animate-pulse" />
                        </div>
                        <p className="text-slate-600 text-base font-medium">
                            Cooperativa Lambaré · Asamblea General Ordinaria 2026
                        </p>
                        <p className="text-slate-500 text-sm mt-2">
                            Tu voto construye el futuro
                        </p>
                    </motion.div>
                </footer>
            </div>

            {/* Detail Modal */}
            <AnimatePresence>
                {selectedCandidate && (
                    <CandidateModal
                        candidate={selectedCandidate}
                        onClose={() => setSelectedCandidate(null)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

// Floating Card Component with continuous animation
function FloatingCard({ can, idx, isSmall = false, onClick, delay = 0 }: {
    can: Candidato,
    idx: number,
    isSmall?: boolean,
    onClick: () => void,
    delay?: number
}) {
    const info = ORGANO_INFO[can.organo] || ORGANO_INFO["CONSEJO_ADMINISTRACION"];

    // Random float animation parameters
    const floatDuration = 4 + (idx % 3);
    const floatY = isSmall ? 5 : 8;

    return (
        <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: delay * 0.1, duration: 0.5, type: "spring" }}
            className="relative"
        >
            <motion.div
                animate={{
                    y: [-floatY, floatY, -floatY],
                }}
                transition={{
                    duration: floatDuration,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: delay * 0.2
                }}
                whileHover={{ scale: 1.03, y: 0 }}
                onClick={onClick}
                className={`
                    group relative bg-white/90 backdrop-blur-xl 
                    rounded-3xl overflow-hidden cursor-pointer
                    border border-white/60
                    shadow-2xl ${info.shadow}
                    hover:shadow-3xl transition-shadow duration-500
                    ${isSmall ? 'p-4' : 'p-6 md:p-8'}
                `}
            >
                {/* Animated gradient border effect */}
                <motion.div
                    className={`absolute inset-0 bg-gradient-to-br ${info.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500`}
                />

                <div className={`relative flex ${isSmall ? 'flex-row items-center gap-4' : 'flex-col items-center text-center'}`}>
                    {/* Photo with glow */}
                    <div className="relative flex-shrink-0">
                        <motion.div
                            className={`absolute inset-0 bg-gradient-to-br ${info.gradient} blur-xl opacity-30 scale-110`}
                            animate={{ opacity: [0.2, 0.4, 0.2] }}
                            transition={{ duration: 3, repeat: Infinity }}
                        />
                        <div className={`
                            relative overflow-hidden 
                            ${isSmall
                                ? 'h-16 w-16 md:h-20 md:w-20 rounded-2xl'
                                : 'h-32 w-32 sm:h-40 sm:w-40 md:h-44 md:w-44 rounded-3xl mb-4'
                            }
                            ring-4 ring-white shadow-2xl
                        `}>
                            {can.foto ? (
                                <img src={can.foto} alt={can.socio?.nombreCompleto} className="h-full w-full object-cover" />
                            ) : (
                                <div className="h-full w-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                                    <User className={`${isSmall ? 'h-8 w-8' : 'h-16 w-16'} text-slate-400`} />
                                </div>
                            )}
                        </div>

                        {/* Type Badge */}
                        {!isSmall && (
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.3, type: "spring" }}
                                className={`
                                    absolute -bottom-2 left-1/2 -translate-x-1/2
                                    bg-gradient-to-r ${info.gradient} 
                                    text-white text-xs font-bold uppercase tracking-wide
                                    px-4 py-1.5 rounded-full shadow-lg
                                `}
                            >
                                {can.tipo}
                            </motion.div>
                        )}
                    </div>

                    {/* Info */}
                    <div className={`${isSmall ? 'flex-1 min-w-0' : 'w-full mt-4'}`}>
                        <h3 className={`
                            font-bold text-slate-800 leading-tight
                            ${isSmall ? 'text-sm md:text-base truncate' : 'text-lg md:text-xl'}
                        `}>
                            {can.socio?.nombreCompleto}
                        </h3>

                        {isSmall && (
                            <span className={`text-xs font-semibold ${info.text} uppercase block mt-1`}>
                                {can.tipo}
                            </span>
                        )}
                    </div>

                    {/* Action Button - Always visible */}
                    <div className={`${isSmall ? 'flex-shrink-0' : 'w-full mt-6'}`}>
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className={`
                                inline-flex items-center justify-center gap-2
                                bg-gradient-to-r ${info.gradient}
                                text-white font-semibold
                                shadow-xl ${info.shadow}
                                ${isSmall
                                    ? 'h-10 w-10 rounded-xl'
                                    : 'w-full py-4 px-6 rounded-2xl text-sm'
                                }
                            `}
                            onClick={(e: React.MouseEvent) => {
                                e.stopPropagation();
                                onClick();
                            }}
                        >
                            {isSmall ? (
                                <Eye className="h-4 w-4" />
                            ) : (
                                <>
                                    <Eye className="h-5 w-5" />
                                    Ver Perfil Completo
                                </>
                            )}
                        </motion.button>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}

// Candidate Modal Component
function CandidateModal({ candidate, onClose }: { candidate: Candidato, onClose: () => void }) {
    const info = ORGANO_INFO[candidate.organo] || ORGANO_INFO["CONSEJO_ADMINISTRACION"];
    const IconComponent = info.icon;

    const handleShare = () => {
        const organoLabel = info.label;
        const fotoUrl = candidate.foto ? `\n📷 Ver foto: ${candidate.foto}\n` : "";
        const message = `🗳️ *ASAMBLEA GENERAL ORDINARIA 2026*
━━━━━━━━━━━━━━━━━━━
🏆 *CANDIDATO ${candidate.tipo}*

👤 *${candidate.socio?.nombreCompleto}*
🏛️ ${organoLabel}
${fotoUrl}
${candidate.biografia ? `📝 "${candidate.biografia}"` : ""}

✨ *¡Conoce a todos los candidatos!*
🔗 https://asamblea.cloud/candidatos-publico

━━━━━━━━━━━━━━━━━━━
*Cooperativa Lambaré - Tu voto cuenta*`;

        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
            onClick={onClose}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 50 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: 50 }}
                transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
                className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white rounded-[2rem] shadow-2xl"
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
            >
                {/* Header with gradient */}
                <div className={`relative bg-gradient-to-br ${info.gradient} p-8 md:p-10 text-center overflow-hidden`}>
                    {/* Animated background */}
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

                    {/* Close button */}
                    <motion.button
                        whileHover={{ scale: 1.1, rotate: 90 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={onClose}
                        className="absolute top-4 right-4 h-10 w-10 flex items-center justify-center bg-white/20 hover:bg-white/30 text-white rounded-full transition-colors backdrop-blur-sm"
                    >
                        <X className="h-5 w-5" />
                    </motion.button>

                    {/* Organ badge */}
                    <motion.div
                        initial={{ y: -20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.1 }}
                        className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full mb-6"
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
                        <div className="relative h-36 w-36 md:h-44 md:w-44 rounded-[2rem] overflow-hidden ring-4 ring-white/50 shadow-2xl mx-auto">
                            {candidate.foto ? (
                                <img src={candidate.foto} alt="" className="h-full w-full object-cover" />
                            ) : (
                                <div className="h-full w-full bg-white/20 flex items-center justify-center">
                                    <User className="h-16 w-16 text-white/60" />
                                </div>
                            )}
                        </div>

                        {/* Type badge */}
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.4, type: "spring" }}
                            className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-white text-slate-800 text-sm font-bold uppercase tracking-wide px-5 py-2 rounded-full shadow-xl"
                        >
                            {candidate.tipo}
                        </motion.div>
                    </motion.div>

                    {/* Name */}
                    <motion.h2
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="text-2xl md:text-3xl font-bold text-white mt-6"
                    >
                        {candidate.socio?.nombreCompleto}
                    </motion.h2>
                </div>

                {/* Content */}
                <div className="p-6 md:p-8 space-y-6">
                    {/* Biography */}
                    {candidate.biografia && (
                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.4 }}
                            className={`${info.lightBg} p-5 rounded-2xl border border-slate-100`}
                        >
                            <h3 className={`${info.text} text-sm font-semibold mb-3 flex items-center gap-2`}>
                                <Briefcase className="h-4 w-4" />
                                Biografía
                            </h3>
                            <p className="text-slate-700 text-base leading-relaxed">
                                "{candidate.biografia}"
                            </p>
                        </motion.div>
                    )}

                    {/* Action Buttons */}
                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className="flex flex-col sm:flex-row gap-3"
                    >
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={handleShare}
                            className="flex-1 inline-flex items-center justify-center gap-3 bg-gradient-to-r from-green-500 to-green-600 text-white py-4 px-6 rounded-2xl font-semibold text-sm shadow-xl shadow-green-500/25"
                        >
                            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                            </svg>
                            Compartir en WhatsApp
                        </motion.button>

                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={onClose}
                            className="flex-1 inline-flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 py-4 px-6 rounded-2xl font-semibold text-sm transition-colors"
                        >
                            <ArrowRight className="h-4 w-4 rotate-180" />
                            Volver
                        </motion.button>
                    </motion.div>
                </div>
            </motion.div>
        </motion.div>
    );
}
