"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { RefreshCcw } from "lucide-react";
import { ImportProvider } from "@/context/ImportContext";
import ImportStatusFloating from "@/components/ImportStatusFloating";
import ForcePasswordChange from "@/components/auth/ForcePasswordChange";
import { WelcomeModal } from "@/components/onboarding/WelcomeModal";
import { TourProvider, TourOverlay, TourWelcome, useTour, dashboardSocioTour, dashboardAdminTour } from "@/components/tour";
import ChatFAB from "@/components/ChatFAB";
import PageTransition from "@/components/PageTransition";
import PushNotificationManager from "@/components/notifications/PushNotificationManager";
import { UserActivityProvider } from "@/context/UserActivityContext";
import { SessionExpiredModal } from "@/components/auth/SessionExpiredModal";
import { HeartbeatManager } from "@/components/layout/HeartbeatManager";
import { DeadlineNotification } from "@/components/DeadlineNotification";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { InactivityGuard } from "@/components/auth/InactivityGuard";
import { CandidateSpotlight } from "@/components/dashboard/CandidateSpotlight";
import { WelcomeStatsModal } from "@/components/modals/WelcomeStatsModal";
// Importar para registrar el interceptor global de axios (detecta sesión expirada)
import "@/lib/api";

// Componente wrapper para el TourWelcome que necesita acceso al contexto
function TourWelcomeWrapper({ userRole }: { userRole?: string }) {
    const { startTour, hasSeenTour } = useTour();

    const handleStartTour = () => {
        // Determinar el tour según el rol
        const tourSteps = userRole === "SUPER_ADMIN" || userRole === "DIRECTIVO"
            ? dashboardAdminTour
            : dashboardSocioTour;
        const tourId = userRole === "SUPER_ADMIN" || userRole === "DIRECTIVO"
            ? "dashboard-admin"
            : "dashboard";

        // Solo iniciar si no lo ha visto
        if (!hasSeenTour(tourId)) {
            startTour(tourSteps, tourId);
        } else {
            // Si ya lo vio, simplemente iniciarlo de nuevo
            startTour(tourSteps, tourId);
        }
    };

    return <TourWelcome onStartTour={handleStartTour} />;
}


export default function PrivateLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const [authorized, setAuthorized] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [isSessionExpired, setIsSessionExpired] = useState(false);

    useEffect(() => {
        const handleSessionExpired = () => {
            setIsSessionExpired(true);
        };

        window.addEventListener("session-expired", handleSessionExpired);
        return () => window.removeEventListener("session-expired", handleSessionExpired);
    }, []);

    useEffect(() => {
        const token = localStorage.getItem("token");
        const userData = localStorage.getItem("user");
        if (!token) {
            setAuthorized(false);
            router.push("/login");
        } else {
            if (userData) {
                setUser(JSON.parse(userData));
            }
            setAuthorized(true);
            // Resetear modal de sesión expirada si hay token válido
            // (el usuario acaba de hacer login)
            if (isSessionExpired) {
                setIsSessionExpired(false);
            }
            // Si hay token pero session-start es viejo o no existe, renovarlo
            const sessionStart = parseInt(localStorage.getItem("session-start") || "0", 10);
            const elapsed = Date.now() - sessionStart;
            if (!sessionStart || elapsed > 60 * 60 * 1000) {
                localStorage.setItem("session-start", Date.now().toString());
            }
        }
    }, [pathname, router]);

    if (!authorized) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-gradient-to-br from-teal-50 to-emerald-100">
                <div className="flex flex-col items-center gap-4">
                    <RefreshCcw className="h-10 w-10 animate-spin text-teal-500" />
                    <p className="text-teal-500 font-medium">Cargando...</p>
                </div>
            </div>
        );
    }

    return (
        <TourProvider>
            <ImportProvider>
                <UserActivityProvider>
                    <div className="flex min-h-[100dvh] h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-white to-teal-50/30 relative">
                        {user?.requiresPasswordChange && (
                            <ForcePasswordChange onSuccess={() => {
                                const newUser = JSON.parse(localStorage.getItem("user") || "{}");
                                setUser(newUser);
                            }} />
                        )}
                        {user && <WelcomeModal user={user} onUpdateUser={setUser} />}
                        {user && !user.requiresPasswordChange && (user.telefono && user.telefono.length >= 6) && (
                            <TourWelcomeWrapper userRole={user?.rol} />
                        )}
                        <Sidebar />
                        {/* Gestor de Pulso de Actividad (Heartbeat) */}
                        <HeartbeatManager />

                        <div className="flex flex-1 flex-col min-w-0">
                            <header className="z-40 w-full relative">
                                <TopBar />
                            </header>
                            <main className="flex-1 overflow-y-auto overflow-x-hidden px-4 md:p-6 lg:p-8">
                                <div className="animate-fade-in">
                                    {children}
                                </div>
                            </main>
                        </div>
                    </div>
                    <ImportStatusFloating />
                    <ChatFAB />
                    <PushNotificationManager userRole={user?.rol} />
                    <TourOverlay />
                    <Suspense fallback={null}>
                        <PageTransition />
                    </Suspense>
                    <SessionExpiredModal isOpen={isSessionExpired} />
                    <DeadlineNotification />
                    <InactivityGuard />
                    <PWAInstallPrompt />
                    <CandidateSpotlight />
                    <WelcomeStatsModal />
                </UserActivityProvider>
            </ImportProvider>
        </TourProvider>
    );
}
