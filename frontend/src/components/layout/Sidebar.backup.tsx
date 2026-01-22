"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
    BarChart3,
    Users,
    Settings,
    CheckSquare,
    ClipboardList,
    LogOut,
    UserCheck,
    FileUp,
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    Menu,
    Shield,
    ClipboardCheck,
    Activity,
    LayoutDashboard,
    History,
    ShieldAlert,
    Zap,
    MessageSquare,
    Send
} from "lucide-react";
import { cn } from "@/lib/utils";

const menuItems = [
    {
        id: "dashboard",
        name: "Dashboard",
        href: "/dashboard",
        icon: BarChart3,
        submenu: [
            { id: "dashboard-general", name: "General", href: "/dashboard", icon: LayoutDashboard },
            { id: "dashboard-live", name: "En Vivo", href: "/dashboard-live", icon: Activity },
        ]
    },
    { id: "importar", name: "Importar Padrón", href: "/importar", icon: FileUp },
    { id: "importar-funcionarios", name: "Importar Funcionarios", href: "/importar-funcionarios", icon: Users },
    { id: "socios", name: "Padrón Socios", href: "/socios", icon: Users },
    { id: "asignacion-rapida", name: "Asignación Rápida", href: "/asignacion-rapida", icon: Zap },
    { id: "asignaciones", name: "Mis Listas", href: "/asignaciones", icon: UserCheck },
    { id: "asignaciones-admin", name: "Asignación Master", href: "/asignaciones-admin", icon: ShieldAlert },
    { id: "asistencia", name: "Asistencia", href: "/asistencia", icon: ClipboardCheck },
    { id: "checkin", name: "Check-in", href: "/checkin", icon: CheckSquare },
    {
        id: "reportes", name: "Reportes", href: "/reportes", icon: ClipboardList, submenu: [
            { id: "reportes-general", name: "General", href: "/reportes", icon: ClipboardList },
            { id: "reportes-sucursal", name: "Por Sucursal", href: "/reportes/por-sucursal", icon: Users },
        ]
    },
    {
        id: "comunicacion", name: "Comunicación", href: "/mensajes", icon: MessageSquare, submenu: [
            { id: "mensajes-chat", name: "Chat Admin", href: "/mensajes/chat", icon: MessageSquare },
            { id: "mensajes-avisos", name: "Avisos", href: "/mensajes/avisos", icon: Send },
        ]
    },
    { id: "usuarios", name: "Usuarios y Roles", href: "/usuarios", icon: Shield },
    { id: "auditoria", name: "Auditoría", href: "/auditoria", icon: History },
    { id: "configuracion", name: "Configuración", href: "/configuracion", icon: Settings },
];

export function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const [collapsed, setCollapsed] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [expandedMenu, setExpandedMenu] = useState<string | null>(null);

    useEffect(() => {
        const userData = localStorage.getItem("user");
        if (userData) {
            setUser(JSON.parse(userData));
        }

        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
            // En móvil NO forzamos colapsado automáticamente, 
            // dejamos que se vea completo si el menú se abre.
        };
        checkMobile();
        window.addEventListener("resize", checkMobile);
        return () => window.removeEventListener("resize", checkMobile);
    }, []);

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        router.push("/");
    };

    const hasPermission = (itemId: string) => {
        if (!user) return false;
        if (user.rol === "SUPER_ADMIN") return true;

        // Permisos especiales (Granulares)
        if (user.permisosEspeciales) {
            const special = user.permisosEspeciales.split(',');
            if (special.includes(itemId)) return true;
        }

        // Permisos por Rol (Lógica base)
        switch (itemId) {
            case "dashboard":
                return true;
            case "dashboard-general":
            case "dashboard-live":
                return user.rol !== "USUARIO_SOCIO";
            case "socios":
            case "reportes":
                return user.rol === "DIRECTIVO" || user.rol === "SUPER_ADMIN";
            case "asignaciones":
                return user.rol === "USUARIO_SOCIO" || user.rol === "DIRECTIVO" || user.rol === "SUPER_ADMIN";
            case "asignaciones-admin":
                return user.rol === "ADMIN" || user.rol === "SUPER_ADMIN";
            case "asistencia":
            case "checkin":
                return user.rol === "OPERADOR" || user.rol === "DIRECTIVO" || user.rol === "SUPER_ADMIN";
            case "usuarios":
            case "importar":
            case "auditoria":
                return user.rol === "SUPER_ADMIN";
            case "comunicacion":
            case "mensajes-chat":
            case "mensajes-avisos":
                return user.rol === "DIRECTIVO" || user.rol === "SUPER_ADMIN";
            case "configuracion":
                return user.rol === "USUARIO_SOCIO" || user.rol === "SUPER_ADMIN";
            default: return false;
        }
    };

    // Cerrar menú móvil al navegar
    useEffect(() => {
        setMobileOpen(false);
    }, [pathname]);

    // Escuchar evento para abrir menú desde TopBar
    useEffect(() => {
        const handleToggle = () => setMobileOpen((prev) => !prev);
        window.addEventListener('toggle-sidebar', handleToggle);
        return () => window.removeEventListener('toggle-sidebar', handleToggle);
    }, []);

    // Lógica principal: En móvil, SIEMPRE está expandido (títulos visibles) cuando está abierto.
    // collapsed solo afecta a Desktop.
    const effectiveCollapsed = collapsed && !isMobile;

    const sidebarContent = (
        <>
            {/* Logo y título */}
            <div className={cn(
                "flex items-center border-b border-teal-500/30 transition-all duration-300",
                effectiveCollapsed ? "h-20 justify-center p-2" : "h-24 justify-start p-4 gap-3 ml-2"
            )}>
                <div className="flex-shrink-0">
                    <img
                        src="/logo.png?v=fixed"
                        alt="Logo"
                        className={cn(
                            "object-contain rounded-full bg-white shadow-lg transition-all duration-300",
                            effectiveCollapsed ? "h-10 w-10 p-0.5" : "h-12 w-12 p-1"
                        )}
                    />
                </div>
                {!effectiveCollapsed && (
                    <div className="flex flex-col min-w-0">
                        <span className="text-sm font-bold text-white truncate">Cooperativa Lambaré</span>
                        <span className="text-xs text-teal-200/80">Sistema de Asambleas</span>
                    </div>
                )}
            </div>

            {/* Navegación */}
            <nav data-tour={isMobile && !mobileOpen ? undefined : "sidebar-panel"} className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
                {menuItems.filter(item => hasPermission(item.id)).map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                    const hasSubmenu = item.submenu && item.submenu.length > 0;
                    const isExpanded = expandedMenu === item.id;

                    // Filtrar submenús por permisos
                    const filteredSubmenu = (item.submenu || []).filter(sub => hasPermission(sub.id));
                    const hasVisibleSubmenu = filteredSubmenu.length > 0;

                    // Si no hay submenús visibles, mostrar como link directo
                    if (!hasVisibleSubmenu) {
                        return (
                            <Link
                                key={item.id}
                                href={item.href}
                                title={effectiveCollapsed ? item.name : undefined}
                                data-tour={item.id === 'asignaciones' ? 'nav-mis-listas' : item.id === 'configuracion' ? 'nav-config' : undefined}
                                className={cn(
                                    "group flex items-center rounded-xl font-medium transition-all duration-200",
                                    effectiveCollapsed ? "justify-center px-2 py-3" : "px-3 py-2.5",
                                    isActive
                                        ? "bg-white/20 text-white shadow-lg backdrop-blur-sm"
                                        : "text-teal-100 hover:bg-white/10 hover:text-white"
                                )}
                            >
                                <item.icon className={cn(
                                    "h-5 w-5 flex-shrink-0 transition-colors",
                                    effectiveCollapsed ? "" : "mr-3",
                                    isActive ? "text-white" : "text-teal-200 group-hover:text-white"
                                )} />
                                {!effectiveCollapsed && <span className="text-sm truncate">{item.name}</span>}
                            </Link>
                        );
                    }

                    if (hasSubmenu) {
                        return (
                            <div key={item.id}>
                                <button
                                    onClick={() => setExpandedMenu(isExpanded ? null : item.id)}
                                    className={cn(
                                        "group flex items-center w-full rounded-xl font-medium transition-all duration-200",
                                        effectiveCollapsed ? "justify-center px-2 py-3" : "px-3 py-2.5",
                                        (pathname.startsWith('/dashboard'))
                                            ? "bg-white/20 text-white shadow-lg backdrop-blur-sm"
                                            : "text-teal-100 hover:bg-white/10 hover:text-white"
                                    )}
                                >
                                    <item.icon className={cn(
                                        "h-5 w-5 flex-shrink-0 transition-colors",
                                        effectiveCollapsed ? "" : "mr-3",
                                        (pathname.startsWith('/dashboard')) ? "text-white" : "text-teal-200 group-hover:text-white"
                                    )} />
                                    {!effectiveCollapsed && (
                                        <>
                                            <span className="text-sm truncate flex-1 text-left">{item.name}</span>
                                            <ChevronDown className={cn(
                                                "h-4 w-4 transition-transform duration-200",
                                                isExpanded ? "rotate-180" : ""
                                            )} />
                                        </>
                                    )}
                                </button>
                                {/* Submenú filtrado por permisos */}
                                {!effectiveCollapsed && isExpanded && (
                                    <div className="mt-1 ml-4 space-y-1 border-l-2 border-teal-500/30 pl-3">
                                        {filteredSubmenu.map((sub) => {
                                            const isSubActive = pathname === sub.href;
                                            return (
                                                <Link
                                                    key={sub.id}
                                                    href={sub.href}
                                                    className={cn(
                                                        "group flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
                                                        isSubActive
                                                            ? "bg-white/20 text-white"
                                                            : "text-teal-200 hover:bg-white/10 hover:text-white"
                                                    )}
                                                >
                                                    <sub.icon className={cn(
                                                        "h-4 w-4 mr-2",
                                                        isSubActive ? "text-white" : "text-teal-300"
                                                    )} />
                                                    {sub.name}
                                                </Link>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    }

                    return (
                        <Link
                            key={item.id}
                            href={item.href}
                            title={effectiveCollapsed ? item.name : undefined}
                            data-tour={item.id === 'asignaciones' ? 'nav-mis-listas' : item.id === 'configuracion' ? 'nav-config' : undefined}
                            className={cn(
                                "group flex items-center rounded-xl font-medium transition-all duration-200",
                                effectiveCollapsed ? "justify-center px-2 py-3" : "px-3 py-2.5",
                                isActive
                                    ? "bg-white/20 text-white shadow-lg backdrop-blur-sm"
                                    : "text-teal-100 hover:bg-white/10 hover:text-white"
                            )}
                        >
                            <item.icon className={cn(
                                "h-5 w-5 flex-shrink-0 transition-colors",
                                effectiveCollapsed ? "" : "mr-3",
                                isActive ? "text-white" : "text-teal-200 group-hover:text-white"
                            )} />
                            {!effectiveCollapsed && (
                                <span className="text-sm truncate">{item.name}</span>
                            )}
                            {isActive && !effectiveCollapsed && (
                                <div className="ml-auto h-2 w-2 rounded-full bg-white animate-pulse" />
                            )}
                        </Link>
                    );
                })}
            </nav>

            {/* Botón colapsar (solo desktop) */}
            {!isMobile && (
                <div className="px-2 py-2 border-t border-teal-500/30">
                    <button
                        onClick={() => setCollapsed(!collapsed)}
                        className="flex w-full items-center justify-center rounded-xl px-3 py-2.5 text-teal-200 hover:bg-white/10 hover:text-white transition-all"
                        title={collapsed ? "Expandir menú" : "Colapsar menú"}
                    >
                        {collapsed ? (
                            <ChevronRight className="h-5 w-5" />
                        ) : (
                            <>
                                <ChevronLeft className="h-5 w-5 mr-2" />
                                <span className="text-sm font-medium">Colapsar</span>
                            </>
                        )}
                    </button>
                </div>
            )}

            {/* Cerrar sesión */}
            <div className="border-t border-teal-500/30 p-2">
                <button
                    onClick={handleLogout}
                    className={cn(
                        "flex w-full items-center rounded-xl text-teal-200 hover:bg-red-500/20 hover:text-red-300 transition-all",
                        effectiveCollapsed ? "justify-center px-2 py-3" : "px-3 py-2.5"
                    )}
                    title="Cerrar Sesión"
                >
                    <LogOut className={cn("h-5 w-5 flex-shrink-0", effectiveCollapsed ? "" : "mr-3")} />
                    {!effectiveCollapsed && <span className="text-sm font-medium">Cerrar Sesión</span>}
                </button>
            </div>
        </>
    );

    return (
        <>
            {/* Overlay para móvil */}
            {isMobile && mobileOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* Sidebar */}
            <div
                className={cn(
                    "flex h-screen flex-col text-white shadow-2xl transition-all duration-300 ease-in-out",
                    // Gradiente verde pastel
                    "bg-gradient-to-b from-teal-500 via-teal-500 to-teal-500",
                    // Ancho
                    effectiveCollapsed ? "w-16" : "w-64",
                    // Posición móvil
                    isMobile ? "fixed z-50 left-0 top-0" : "relative hidden md:flex",
                    isMobile && !mobileOpen ? "-translate-x-full invisible" : "translate-x-0"
                )}
            >
                {sidebarContent}

                {/* Espaciador inferior para evitar overlays como el de Next.js */}
                <div className="h-20 flex-shrink-0" />
            </div>
        </>
    );
}
