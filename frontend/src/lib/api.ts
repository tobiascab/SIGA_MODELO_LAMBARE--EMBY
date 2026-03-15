import axios from 'axios';

// API Configuration - Centralized API URL management
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://asamblea.cloud';

// Create a configured axios instance
export const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Verificar si el token JWT está expirado (sin hacer request al servidor)
function isTokenExpired(): boolean {
    if (typeof window === 'undefined') return false;
    const token = localStorage.getItem('token');
    if (!token) return false;
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        // Expirado si le quedan menos de 30 segundos
        return payload.exp * 1000 < Date.now() + 30000;
    } catch {
        return false;
    }
}

// Lógica centralizada de detección de sesión expirada
function isSessionExpired(error: any): boolean {
    if (!error.response) return false;
    const status = error.response.status;
    if (status === 401) return true;
    // 403 con token expirado: verificar si el token realmente expiró
    if (status === 403 && isTokenExpired()) return true;
    return false;
}

let sessionExpiredFired = false;
function fireSessionExpired() {
    if (typeof window !== 'undefined' && !sessionExpiredFired) {
        sessionExpiredFired = true;
        // Limpiar token para evitar más requests con token expirado
        // (no borrar 'user' para que SessionExpiredModal pueda mostrarlo)
        localStorage.removeItem('token');
        window.dispatchEvent(new CustomEvent('session-expired'));
        setTimeout(() => { sessionExpiredFired = false; }, 3000);
    }
}

// Request interceptor: evitar enviar requests con token expirado
const requestInterceptor = (config: any) => {
    if (typeof window !== 'undefined' && isTokenExpired()) {
        fireSessionExpired();
        // Cancelar el request
        const controller = new AbortController();
        controller.abort();
        config.signal = controller.signal;
    }
    return config;
};

// Response interceptor para detectar sesión expirada
const responseErrorInterceptor = (error: any) => {
    if (isSessionExpired(error)) {
        fireSessionExpired();
    }
    return Promise.reject(error);
};

// Interceptors para instancia api
api.interceptors.request.use(requestInterceptor);
api.interceptors.response.use(
    (response) => response,
    responseErrorInterceptor
);

// Interceptors globales para páginas que usan `axios` directamente
axios.interceptors.request.use(requestInterceptor);
axios.interceptors.response.use(
    (response) => response,
    responseErrorInterceptor
);

// For use with axios instances
export const apiConfig = {
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
};

// Helper to get API endpoint
export const getApiUrl = (endpoint: string): string => {
    return `${API_URL}${endpoint}`;
};
