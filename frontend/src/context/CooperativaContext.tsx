"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

interface CooperativaData {
    id?: number;
    nombre: string;
    nombreCorto: string;
    logo: string;
    eslogan: string;
    direccion: string;
    ciudad: string;
    pais: string;
    telefono: string;
    email: string;
    sitioWeb: string;
    ruc: string;
    colorPrimario: string;
    colorSecundario: string;
    colorAcento: string;
    facebookUrl: string;
    instagramUrl: string;
    whatsappNumero: string;
}

interface CooperativaContextType {
    cooperativa: CooperativaData;
    loading: boolean;
    refresh: () => Promise<void>;
}

// Datos por defecto (Cooperativa Multiactiva Lambaré)
const defaultCooperativa: CooperativaData = {
    nombre: "Cooperativa Multiactiva Lambaré Ltda.",
    nombreCorto: "Lambaré",
    logo: "/logo.png",
    eslogan: "Sistema de Asambleas",
    direccion: "",
    ciudad: "Lambaré",
    pais: "Paraguay",
    telefono: "",
    email: "",
    sitioWeb: "",
    ruc: "",
    colorPrimario: "#A8252C",
    colorSecundario: "#7B1717",
    colorAcento: "#D4AF37",
    facebookUrl: "",
    instagramUrl: "",
    whatsappNumero: ""
};

const CooperativaContext = createContext<CooperativaContextType>({
    cooperativa: defaultCooperativa,
    loading: true,
    refresh: async () => { }
});

export function CooperativaProvider({ children }: { children: ReactNode }) {
    const [cooperativa, setCooperativa] = useState<CooperativaData>(defaultCooperativa);
    const [loading, setLoading] = useState(true);

    const fetchCooperativa = useCallback(async () => {
        try {
            const response = await fetch("/api/cooperativa/publica");
            if (response.ok) {
                const data = await response.json();
                setCooperativa((prev) => ({
                    ...prev,
                    ...data
                }));
            }
        } catch (error) {
            console.error("Error al cargar datos de la cooperativa:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchCooperativa();
    }, [fetchCooperativa]);

    const refresh = async () => {
        setLoading(true);
        await fetchCooperativa();
    };

    return (
        <CooperativaContext.Provider value={{ cooperativa, loading, refresh }}>
            {children}
        </CooperativaContext.Provider>
    );
}

export function useCooperativa() {
    const context = useContext(CooperativaContext);
    if (!context) {
        throw new Error("useCooperativa debe usarse dentro de CooperativaProvider");
    }
    return context;
}

export default CooperativaContext;
