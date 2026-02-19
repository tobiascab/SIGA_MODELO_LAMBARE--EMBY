"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
    Send,
    Briefcase,
    Building2,
    FileText,
    Bell,
    Clock,
    Award,
    TrendingUp,
    Database,
    MapPin,
    Phone,
    TableProperties,
    BookOpen,
    Search,
    Target
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCooperativa } from "@/context/CooperativaContext";

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
    {
        id: "padrones",
        name: "Gestión de Padrones",
        href: "#", // Group container
        icon: Users,
        submenu: [
            { id: "importar", name: "Importar Padrón", href: "/importar", icon: FileUp },
            { id: "importar-contactos", name: "Actualizar Contactos", href: "/importar-contactos", icon: Phone },
            { id: "importar-funcionarios", name: "Importar Operadores", href: "/importar-funcionarios", icon: Users },
            { id: "socios", name: "Padrón de Socios", href: "/socios", icon: Users },
        ]
    },
    {
        id: "operativa",
        name: "Gestión Operativa",
        href: "#",
        icon: Briefcase,
        submenu: [
            { id: "asignacion-rapida", name: "Asignación Rápida", href: "/asignacion-rapida", icon: Zap },
            { id: "asignaciones", name: "Mis Listas", href: "/asignaciones", icon: UserCheck },
            { id: "ver-punteros", name: "Ver Punteros", href: "/ver-punteros", icon: Target },
            { id: "asignaciones-admin", name: "Asignación Master", href: "/asignaciones-admin", icon: ShieldAlert },
        ]
    },
    {
        id: "asistencia-group",
        name: "Control de Asistencia",
        href: "#",
        icon: ClipboardCheck,
        submenu: [
            { id: "asistencia", name: "Asistencia", href: "/asistencia", icon: ClipboardCheck },
            { id: "checkin", name: "Check-in", href: "/checkin", icon: CheckSquare },
            { id: "consulta", name: "Consulta", href: "/asistencia/consulta", icon: Users },
            { id: "consulta-mesa", name: "Consulta Mesa", href: "/asistencia/consulta-mesa", icon: Search },
            { id: "gestion-asistencia", name: "Gestión", href: "/asistencia/gestion", icon: ShieldAlert },
        ]
    },
    {
        id: "reportes",
        name: "Reportes",
        href: "#",
        icon: FileText,
        submenu: [
            { id: "reportes-general", name: "Reportes Generales", href: "/reportes", icon: ClipboardList },
            { id: "reportes-ubicacion", name: "Padrón por Ubicación", href: "/reportes/ubicacion", icon: MapPin },
            { id: "reportes-rankings-vyv", name: "Rankings VyV", href: "/reportes/rankings", icon: Award },
            { id: "reportes-cumplimiento", name: "Cumplimiento de Listas", href: "/reportes/cumplimiento", icon: ClipboardCheck },
            { id: "reportes-ranking-asistencia", name: "Ranking Asistencia", href: "/reportes/ranking-asistencia", icon: TrendingUp },
            { id: "ranking-gestion", name: "Ranking de Gestión", href: "/reportes/ranking", icon: TrendingUp },
            { id: "reportes-asesores", name: "Reporte Asesores", href: "/reportes/asesores", icon: UserCheck },
            { id: "reportes-sucursal", name: "Reportes Específicos", href: "/reportes/por-sucursal", icon: Building2 },
            { id: "reportes-funcionarios", name: "Operadores", href: "/reportes/funcionarios", icon: Briefcase },
            { id: "reportes-asistencia", name: "Asistencia por Operador", href: "/reportes/asistencia-funcionarios", icon: Clock },
            { id: "auditoria-usuarios", name: "Auditoría de Usuarios", href: "/reportes/auditoria-usuarios", icon: Activity },
        ]
    },
    {
        id: "candidatos",
        name: "Candidatos",
        href: "/candidatos",
        icon: Award
    },
    {
        id: "comunicacion",
        name: "Comunicación",
        href: "#",
        icon: MessageSquare,
        submenu: [
            { id: "exportar-vyv", name: "Exportar VyV", href: "/mensajeria", icon: Send },
            { id: "mensajes-chat", name: "Mensajería", href: "/mensajes/chat", icon: MessageSquare },
            { id: "mensajes-avisos", name: "Notificaciones", href: "/mensajes/avisos", icon: Bell },
        ]
    },
    {
        id: "admin",
        name: "Administración del Sistema",
        href: "#",
        icon: Settings,
        submenu: [
            { id: "datos-cooperativa", name: "Datos Cooperativa", href: "/admin/cooperativa", icon: Building2 },
            { id: "admin-mesas", name: "Gestión de Mesas", href: "/admin/mesas", icon: TableProperties },
            { id: "usuarios", name: "Usuarios y Roles", href: "/usuarios", icon: Shield },
            { id: "gestion-listas", name: "Gestión de Listas", href: "/gestion-listas", icon: ClipboardList },
            { id: "auditoria", name: "Auditoría", href: "/auditoria", icon: History },
            { id: "configuracion", name: "Configuración", href: "/configuracion", icon: Settings },
            { id: "config-candidatos", name: "Gestión Candidatos", href: "/configuracion/candidatos", icon: UserCheck },
            { id: "backups", name: "Backups", href: "/admin/backups", icon: Database },
            { id: "memoria-balance", name: "Memoria y Balance", href: "/memoria-y-balance", icon: BookOpen },
        ]
    }
];

export function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const { cooperativa } = useCooperativa();
    const [collapsed, setCollapsed] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [user, setUser] = useState(null as any);
    const [expandedMenu, setExpandedMenu] = useState(null as string | null);
    const [hoveredMenu, setHoveredMenu] = useState(null as string | null);

    useEffect(() => {
        const userData = localStorage.getItem("user");
        if (userData) {
            setUser(JSON.parse(userData));
        }

        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
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

    const hasPermission = (itemId: string): boolean => {
        if (!user) return false;
        // SUPER_ADMIN tiene acceso total
        if (user.rol === "SUPER_ADMIN") return true;
        // SUPER_ADMIN_VISUAL tiene acceso de lectura a todo excepto acciones críticas
        if (user.rol === "SUPER_ADMIN_VISUAL") {
            // Items que el SUPER_ADMIN_VISUAL NO puede ver (acciones de modificación/configuración)
            const blockedForVisual = [
                // Carga de datos
                "importar", "importar-funcionarios",
                // Asignaciones masivas
                "asignacion-rapida", "asignaciones-admin",
                // Administración del sistema (todo el grupo)
                "admin", "usuarios", "gestion-listas", "auditoria", "configuracion", "backups"
            ];
            if (blockedForVisual.includes(itemId)) return false;
            return true; // Puede ver todo lo demás (dashboard, reportes, asistencia, etc.)
        }

        // Permisos especiales (Granulares)
        if (user.permisosEspeciales) {
            const special = user.permisosEspeciales.split(',');
            if (special.includes(itemId)) return true;
        }

        // --- Logica de Grupos ---
        // Un grupo es visible si el usuario tiene permiso para AL MENOS UNO de sus hijos.
        if (itemId === "padrones") {
            return hasPermission("importar") || hasPermission("importar-funcionarios") || hasPermission("socios");
        }
        if (itemId === "operativa") {
            return hasPermission("asignacion-rapida") || hasPermission("asignaciones") || hasPermission("ver-punteros") || hasPermission("asignaciones-admin");
        }
        if (itemId === "asistencia-group") {
            return hasPermission("asistencia") || hasPermission("checkin") || hasPermission("consulta") || hasPermission("gestion-asistencia");
        }
        if (itemId === "reportes") {
            return hasPermission("reportes-general") || hasPermission("reportes-ubicacion") || hasPermission("reportes-rankings-vyv") || hasPermission("reportes-cumplimiento") || hasPermission("reportes-ranking-asistencia") || hasPermission("ranking-gestion") || hasPermission("reportes-asesores") || hasPermission("reportes-sucursal") || hasPermission("reportes-funcionarios") || hasPermission("reportes-asistencia") || hasPermission("auditoria-usuarios");
        }
        if (itemId === "comunicacion") {
            return hasPermission("exportar-vyv") || hasPermission("mensajes-chat") || hasPermission("mensajes-avisos");
        }
        if (itemId === "admin") {
            return hasPermission("usuarios") || hasPermission("gestion-listas") || hasPermission("auditoria") || hasPermission("configuracion");
        }

        // --- Permisos por Item Individual ---
        switch (itemId) {
            case "dashboard":
            case "dashboard-general":
                return true; // Todos los usuarios pueden ver el Dashboard principal
            case "dashboard-live":
                return user.rol !== "USUARIO_SOCIO"; // Solo staff ve el dashboard en vivo

            // Padrones
            case "importar":
            case "importar-contactos":
            case "importar-funcionarios":
                return user.rol === "SUPER_ADMIN";
            case "socios":
                return user.rol === "SUPER_ADMIN"; // Solo SUPER_ADMIN puede ver el padrón de socios

            // Operativa
            case "asignacion-rapida":
                return user.rol === "SUPER_ADMIN" || user.rol === "PUNTERO";
            case "asignaciones": // Mis Listas
                return user.rol === "USUARIO_SOCIO" || user.rol === "DIRECTIVO" || user.rol === "SUPER_ADMIN" || user.rol === "PUNTERO";
            case "ver-punteros":
                return user.isDirigente === true || user.rol === "SUPER_ADMIN";
            case "asignaciones-admin": // Master
                return user.rol === "ADMIN" || user.rol === "SUPER_ADMIN";

            // Asistencia
            case "asistencia":
            case "checkin":
            case "consulta":
            case "consulta-mesa":
                return user.rol === "OPERADOR" || user.rol === "DIRECTIVO" || user.rol === "SUPER_ADMIN";
            case "gestion-asistencia":
                return user.rol === "SUPER_ADMIN"; // Solo SUPER_ADMIN puede gestionar/eliminar asistencias

            // Reportes
            case "reportes-ubicacion":
                return user.rol === "DIRECTIVO" || user.rol === "SUPER_ADMIN";
            case "reportes-rankings-vyv":
                return user.rol === "DIRECTIVO" || user.rol === "SUPER_ADMIN";
            case "reportes-general":
                return user.rol === "DIRECTIVO" || user.rol === "SUPER_ADMIN";
            case "ranking-gestion":
                return user.rol === "DIRECTIVO" || user.rol === "SUPER_ADMIN";
            case "reportes-asesores":
                return user.rol === "DIRECTIVO" || user.rol === "SUPER_ADMIN";
            case "reportes-sucursal":
                return user.rol === "DIRECTIVO" || user.rol === "SUPER_ADMIN";
            case "reportes-funcionarios":
                return user.rol === "DIRECTIVO" || user.rol === "SUPER_ADMIN";
            case "reportes-asistencia":
                return user.rol === "DIRECTIVO" || user.rol === "SUPER_ADMIN";
            case "reportes-cumplimiento":
            case "reportes-ranking-asistencia":
                return user.rol === "DIRECTIVO" || user.rol === "SUPER_ADMIN";
            case "auditoria-usuarios":
                return user.rol === "SUPER_ADMIN" || user.rol === "DIRECTIVO";

            // Mi Reporte (todos los operadores pueden ver su reporte)
            case "mi-reporte":
                return true; // Todos los usuarios autenticados pueden ver su reporte

            // Comunicacion
            case "exportar-vyv":
            case "mensajes-chat":
            case "mensajes-avisos":
                return user.rol === "DIRECTIVO" || user.rol === "SUPER_ADMIN";

            case "usuarios":
            case "gestion-listas":
            case "auditoria":
            case "backups":
            case "config-candidatos":
            case "datos-cooperativa":
            case "admin-mesas":
            case "memoria-balance":
                return user.rol === "SUPER_ADMIN";
            case "candidatos":
                return true; // Todos pueden ver candidatos
            case "configuracion":
                return true; // Todos los usuarios pueden ver su propia configuración


            default: return false;
        }
    };

    // Cerrar menú móvil al navegar
    useEffect(() => {
        setMobileOpen(false);
    }, [pathname]);

    // Escuchar evento para abrir menú desde TopBar
    useEffect(() => {
        const handleToggle = () => setMobileOpen((prev: boolean) => !prev);
        window.addEventListener('toggle-sidebar', handleToggle);
        return () => window.removeEventListener('toggle-sidebar', handleToggle);
    }, []);

    // Bloquear scroll del body cuando sidebar móvil está abierto
    useEffect(() => {
        if (isMobile && mobileOpen) {
            document.body.style.overflow = 'hidden';
            document.documentElement.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
            document.documentElement.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
            document.documentElement.style.overflow = '';
        };
    }, [isMobile, mobileOpen]);

    // Swipe para abrir sidebar desde el borde izquierdo
    const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

    useEffect(() => {
        if (!isMobile) return;

        const handleTouchStart = (e: TouchEvent) => {
            const touch = e.touches[0];
            // Solo activar si el toque empieza desde el borde izquierdo (primeros 25px)
            if (touch.clientX <= 25 && !mobileOpen) {
                touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
            }
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (!touchStartRef.current || mobileOpen) return;
            const touch = e.touches[0];
            const deltaX = touch.clientX - touchStartRef.current.x;
            const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);

            // Si el movimiento horizontal es suficiente y no es un scroll vertical
            if (deltaX > 60 && deltaY < 50) {
                setMobileOpen(true);
                touchStartRef.current = null;
            }
        };

        const handleTouchEnd = () => {
            touchStartRef.current = null;
        };

        document.addEventListener('touchstart', handleTouchStart, { passive: true });
        document.addEventListener('touchmove', handleTouchMove, { passive: true });
        document.addEventListener('touchend', handleTouchEnd, { passive: true });

        return () => {
            document.removeEventListener('touchstart', handleTouchStart);
            document.removeEventListener('touchmove', handleTouchMove);
            document.removeEventListener('touchend', handleTouchEnd);
        };
    }, [isMobile, mobileOpen]);

    // Handler para drag del sidebar en móvil
    const handleSidebarDragEnd = useCallback((_: any, info: { offset: { x: number }; velocity: { x: number } }) => {
        // Si se arrastra a la izquierda con suficiente velocidad o distancia, cerrar
        if (info.offset.x < -80 || info.velocity.x < -300) {
            setMobileOpen(false);
        }
    }, []);

    const effectiveCollapsed = collapsed && !isMobile;

    const sidebarContent = (
        <>
            {/* Logo y título */}
            <div className={cn(
                "flex items-center border-b border-emerald-500/30 transition-all duration-300",
                effectiveCollapsed ? "h-20 justify-center p-2" : "h-24 justify-start p-4 gap-3 ml-2"
            )}>
                <div className="flex-shrink-0">
                    <img
                        src={cooperativa.logo || '/logo.png'}
                        alt={cooperativa.nombreCorto || 'Logo'}
                        className={cn(
                            "object-contain rounded-full bg-white shadow-lg transition-all duration-300",
                            effectiveCollapsed ? "h-10 w-10 p-0.5" : "h-12 w-12 p-1"
                        )}
                        onError={(e) => { (e.target as HTMLImageElement).src = '/logo.png'; }}
                    />
                </div>
                {!effectiveCollapsed && (
                    <div className="flex flex-col min-w-0">
                        <span className="text-sm font-bold text-white truncate">{cooperativa.nombreCorto || cooperativa.nombre || "Cooperativa"}</span>
                        <span className="text-xs text-emerald-200/80">{cooperativa.eslogan || "Sistema de Asambleas"}</span>
                    </div>
                )}
            </div>

            {/* Navegación */}
            <nav data-tour={isMobile && !mobileOpen ? undefined : "sidebar-panel"} className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
                {(() => {
                    const isPowerUser = user?.rol === "SUPER_ADMIN" || user?.rol === "SUPER_ADMIN_VISUAL" || user?.rol === "DIRECTIVO";

                    // Si no es admin, aplanamos los submenús para que vea iconos directos
                    let itemsToRender: any[] = [];
                    if (isPowerUser) {
                        itemsToRender = menuItems;
                    } else {
                        // Encontrar todos los sub-items a los que tiene permiso y aplanarlos
                        menuItems.forEach(item => {
                            if (item.submenu) {
                                itemsToRender.push(...item.submenu);
                            } else {
                                itemsToRender.push(item);
                            }
                        });
                    }

                    return itemsToRender.filter(item => hasPermission(item.id)).map((item) => {
                        // Verificar si el grupo tiene items visibles (solo relevante para PowerUsers que ven grupos)
                        const filteredSubmenu = (item.submenu || []).filter((sub: any) => hasPermission(sub.id));
                        const hasVisibleSubmenu = filteredSubmenu.length > 0;

                        // Si es un grupo vacio (por permisos), no mostrarlo
                        if (isPowerUser && !hasVisibleSubmenu && item.href === '#') return null;

                        const isActive = pathname === item.href || (item.href !== '#' && pathname.startsWith(item.href + '/')) ||
                            (hasVisibleSubmenu && filteredSubmenu.some((sub: any) => pathname === sub.href));

                        const isExpanded = expandedMenu === item.id;
                        const isHovered = hoveredMenu === item.id;

                        // Si no tiene submenú o no somos PowerUser (queremos vista plana), renderizar link simple
                        if (!hasVisibleSubmenu || !isPowerUser) {
                            return (
                                <div
                                    key={item.id}
                                    className="relative"
                                    onMouseEnter={() => effectiveCollapsed && setHoveredMenu(item.id)}
                                    onMouseLeave={() => effectiveCollapsed && setHoveredMenu(null)}
                                >
                                    <Link
                                        href={item.href}
                                        className={cn(
                                            "group flex items-center rounded-xl font-bold transition-all duration-200",
                                            effectiveCollapsed ? "justify-center px-2 py-3" : "px-3 py-2.5",
                                            isActive
                                                ? "bg-white text-emerald-800 shadow-lg"
                                                : "text-emerald-50 hover:bg-white/10 hover:text-white"
                                        )}
                                    >
                                        <item.icon className={cn(
                                            "h-5 w-5 flex-shrink-0 transition-colors",
                                            effectiveCollapsed ? "" : "mr-3",
                                            isActive ? "text-white" : "text-emerald-200 group-hover:text-white"
                                        )} />
                                        {!effectiveCollapsed && <span className="text-sm truncate">{item.name}</span>}
                                    </Link>

                                    <AnimatePresence>
                                        {effectiveCollapsed && isHovered && (
                                            <motion.div
                                                initial={{ opacity: 0, x: 10, scale: 0.9 }}
                                                animate={{ opacity: 1, x: 0, scale: 1 }}
                                                exit={{ opacity: 0, x: 10, scale: 0.9 }}
                                                transition={{ duration: 0.1 }}
                                                className="fixed left-16 ml-2 px-4 py-2 bg-slate-900 text-white text-sm font-bold rounded-xl shadow-2xl z-[100] whitespace-nowrap border border-white/10"
                                            >
                                                <div className="absolute left-[-4px] top-1/2 -translate-y-1/2 w-2 h-2 bg-slate-900 rotate-45" />
                                                {item.name}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            );
                        }

                        // Renderizar con Submenú (Grupos) - Solo para PowerUsers
                        return (
                            <div
                                key={item.id}
                                className="relative"
                                onMouseEnter={() => effectiveCollapsed && setHoveredMenu(item.id)}
                                onMouseLeave={() => effectiveCollapsed && setHoveredMenu(null)}
                            >
                                <button
                                    onClick={() => {
                                        if (effectiveCollapsed && hasVisibleSubmenu) {
                                            router.push(filteredSubmenu[0].href);
                                        } else {
                                            setExpandedMenu(isExpanded ? null : item.id);
                                        }
                                    }}
                                    className={cn(
                                        "group flex items-center w-full rounded-xl font-medium transition-all duration-200",
                                        effectiveCollapsed ? "justify-center px-2 py-3" : "px-3 py-2.5",
                                        (isActive)
                                            ? "text-white"
                                            : "text-emerald-100 hover:bg-white/10 hover:text-white border border-transparent hover:border-white/5"
                                    )}
                                >
                                    <item.icon className={cn(
                                        "h-5 w-5 flex-shrink-0 transition-transform duration-300 group-hover:scale-110",
                                        effectiveCollapsed ? "" : "mr-3",
                                        isActive ? "text-white" : "text-emerald-200 group-hover:text-white"
                                    )} />
                                    {!effectiveCollapsed && (
                                        <>
                                            <span className="text-sm truncate flex-1 text-left font-bold">{item.name}</span>
                                            <ChevronDown className={cn(
                                                "h-4 w-4 transition-transform duration-200 text-emerald-300",
                                                isExpanded ? "rotate-180" : ""
                                            )} />
                                        </>
                                    )}
                                </button>

                                {!effectiveCollapsed && isExpanded && (
                                    <div className="mt-1 ml-4 space-y-1 border-l-2 border-emerald-500/30 pl-3">
                                        {filteredSubmenu.map((sub: any) => {
                                            const isSubActive = pathname === sub.href;
                                            return (
                                                <Link
                                                    key={sub.id}
                                                    href={sub.href}
                                                    className={cn(
                                                        "group flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
                                                        isSubActive
                                                            ? "bg-white/20 text-white shadow-sm backdrop-blur-sm"
                                                            : "text-emerald-200 hover:bg-white/10 hover:text-white"
                                                    )}
                                                >
                                                    <sub.icon className={cn(
                                                        "h-4 w-4 mr-2",
                                                        isSubActive ? "text-white" : "text-emerald-300"
                                                    )} />
                                                    {sub.name}
                                                </Link>
                                            );
                                        })}
                                    </div>
                                )}

                                <AnimatePresence>
                                    {effectiveCollapsed && isHovered && (
                                        <motion.div
                                            initial={{ opacity: 0, x: 20, scale: 0.95 }}
                                            animate={{ opacity: 1, x: 0, scale: 1 }}
                                            exit={{ opacity: 0, x: 20, scale: 0.95 }}
                                            transition={{
                                                type: "spring",
                                                damping: 20,
                                                stiffness: 300
                                            }}
                                            className="fixed left-[72px] w-64 bg-gradient-to-br from-slate-900 to-emerald-950 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-[100] border border-white/10 overflow-hidden"
                                        >
                                            <div className="absolute left-[-6px] top-6 w-3 h-3 bg-slate-900 rotate-45 border-l border-b border-white/10" />
                                            <div className="p-4 bg-white/5 border-b border-white/5">
                                                <div className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em] mb-1">Módulo</div>
                                                <div className="text-sm font-black text-white">{item.name}</div>
                                            </div>
                                            <div className="p-2 space-y-1">
                                                {filteredSubmenu.map((sub: any) => {
                                                    const isSubActive = pathname === sub.href;
                                                    return (
                                                        <Link
                                                            key={sub.id}
                                                            href={sub.href}
                                                            className={cn(
                                                                "group flex items-center rounded-xl px-3 py-3 text-sm font-bold transition-all duration-300",
                                                                isSubActive
                                                                    ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30"
                                                                    : "text-slate-300 hover:bg-white/10 hover:text-white"
                                                            )}
                                                        >
                                                            <sub.icon className={cn(
                                                                "h-4 w-4 mr-3 transition-transform duration-300 group-hover:scale-110",
                                                                isSubActive ? "text-white" : "text-emerald-500/70"
                                                            )} />
                                                            {sub.name}
                                                        </Link>
                                                    );
                                                })}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        );
                    });
                })()}
            </nav>

            {/* Botón colapsar (solo desktop) */}
            {!isMobile && (
                <div className="px-2 py-2 border-t border-emerald-500/30">
                    <div
                        className="relative"
                        onMouseEnter={() => effectiveCollapsed && setHoveredMenu("collapse-btn")}
                        onMouseLeave={() => effectiveCollapsed && setHoveredMenu(null)}
                    >
                        <button
                            onClick={() => setCollapsed(!collapsed)}
                            className="flex w-full items-center justify-center rounded-xl px-3 py-2.5 text-emerald-200 hover:bg-white/10 hover:text-white transition-all shadow-sm"
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

                        <AnimatePresence>
                            {effectiveCollapsed && hoveredMenu === "collapse-btn" && (
                                <motion.div
                                    initial={{ opacity: 0, x: 10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 10 }}
                                    className="fixed left-16 ml-2 px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl shadow-2xl z-[100] whitespace-nowrap border border-white/10"
                                >
                                    Expandir menú
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            )}

            {/* Cerrar sesión */}
            <div className="border-t border-emerald-500/30 p-2">
                <div
                    className="relative"
                    onMouseEnter={() => effectiveCollapsed && setHoveredMenu("logout-btn")}
                    onMouseLeave={() => effectiveCollapsed && setHoveredMenu(null)}
                >
                    <button
                        onClick={handleLogout}
                        className={cn(
                            "flex w-full items-center rounded-xl text-emerald-200 hover:bg-red-500/20 hover:text-red-300 transition-all",
                            effectiveCollapsed ? "justify-center px-2 py-3" : "px-3 py-2.5"
                        )}
                    >
                        <LogOut className={cn("h-5 w-5 flex-shrink-0", effectiveCollapsed ? "" : "mr-3")} />
                        {!effectiveCollapsed && <span className="text-sm font-medium">Cerrar Sesión</span>}
                    </button>

                    <AnimatePresence>
                        {effectiveCollapsed && hoveredMenu === "logout-btn" && (
                            <motion.div
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 10 }}
                                className="fixed left-16 ml-2 px-4 py-2 bg-red-900 text-white text-xs font-bold rounded-xl shadow-2xl z-[100] whitespace-nowrap border border-white/10"
                            >
                                <div className="absolute left-[-4px] top-1/2 -translate-y-1/2 w-2 h-2 bg-red-900 rotate-45" />
                                Salir del Sistema
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </>
    );

    return (
        <>
            {/* Overlay para móvil - con swipe detector */}
            <AnimatePresence>
                {isMobile && mobileOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
                        style={{ touchAction: 'none' }}
                        onClick={() => setMobileOpen(false)}
                        onTouchMove={(e: React.TouchEvent) => e.preventDefault()}
                    />
                )}
            </AnimatePresence>

            {/* Sidebar */}
            {isMobile ? (
                <AnimatePresence>
                    {mobileOpen && (
                        <motion.div
                            initial={{ x: '-100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '-100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            drag="x"
                            dragConstraints={{ left: -256, right: 0 }}
                            dragElastic={0.1}
                            onDragEnd={handleSidebarDragEnd}
                            className={cn(
                                "fixed z-50 left-0 top-0 flex h-screen flex-col text-white shadow-2xl w-64",
                                "bg-gradient-to-b from-emerald-500 via-emerald-500 to-emerald-500"
                            )}
                        >
                            {sidebarContent}
                        </motion.div>
                    )}
                </AnimatePresence>
            ) : (
                <div
                    className={cn(
                        "flex h-screen flex-col text-white shadow-2xl transition-all duration-300 ease-in-out",
                        // Gradiente verde pastel (RESTAURADO)
                        "bg-gradient-to-b from-emerald-500 via-emerald-500 to-emerald-500",
                        effectiveCollapsed ? "w-16" : "w-64",
                        "relative hidden md:flex"
                    )}
                >
                    {/* Logo y título */}
                    <div className={cn(
                        "flex items-center border-b border-emerald-500/30 transition-all duration-300",
                        effectiveCollapsed ? "h-20 justify-center p-2" : "h-24 justify-start p-4 gap-3 ml-2"
                    )}>
                        <div className="flex-shrink-0">
                            <img
                                src={cooperativa.logo || '/logo.png'}
                                alt={cooperativa.nombreCorto || 'Logo'}
                                onError={(e: React.SyntheticEvent<HTMLImageElement>) => { e.currentTarget.src = '/logo.png'; }}
                                className={cn(
                                    "object-contain rounded-full bg-white shadow-lg transition-all duration-300",
                                    effectiveCollapsed ? "h-10 w-10 p-0.5" : "h-12 w-12 p-1"
                                )}
                            />
                        </div>
                        {!effectiveCollapsed && (
                            <div className="flex flex-col min-w-0">
                                <span className="text-sm font-bold text-white truncate">{cooperativa.nombreCorto || cooperativa.nombre || "Cooperativa"}</span>
                                <span className="text-xs text-emerald-200/80">{cooperativa.eslogan || "Sistema de Asambleas"}</span>
                            </div>
                        )}
                    </div>

                    {/* Navegación */}
                    <nav data-tour={isMobile && !mobileOpen ? undefined : "sidebar-panel"} className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
                        {(() => {
                            const isPowerUser = user?.rol === "SUPER_ADMIN" || user?.rol === "SUPER_ADMIN_VISUAL" || user?.rol === "DIRECTIVO";

                            // Si no es admin, aplanamos los submenús para que vea iconos directos
                            let itemsToRender: any[] = [];
                            if (isPowerUser) {
                                itemsToRender = menuItems;
                            } else {
                                menuItems.forEach(item => {
                                    if (item.submenu) {
                                        itemsToRender.push(...item.submenu);
                                    } else {
                                        itemsToRender.push(item);
                                    }
                                });
                            }

                            return itemsToRender.filter(item => hasPermission(item.id)).map((item) => {
                                const filteredSubmenu = (item.submenu || []).filter((sub: any) => hasPermission(sub.id));
                                const hasVisibleSubmenu = filteredSubmenu.length > 0;

                                if (isPowerUser && !hasVisibleSubmenu && item.href === '#') return null;

                                const isActive = pathname === item.href || (item.href !== '#' && pathname.startsWith(item.href + '/')) ||
                                    (hasVisibleSubmenu && filteredSubmenu.some((sub: any) => pathname === sub.href));

                                const isExpanded = expandedMenu === item.id;
                                const isHovered = hoveredMenu === item.id;

                                // Si no tiene submenú o no somos PowerUser
                                if (!hasVisibleSubmenu || !isPowerUser) {
                                    return (
                                        <div
                                            key={item.id}
                                            className="relative"
                                            onMouseEnter={() => effectiveCollapsed && setHoveredMenu(item.id)}
                                            onMouseLeave={() => effectiveCollapsed && setHoveredMenu(null)}
                                        >
                                            <Link
                                                href={item.href}
                                                className={cn(
                                                    "group flex items-center rounded-xl font-bold transition-all duration-200",
                                                    effectiveCollapsed ? "justify-center px-2 py-3" : "px-3 py-2.5",
                                                    isActive
                                                        ? "bg-white text-emerald-800 shadow-lg"
                                                        : "text-emerald-50 hover:bg-white/10 hover:text-white"
                                                )}
                                            >
                                                <item.icon className={cn(
                                                    "h-5 w-5 flex-shrink-0 transition-colors",
                                                    effectiveCollapsed ? "" : "mr-3",
                                                    isActive ? "text-white" : "text-emerald-200 group-hover:text-white"
                                                )} />
                                                {!effectiveCollapsed && <span className="text-sm truncate">{item.name}</span>}
                                            </Link>

                                            {/* TOOLTIP SIMPLE - DISEÑO PREMIUM */}
                                            <AnimatePresence>
                                                {effectiveCollapsed && isHovered && (
                                                    <motion.div
                                                        initial={{ opacity: 0, x: 10, scale: 0.95 }}
                                                        animate={{ opacity: 1, x: 0, scale: 1 }}
                                                        exit={{ opacity: 0, x: 5 }}
                                                        className="fixed left-16 ml-3 px-3 py-1.5 bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-xl z-[100] whitespace-nowrap border border-slate-700/50"
                                                    >
                                                        <div className="absolute left-[-4px] top-1/2 -translate-y-1/2 w-2 h-2 bg-slate-800 rotate-45 border-l border-b border-slate-700/50" />
                                                        {item.name}
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    );
                                }

                                // Renderizar con Submenú (Grupos)
                                return (
                                    <div
                                        key={item.id}
                                        className="relative"
                                        onMouseEnter={() => effectiveCollapsed && setHoveredMenu(item.id)}
                                        onMouseLeave={() => effectiveCollapsed && setHoveredMenu(null)}
                                    >
                                        <button
                                            onClick={() => {
                                                if (effectiveCollapsed && hasVisibleSubmenu) {
                                                    router.push(filteredSubmenu[0].href);
                                                } else {
                                                    setExpandedMenu(isExpanded ? null : item.id);
                                                }
                                            }}
                                            className={cn(
                                                "group flex items-center w-full rounded-xl font-medium transition-all duration-200",
                                                effectiveCollapsed ? "justify-center px-2 py-3" : "px-3 py-2.5",
                                                (isActive)
                                                    ? "text-white"
                                                    : "text-emerald-100 hover:bg-white/10 hover:text-white border border-transparent hover:border-white/5"
                                            )}
                                        >
                                            <item.icon className={cn(
                                                "h-5 w-5 flex-shrink-0 transition-transform duration-300 group-hover:scale-110",
                                                effectiveCollapsed ? "" : "mr-3",
                                                isActive ? "text-white" : "text-emerald-200 group-hover:text-white"
                                            )} />
                                            {!effectiveCollapsed && (
                                                <>
                                                    <span className="text-sm truncate flex-1 text-left font-bold">{item.name}</span>
                                                    <ChevronDown className={cn(
                                                        "h-4 w-4 transition-transform duration-200 text-emerald-300",
                                                        isExpanded ? "rotate-180" : ""
                                                    )} />
                                                </>
                                            )}
                                        </button>

                                        {!effectiveCollapsed && isExpanded && (
                                            <div className="mt-1 ml-4 space-y-1 border-l-2 border-emerald-500/30 pl-3">
                                                {filteredSubmenu.map((sub: any) => {
                                                    const isSubActive = pathname === sub.href;
                                                    return (
                                                        <Link
                                                            key={sub.id}
                                                            href={sub.href}
                                                            className={cn(
                                                                "group flex items-center rounded-lg px-3 py-2 text-sm font-bold transition-all duration-200",
                                                                isSubActive
                                                                    ? "bg-white text-emerald-800 shadow-sm"
                                                                    : "text-emerald-50 hover:bg-white/10 hover:text-white"
                                                            )}
                                                        >
                                                            <sub.icon className={cn(
                                                                "h-4 w-4 mr-2",
                                                                isSubActive ? "text-white" : "text-emerald-300"
                                                            )} />
                                                            {sub.name}
                                                        </Link>
                                                    );
                                                })}
                                            </div>
                                        )}

                                        {/* TOOLTIP SUBMENÚ - DISEÑO PREMIUM & COMPACTO */}
                                        <AnimatePresence>
                                            {effectiveCollapsed && isHovered && (
                                                <motion.div
                                                    initial={{ opacity: 0, x: 10, scale: 0.95 }}
                                                    animate={{ opacity: 1, x: 0, scale: 1 }}
                                                    exit={{ opacity: 0, x: 10, scale: 0.95 }}
                                                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                                                    className="fixed left-[72px] w-52 bg-slate-800 rounded-xl shadow-xl z-[100] border border-slate-700/50 overflow-hidden"
                                                >
                                                    <div className="absolute left-[-5px] top-6 w-2.5 h-2.5 bg-slate-800 rotate-45 border-l border-b border-slate-700/50" />
                                                    <div className="px-4 py-2 bg-slate-900/50 border-b border-slate-700/50">
                                                        <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">{item.name}</div>
                                                    </div>
                                                    <div className="p-1.5 space-y-0.5">
                                                        {filteredSubmenu.map((sub: any) => {
                                                            const isSubActive = pathname === sub.href;
                                                            return (
                                                                <Link
                                                                    key={sub.id}
                                                                    href={sub.href}
                                                                    className={cn(
                                                                        "block px-3 py-2 text-xs font-medium rounded-lg transition-colors",
                                                                        isSubActive
                                                                            ? "bg-emerald-500 text-white shadow-sm"
                                                                            : "text-slate-300 hover:bg-white/5 hover:text-white"
                                                                    )}
                                                                >
                                                                    {sub.name}
                                                                </Link>
                                                            );
                                                        })}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                );
                            });
                        })()}
                    </nav>

                    {/* Botón colapsar (solo desktop) */}
                    {!isMobile && (
                        <div className="px-2 py-2 border-t border-emerald-500/30">
                            <div
                                className="relative"
                                onMouseEnter={() => effectiveCollapsed && setHoveredMenu("collapse-btn")}
                                onMouseLeave={() => effectiveCollapsed && setHoveredMenu(null)}
                            >
                                <button
                                    onClick={() => setCollapsed(!collapsed)}
                                    className="flex w-full items-center justify-center rounded-xl px-3 py-2.5 text-emerald-200 hover:bg-white/10 hover:text-white transition-all shadow-sm"
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

                                <AnimatePresence>
                                    {effectiveCollapsed && hoveredMenu === "collapse-btn" && (
                                        <motion.div
                                            initial={{ opacity: 0, x: 10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: 10 }}
                                            className="fixed left-16 ml-3 px-3 py-1.5 bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-xl z-[100] whitespace-nowrap border border-slate-700/50"
                                        >
                                            <div className="absolute left-[-4px] top-1/2 -translate-y-1/2 w-2 h-2 bg-slate-800 rotate-45 border-l border-b border-slate-700/50" />
                                            Expandir menú
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    )}

                    {/* Cerrar sesión */}
                    <div className="border-t border-emerald-500/30 p-2">
                        <div
                            className="relative"
                            onMouseEnter={() => effectiveCollapsed && setHoveredMenu("logout-btn")}
                            onMouseLeave={() => effectiveCollapsed && setHoveredMenu(null)}
                        >
                            <button
                                onClick={handleLogout}
                                className={cn(
                                    "flex w-full items-center rounded-xl text-emerald-200 hover:bg-red-500/20 hover:text-red-300 transition-all",
                                    effectiveCollapsed ? "justify-center px-2 py-3" : "px-3 py-2.5"
                                )}
                            >
                                <LogOut className={cn("h-5 w-5 flex-shrink-0", effectiveCollapsed ? "" : "mr-3")} />
                                {!effectiveCollapsed && <span className="text-sm font-medium">Cerrar Sesión</span>}
                            </button>

                            <AnimatePresence>
                                {effectiveCollapsed && hoveredMenu === "logout-btn" && (
                                    <motion.div
                                        initial={{ opacity: 0, x: 10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 10 }}
                                        className="fixed left-16 ml-3 px-3 py-1.5 bg-red-900 text-white text-xs font-semibold rounded-lg shadow-xl z-[100] whitespace-nowrap border border-red-800/50"
                                    >
                                        <div className="absolute left-[-4px] top-1/2 -translate-y-1/2 w-2 h-2 bg-red-900 rotate-45 border-l border-b border-red-800/50" />
                                        Salir del Sistema
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                    <div className="h-20 flex-shrink-0" />
                </div>
            )}
        </>
    );
}
