"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

interface TestModeInfo {
    active: boolean;
    activatedAt?: string;
    activatedBy?: string;
    backupSocios?: number;
}

interface ConfigState {
    nombreAsamblea: string;
    fechaAsamblea: string;
    mensajeWhatsApp: string;
    isMaintenanceMode: boolean;
    isTestMode: boolean;
    testModeInfo: TestModeInfo | null;
    isLoading: boolean;
    updateConfig: (clave: string, valor: string) => Promise<void>;
    refreshConfig: () => Promise<void>;
    activateTestMode: () => Promise<{ success: boolean; message?: string; error?: string }>;
    deactivateTestMode: () => Promise<{ success: boolean; message?: string; error?: string }>;
    refreshTestModeStatus: () => Promise<void>;
}

const ConfigContext = createContext<ConfigState | undefined>(undefined);

export function ConfigProvider({ children }: { children: React.ReactNode }) {
    const [config, setConfig] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [testModeInfo, setTestModeInfo] = useState<TestModeInfo | null>(null);

    const refreshConfig = async () => {
        try {
            const token = localStorage.getItem("token");
            const headers: any = {};
            if (token) headers.Authorization = `Bearer ${token}`;

            const response = await axios.get("/api/configuracion", {
                headers,
                timeout: 5000 // 5 segundos timeout
            });
            if (response.data) {
                setConfig(response.data);
            }
        } catch (error) {
            // Silenciosamente usar valores por defecto si el backend no responde
            console.warn("Usando configuración por defecto");
        } finally {
            setIsLoading(false);
        }
    };

    const refreshTestModeStatus = async () => {
        try {
            const token = localStorage.getItem("token");
            if (!token) return;

            const response = await axios.get("/api/configuracion/test-mode/status", {
                headers: { Authorization: `Bearer ${token}` },
                timeout: 5000
            });
            setTestModeInfo(response.data);
        } catch (error) {
            console.warn("Error obteniendo estado de modo prueba");
        }
    };

    useEffect(() => {
        refreshConfig();
        refreshTestModeStatus();
    }, []);

    const updateConfig = async (clave: string, valor: string) => {
        try {
            const token = localStorage.getItem("token");
            await axios.post("/api/configuracion", {
                [clave]: valor
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            await refreshConfig();
        } catch (error) {
            console.error("Error guardando configuración:", error);
            throw error;
        }
    };

    const activateTestMode = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await axios.post("/api/configuracion/test-mode/activate", {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            await refreshTestModeStatus();
            await refreshConfig();
            return response.data;
        } catch (error: any) {
            return {
                success: false,
                error: error.response?.data?.error || "Error al activar modo de prueba"
            };
        }
    };

    const deactivateTestMode = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await axios.post("/api/configuracion/test-mode/deactivate", {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            await refreshTestModeStatus();
            await refreshConfig();
            return response.data;
        } catch (error: any) {
            return {
                success: false,
                error: error.response?.data?.error || "Error al desactivar modo de prueba"
            };
        }
    };

    const nombreAsamblea = config["ASAMBLEA_NOMBRE"] || "ASAMBLEA GENERAL ORDINARIA 2026";
    const fechaAsamblea = config["ASAMBLEA_FECHA"] || "2026-01-15";
    const mensajeWhatsApp = config["MENSAJE_WHATSAPP"] || "¡Hola! Buenos días {SALUDO} *{NOMBRE}* 👋\n\nTe saluda *{ASESOR}* de la *Cooperativa Lambaré* ✅ para invitarte cordialmente a nuestra próxima asamblea institucional que será el día *{FECHA_ASAMBLEA}*.\n\n¡Contamos con tu apoyo y participación! 🌟 Si tienes alguna duda, puedes responderme por este medio.";
    const isMaintenanceMode = config["MODO_MANTENIMIENTO"] === "true";
    const isTestMode = testModeInfo?.active || config["MODO_PRUEBA"] === "true";

    return (
        <ConfigContext.Provider value={{
            nombreAsamblea,
            fechaAsamblea,
            mensajeWhatsApp,
            isMaintenanceMode,
            isTestMode,
            testModeInfo,
            isLoading,
            updateConfig,
            refreshConfig,
            activateTestMode,
            deactivateTestMode,
            refreshTestModeStatus
        }}>
            {children}
        </ConfigContext.Provider>
    );
}

export function useConfig() {
    const context = useContext(ConfigContext);
    if (context === undefined) {
        throw new Error("useConfig must be used within a ConfigProvider");
    }
    return context;
}
