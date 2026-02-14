'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { CreditCard, User, ArrowRight, CheckCircle, Sparkles, FileText, ChevronRight, Check } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8585';

export default function MemoriaBalanceLogin() {
    const [step, setStep] = useState(1);
    const [cedula, setCedula] = useState('');
    const [numeroSocio, setNumeroSocio] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [userData, setUserData] = useState<{ nombreCompleto: string; sucursal: string } | null>(null);
    const [cedulaValid, setCedulaValid] = useState(false);

    const router = useRouter();

    // Validación en tiempo real de cédula
    useEffect(() => {
        setCedulaValid(cedula.length >= 6);
    }, [cedula]);

    const validateCedula = () => {
        if (cedula.length < 6) {
            setError('La cédula debe tener al menos 6 dígitos');
            return false;
        }
        setError('');
        return true;
    };

    const handleCedulaSubmit = () => {
        if (validateCedula()) {
            setStep(2);
        }
    };

    const handleLogin = async () => {
        if (!numeroSocio) {
            setError('Ingrese su número de socio');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await axios.post(`${API_URL}/api/memoria-balance/login`, {
                numeroSocio: numeroSocio,
                cedula: cedula
            });

            if (response.data && response.data.token) {
                localStorage.setItem('memoria_token', response.data.token);
                localStorage.setItem('memoria_socio', JSON.stringify({
                    numeroSocio: response.data.numeroSocio,
                    nombreCompleto: response.data.nombreCompleto,
                    sucursal: response.data.sucursal
                }));

                setUserData({
                    nombreCompleto: response.data.nombreCompleto,
                    sucursal: response.data.sucursal
                });

                setStep(3);
            }
        } catch (err: any) {
            console.error('Error en login:', err);
            if (err.response?.status === 401) {
                setError('❌ No encontramos tus datos en nuestro padrón. Verifica que tu número de socio y cédula sean correctos. Si el problema persiste, contacta al soporte.');
            } else if (err.response?.status === 404) {
                setError('❌ El número de socio o cédula ingresado no se encuentra registrado en el sistema. Verifica los datos o contacta al soporte.');
            } else if (err.code === 'ERR_NETWORK') {
                setError('⚠️ No pudimos conectar con el servidor. Verifica tu conexión a internet e intenta nuevamente.');
            } else {
                setError('⚠️ Ocurrió un error inesperado. Por favor, intenta nuevamente en unos momentos o contacta al soporte si el problema persiste.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleEnterVisor = () => {
        router.push('/memoria-y-balance/visor');
    };

    const containerVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
        exit: { opacity: 0, y: -20, transition: { duration: 0.3 } }
    };

    const floatAnimation = {
        y: [0, -10, 0],
        transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' }
    };

    const pulseAnimation = {
        scale: [1, 1.05, 1],
        transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden bg-emerald-50">
            {/* Imagen de fondo con blur */}
            <div
                className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat transition-all duration-1000"
                style={{
                    backgroundImage: 'url("/memoria-balance-bg.jpg")',
                    filter: 'blur(12px) brightness(0.85)',
                    transform: 'scale(1.1)'
                }}
            />
            {/* Overlay mejorado */}
            <div className="absolute inset-0 z-1 bg-gradient-to-b from-white/50 via-white/40 to-emerald-50/60 backdrop-blur-sm" />

            {/* Elementos decorativos */}
            <motion.div
                className="absolute top-20 left-10 w-20 h-20 bg-emerald-200/30 rounded-full blur-xl z-10"
                animate={{ x: [0, 20, 0], y: [0, -10, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
                className="absolute bottom-20 right-10 w-32 h-32 bg-emerald-300/20 rounded-full blur-2xl z-10"
                animate={{ x: [0, -15, 0], y: [0, 15, 0] }}
                transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
            />

            <AnimatePresence mode="wait">
                <div key="content-wrapper" className="relative z-20 w-full flex flex-col items-center">
                    {/* Stepper Visual Mejorado */}
                    {step < 3 && (
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="w-full max-w-md mb-4 md:mb-6"
                        >
                            <div className="flex items-center justify-center gap-2 md:gap-3">
                                {[1, 2].map((stepNum) => (
                                    <div key={stepNum} className="flex items-center">
                                        <div className={`
                                            w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center font-bold text-xs md:text-sm transition-all duration-300
                                            ${step >= stepNum
                                                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200'
                                                : 'bg-white/80 text-gray-400 border-2 border-emerald-100'}
                                        `}>
                                            {step > stepNum ? <Check className="w-4 h-4 md:w-5 md:h-5" /> : stepNum}
                                        </div>
                                        {stepNum < 2 && (
                                            <div className={`
                                                w-12 md:w-16 h-1 mx-1 md:mx-2 rounded-full transition-all duration-300
                                                ${step > stepNum ? 'bg-emerald-500' : 'bg-emerald-100'}
                                            `} />
                                        )}
                                    </div>
                                ))}
                            </div>
                            <p className="text-center mt-2 md:mt-3 text-xs md:text-sm font-medium text-emerald-700">
                                Paso {step} de 2
                            </p>
                        </motion.div>
                    )}

                    {/* PASO 1: Pedir Cédula */}
                    {step === 1 && (
                        <motion.div
                            key="step1"
                            variants={containerVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            className="w-full max-w-md"
                        >
                            {/* Header con logo animado */}
                            <motion.div
                                className="text-center mb-4 md:mb-8"
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ delay: 0.2, duration: 0.5 }}
                            >
                                <motion.div
                                    animate={{ ...floatAnimation, ...pulseAnimation }}
                                    className="w-20 h-20 md:w-32 md:h-32 mx-auto bg-white rounded-2xl md:rounded-3xl flex items-center justify-center shadow-xl md:shadow-2xl shadow-emerald-300/50 mb-3 md:mb-6 p-2 md:p-3 border border-emerald-100 md:border-2"
                                >
                                    <img src="/cooperativa-logo.png" alt="Logo Cooperativa" className="w-full h-full object-contain" />
                                </motion.div>

                                <h1 className="text-2xl md:text-4xl lg:text-5xl font-black text-emerald-900 mb-2 md:mb-3 tracking-tight px-4">
                                    Memoria y Balance
                                </h1>
                                <div className="inline-block px-3 py-1.5 md:px-4 md:py-2 bg-emerald-500 rounded-full">
                                    <p className="text-white font-bold text-xs md:text-sm">
                                        Ejercicio 2025
                                    </p>
                                </div>
                            </motion.div>

                            {/* Tarjeta del formulario mejorada */}
                            <motion.div
                                className="bg-white/90 backdrop-blur-xl rounded-2xl md:rounded-3xl shadow-2xl shadow-emerald-200/50 p-5 md:p-8 border border-emerald-100 md:border-2 md:border-emerald-100/50"
                                initial={{ y: 30, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.3, duration: 0.5 }}
                            >
                                <div className="text-center mb-5 md:mb-8">
                                    <h2 className="text-xl md:text-2xl font-black text-gray-900 mb-2 md:mb-3">
                                        ¡Hola! 👋
                                    </h2>
                                    <p className="text-sm md:text-base text-gray-600 leading-relaxed px-2">
                                        Para comenzar, indícanos tu <span className="font-bold text-emerald-600">cédula de identidad</span>
                                    </p>
                                </div>

                                <div className="space-y-4 md:space-y-5">
                                    <div>
                                        <label className="block text-xs md:text-sm font-bold text-gray-700 mb-2 md:mb-3">
                                            Cédula de Identidad
                                        </label>
                                        <div className="relative">
                                            <CreditCard className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-emerald-400 z-10" />
                                            <input
                                                type="text"
                                                value={cedula}
                                                onChange={(e) => setCedula(e.target.value.replace(/\D/g, ''))}
                                                onKeyDown={(e) => e.key === 'Enter' && handleCedulaSubmit()}
                                                placeholder="Ej: 1234567"
                                                className={`
                                                    w-full pl-10 md:pl-12 pr-12 md:pr-14 py-3 md:py-4 border-2 rounded-xl md:rounded-2xl 
                                                    focus:ring-4 focus:ring-emerald-100 transition-all text-base md:text-lg font-medium text-gray-800 placeholder-gray-300
                                                    ${cedulaValid
                                                        ? 'border-emerald-400 bg-emerald-50/50'
                                                        : 'border-emerald-100 bg-white focus:border-emerald-400'}
                                                `}
                                                autoFocus
                                            />
                                            {/* Indicador de validación */}
                                            <AnimatePresence>
                                                {cedulaValid && (
                                                    <motion.div
                                                        initial={{ scale: 0, rotate: -180 }}
                                                        animate={{ scale: 1, rotate: 0 }}
                                                        exit={{ scale: 0, rotate: 180 }}
                                                        className="absolute right-3 md:right-4 top-1/2 -translate-y-1/2"
                                                    >
                                                        <div className="w-7 h-7 md:w-8 md:h-8 bg-emerald-500 rounded-full flex items-center justify-center">
                                                            <Check className="w-4 h-4 md:w-5 md:h-5 text-white" />
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    </div>

                                    {error && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="bg-red-50 border-2 border-red-200 rounded-xl md:rounded-2xl p-3 md:p-4"
                                        >
                                            <p className="text-red-600 text-xs md:text-sm font-medium text-center leading-relaxed">
                                                {error}
                                            </p>
                                        </motion.div>
                                    )}

                                    <motion.button
                                        onClick={handleCedulaSubmit}
                                        disabled={!cedulaValid}
                                        className="w-full py-3 md:py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 disabled:from-gray-300 disabled:to-gray-400 text-white font-bold rounded-xl md:rounded-2xl shadow-lg shadow-emerald-200 flex items-center justify-center gap-2 md:gap-3 transition-all disabled:cursor-not-allowed text-base md:text-lg"
                                        whileHover={{ scale: cedulaValid ? 1.02 : 1 }}
                                        whileTap={{ scale: cedulaValid ? 0.98 : 1 }}
                                    >
                                        <span>Continuar</span>
                                        <ArrowRight className="w-4 h-4 md:w-5 md:h-5" />
                                    </motion.button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}

                    {/* PASO 2: Pedir Número de Socio */}
                    {step === 2 && (
                        <motion.div
                            key="step2"
                            variants={containerVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            className="w-full max-w-md"
                        >
                            {/* Header */}
                            <motion.div
                                className="text-center mb-4 md:mb-8"
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ delay: 0.2, duration: 0.5 }}
                            >
                                <motion.div
                                    animate={floatAnimation}
                                    className="w-20 h-20 md:w-24 md:h-24 mx-auto bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-2xl md:rounded-3xl flex items-center justify-center shadow-xl md:shadow-2xl shadow-emerald-300/50 mb-3 md:mb-6"
                                >
                                    <User className="w-10 h-10 md:w-12 md:h-12 text-white" />
                                </motion.div>

                                <h1 className="text-2xl md:text-3xl lg:text-4xl font-black text-emerald-900 mb-2 md:mb-3 px-4">
                                    ¡Muy bien!
                                </h1>
                                <p className="text-emerald-600 font-medium text-sm md:text-base lg:text-lg px-4">
                                    Solo un paso más...
                                </p>
                            </motion.div>

                            {/* Tarjeta del formulario */}
                            <motion.div
                                className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl shadow-emerald-200/50 p-8 border-2 border-emerald-100/50"
                                initial={{ y: 30, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.3, duration: 0.5 }}
                            >
                                <div className="text-center mb-6">
                                    <h2 className="text-2xl font-black text-gray-900 mb-3">
                                        Ahora tu número de socio 🎯
                                    </h2>
                                    <p className="text-gray-600">
                                        Ingresa tu <span className="font-bold text-emerald-600">número de socio</span> para verificar tu identidad
                                    </p>
                                </div>

                                {/* Tarjeta de cédula confirmada - MEJORADA */}
                                <motion.div
                                    initial={{ scale: 0.9, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ delay: 0.5, type: 'spring' }}
                                    className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-2xl p-5 mb-6 border-2 border-emerald-200 shadow-lg shadow-emerald-100"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg">
                                            <CheckCircle className="w-7 h-7 text-white" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-1">Cédula Ingresada</p>
                                            <p className="text-2xl font-black text-emerald-900">{cedula}</p>
                                        </div>
                                    </div>
                                </motion.div>

                                <div className="space-y-5">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-3">
                                            Número de Socio
                                        </label>
                                        <div className="relative">
                                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-400 z-10" />
                                            <input
                                                type="text"
                                                value={numeroSocio}
                                                onChange={(e) => setNumeroSocio(e.target.value.replace(/\D/g, ''))}
                                                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                                                placeholder="Ej: 56015"
                                                className="w-full pl-12 pr-4 py-4 border-2 border-emerald-100 rounded-2xl focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 transition-all text-lg font-medium text-gray-800 placeholder-gray-300 bg-white"
                                                autoFocus
                                            />
                                        </div>
                                    </div>

                                    {error && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="bg-red-50 border-2 border-red-200 rounded-2xl p-4"
                                        >
                                            <p className="text-red-600 text-sm font-medium text-center">
                                                {error}
                                            </p>
                                        </motion.div>
                                    )}

                                    <motion.button
                                        onClick={handleLogin}
                                        disabled={loading}
                                        className="w-full py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-bold rounded-2xl shadow-lg shadow-emerald-200 flex items-center justify-center gap-3 transition-all disabled:opacity-50"
                                        whileHover={{ scale: loading ? 1 : 1.02 }}
                                        whileTap={{ scale: loading ? 1 : 0.98 }}
                                    >
                                        {loading ? (
                                            <>
                                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                <span>Verificando...</span>
                                            </>
                                        ) : (
                                            <>
                                                <span className="text-lg">Ingresar</span>
                                                <ArrowRight className="w-5 h-5" />
                                            </>
                                        )}
                                    </motion.button>

                                    <button
                                        onClick={() => { setStep(1); setError(''); setNumeroSocio(''); }}
                                        className="w-full py-3 text-emerald-600 font-medium hover:text-emerald-800 transition-colors hover:bg-emerald-50 rounded-xl"
                                    >
                                        ← Volver a ingresar cédula
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}

                    {/* PASO 3: Bienvenida */}
                    {step === 3 && userData && (
                        <motion.div
                            key="step3"
                            variants={containerVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            className="w-full max-w-md text-center"
                        >
                            {/* Confetti animado */}
                            <motion.div
                                className="absolute inset-0 pointer-events-none"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                            >
                                {[...Array(6)].map((_, i) => (
                                    <motion.div
                                        key={i}
                                        className="absolute w-3 h-3 text-emerald-400"
                                        style={{
                                            left: `${15 + i * 15}%`,
                                            top: '10%'
                                        }}
                                        initial={{ y: 0, opacity: 0, scale: 0 }}
                                        animate={{
                                            y: [0, -30, 0],
                                            opacity: [0, 1, 0],
                                            scale: [0, 1.2, 0],
                                            rotate: [0, 180, 360]
                                        }}
                                        transition={{
                                            duration: 2,
                                            delay: i * 0.1,
                                            repeat: Infinity,
                                            repeatDelay: 2
                                        }}
                                    >
                                        <Sparkles className="w-full h-full" />
                                    </motion.div>
                                ))}
                            </motion.div>

                            <motion.div
                                initial={{ scale: 0, rotate: -180 }}
                                animate={{ scale: 1, rotate: 0 }}
                                transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
                                className="w-16 h-16 md:w-24 md:h-24 mx-auto bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center shadow-xl md:shadow-2xl shadow-emerald-300/50 mb-4 md:mb-8"
                            >
                                <CheckCircle className="w-10 h-10 md:w-12 md:h-12 text-white" />
                            </motion.div>

                            <motion.h1
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 }}
                                className="text-2xl md:text-4xl font-black text-emerald-900 mb-3 md:mb-4"
                            >
                                ¡Bienvenido/a! 🎉
                            </motion.h1>

                            <motion.div
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.6 }}
                                className="bg-white/90 backdrop-blur-xl rounded-2xl md:rounded-3xl shadow-xl md:shadow-2xl shadow-emerald-200/50 p-6 md:p-10 border border-emerald-100 md:border-2 md:border-emerald-100/50 mb-6 md:mb-8"
                            >
                                <h2 className="text-xl md:text-2xl font-black text-emerald-800 mb-1 md:mb-2 leading-tight">
                                    {userData.nombreCompleto}
                                </h2>
                                <p className="text-emerald-600 font-bold text-sm md:text-lg mb-4 md:mb-6">
                                    Socio N° {numeroSocio} • {userData.sucursal}
                                </p>

                                <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl md:rounded-2xl p-4 md:p-6 mb-5 md:mb-8 border border-emerald-200">
                                    <FileText className="w-10 h-10 md:w-12 md:h-12 text-emerald-500 mx-auto mb-2 md:mb-4" />
                                    <p className="text-gray-700 leading-relaxed text-sm md:text-base px-1">
                                        Te damos la bienvenida a nuestra <span className="font-bold text-emerald-700">Memoria y Balance</span> del ejercicio 2025.
                                        Aquí encontrarás toda la información sobre la gestión de nuestra cooperativa.
                                    </p>
                                </div>

                                <motion.button
                                    onClick={handleEnterVisor}
                                    className="w-full py-4 md:py-5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-bold rounded-xl md:rounded-2xl shadow-lg shadow-emerald-300 flex items-center justify-center gap-2 md:gap-3 text-base md:text-lg"
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.8 }}
                                >
                                    <span>Ver Memoria y Balance</span>
                                    <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />
                                </motion.button>
                            </motion.div>

                            <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 1 }}
                                className="text-emerald-600 font-medium text-xs md:text-sm"
                            >
                                Gracias por ser parte de nuestra cooperativa ❤️
                            </motion.p>
                        </motion.div>
                    )}
                </div>
            </AnimatePresence>

            {/* Footer */}
            <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2 }}
                className="absolute bottom-6 text-center text-xs text-emerald-600 z-30 font-medium"
            >
                Acceso exclusivo para socios • Si presenta inconvenientes, contacte al soporte
            </motion.p>
        </div>
    );
}
