'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users,
    Briefcase,
    Download,
    Search,
    Shield,
    UserCheck,
    FileText,
    Loader2,
    ChevronDown,
    ChevronUp,
    CheckCircle,
    User,
    Calendar,
    UserPlus,
    FileSpreadsheet
} from 'lucide-react';
import axios from 'axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Operador {
    id: number;
    idUsuario: number;
    nombre: string;
    responsable: string;
    responsableUser: string;
    activa: boolean;
    total: number;
    idListaReal?: number;
}

interface SocioAsignado {
    id: number;
    cedula: string;
    nombreCompleto: string;
    numeroSocio: string;
    fechaAsignacion: string;
    fechaHoraIngreso: string | null;
    condicion: string;
    esVyV: boolean;
    asignadoPor: string;
    origen?: string;
}

interface ListaDetalle {
    lista?: {
        id: number;
        nombre: string;
        responsable: string;
        responsableUser: string;
    };
    usuario?: {
        id: number;
        nombre: string;
        username: string;
    };
    socios: SocioAsignado[];
    stats: {
        total: number;
        vyv: number;
        soloVoz: number;
    };
}

export default function ReporteOperadoresPage() {
    const [operadores, setOperadores] = useState<Operador[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedOperador, setSelectedOperador] = useState<Operador | null>(null);
    const [listaDetalle, setListaDetalle] = useState<ListaDetalle | null>(null);
    const [loadingDetalle, setLoadingDetalle] = useState(false);

    useEffect(() => {
        loadOperadores();
    }, []);

    const loadOperadores = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/api/asignaciones/admin/responsables', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setOperadores(res.data || []);
        } catch (error) {
            console.error('Error loading operadores:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadListaDetalle = async (operador: Operador) => {
        setLoadingDetalle(true);
        try {
            const token = localStorage.getItem('token');
            // Usar endpoint unificado de detalle
            const userId = operador.idUsuario || operador.id;
            const res = await axios.get(`/api/asignaciones/admin/usuario/${userId}/detalle-completo`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setListaDetalle(res.data);
        } catch (error) {
            console.error('Error loading lista detalle:', error);
            setListaDetalle(null);
        } finally {
            setLoadingDetalle(false);
        }
    };

    const handleSelectOperador = (operador: Operador) => {
        if (selectedOperador?.id === operador.id) {
            setSelectedOperador(null);
            setListaDetalle(null);
        } else {
            setSelectedOperador(operador);
            loadListaDetalle(operador);
        }
    };

    const filteredOperadores = operadores.filter(f =>
        f.responsable?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.responsableUser?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.nombre?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleExportExcel = async () => {
        if (!listaDetalle) return;

        // Crear CSV manualmente
        const headers = ['#', 'NRO SOCIO', 'CÉDULA', 'SOCIO', 'FECHA/HORA LISTA', 'FECHA/HORA INGRESO', 'CONDICIÓN', 'ORIGEN'];
        const rows = listaDetalle.socios.map((s, idx) => [
            String(idx + 1),
            s.numeroSocio,
            s.cedula,
            s.nombreCompleto,
            formatDate(s.fechaAsignacion),
            formatDate(s.fechaHoraIngreso || ''),
            s.condicion,
            s.origen || 'Asignación'
        ]);

        const opNombre = listaDetalle.usuario?.nombre || listaDetalle.lista?.responsable || 'Desconocido';
        const opUser = listaDetalle.usuario?.username || listaDetalle.lista?.responsableUser || 'user';

        const csvContent = [
            `REPORTE DE ASIGNACIONES/REGISTROS - ${opNombre}`,
            `Total: ${listaDetalle.stats.total} | Voz y Voto: ${listaDetalle.stats.vyv} | Solo Voz: ${listaDetalle.stats.soloVoz}`,
            `Usuario: @${opUser}`,
            '',
            headers.join(','),
            ...rows.map(r => r.join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `operadores_report_${opUser}_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleExportPDF = async () => {
        if (!listaDetalle) return;

        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const now = new Date();
        const fechaHora = now.toLocaleString('es-PY', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        });

        const opNombre = listaDetalle.usuario?.nombre || listaDetalle.lista?.responsable || 'Desconocido';
        const opUser = listaDetalle.usuario?.username || listaDetalle.lista?.responsableUser || 'user';

        // ===== HEADER PREMIUM CON GRADIENTE SIMULADO =====
        // Barra superior principal (teal oscuro)
        doc.setFillColor(17, 94, 89); // teal-800
        doc.rect(0, 0, pageWidth, 10, 'F');
        // Barra principal (teal)
        doc.setFillColor(13, 148, 136); // teal-500
        doc.rect(0, 10, pageWidth, 30, 'F');
        // Línea decorativa dorada
        doc.setFillColor(245, 158, 11); // amber-500
        doc.rect(0, 40, pageWidth, 2, 'F');

        // Intentar cargar logo
        const logoUrl = '/logo.png';
        try {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.src = logoUrl;
            await new Promise<void>((resolve) => {
                img.onload = () => {
                    try {
                        doc.addImage(img, 'PNG', 15, 12, 26, 26);
                    } catch (e) {
                        console.error('Error adding image to PDF', e);
                    }
                    resolve();
                };
                img.onerror = () => resolve();
            });
        } catch (e) {
            console.error('Error loading logo', e);
        }

        // Títulos Header
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('COOPERATIVA MULTIACTIVA LAMBARÉ LTDA.', 50, 22);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('SIGA - Sistema Integral de Gestión de Asamblea', 50, 28);
        doc.setFontSize(8);
        doc.text('Documento Oficial', 50, 33);

        doc.setFontSize(9);
        doc.text(`Fecha: ${fechaHora} a. m.`, pageWidth - 15, 33, { align: 'right' });

        // ===== TÍTULO Y DATOS DEL OPERADOR =====
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(13, 148, 136); // teal-500
        doc.text('REPORTE OFICIAL DE ASIGNACIONES/REGISTROS', 14, 55);

        doc.setDrawColor(13, 148, 136);
        doc.setLineWidth(0.5);
        doc.line(14, 58, 130, 58);

        // Tarjeta de Operador
        doc.setFillColor(240, 253, 250); // teal-50
        doc.roundedRect(14, 64, pageWidth - 28, 28, 3, 3, 'F');
        doc.setDrawColor(153, 246, 228); // teal-200
        doc.setLineWidth(0.3);
        doc.roundedRect(14, 64, pageWidth - 28, 28, 3, 3, 'S');

        doc.setTextColor(100, 116, 139);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text('OPERADOR RESPONSABLE:', 20, 73);
        doc.setTextColor(17, 94, 89);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(opNombre.toUpperCase(), 20, 82);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text(`Usuario: @${opUser}`, 20, 88);

        // Stats con porcentajes y badges
        const total = listaDetalle.stats.total;
        const vyv = listaDetalle.stats.vyv;
        const soloVoz = listaDetalle.stats.soloVoz;
        const porcVyV = total > 0 ? Math.round((vyv / total) * 100) : 0;
        const porcSoloVoz = total > 0 ? Math.round((soloVoz / total) * 100) : 0;

        const statsX = pageWidth - 110;

        // TOTAL badge
        doc.setFillColor(13, 148, 136);
        doc.roundedRect(statsX, 68, 30, 20, 2, 2, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.text('TOTAL', statsX + 7, 74);
        doc.setFontSize(14);
        doc.text(String(total), statsX + 10, 84);

        // VOZ Y VOTO badge
        doc.setFillColor(4, 120, 87);
        doc.roundedRect(statsX + 35, 68, 30, 20, 2, 2, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(6);
        doc.text('VOZ Y VOTO', statsX + 38, 74);
        doc.setFontSize(11);
        doc.text(`${vyv} (${porcVyV}%)`, statsX + 38, 84);

        // SOLO VOZ badge
        doc.setFillColor(180, 83, 9);
        doc.roundedRect(statsX + 70, 68, 30, 20, 2, 2, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(6);
        doc.text('SOLO VOZ', statsX + 75, 74);
        doc.setFontSize(11);
        doc.text(`${soloVoz} (${porcSoloVoz}%)`, statsX + 74, 84);

        // ===== TABLA PREMIUM =====
        const formatFecha = (fecha: string) => {
            if (!fecha) return '-';
            const d = new Date(fecha);
            return d.toLocaleString('es-PY', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
        };

        const tableData = listaDetalle.socios.map((s, idx) => [
            String(idx + 1),
            s.numeroSocio,
            s.cedula,
            s.nombreCompleto,
            formatFecha(s.fechaAsignacion),
            formatFecha(s.fechaHoraIngreso || ''),
            s.condicion,
            s.origen || 'Asignación'
        ]);

        autoTable(doc, {
            startY: 98,
            head: [['#', 'NRO', 'CÉDULA', 'SOCIO', 'FECHA/HORA REF', 'FECHA/HORA INGRESO', 'CONDICIÓN', 'ORIGEN']],
            body: tableData,
            theme: 'grid',
            styles: {
                fontSize: 6,
                cellPadding: 2,
                lineColor: [226, 232, 240],
                lineWidth: 0.1,
            },
            headStyles: {
                fillColor: [17, 94, 89],
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                fontSize: 7,
                halign: 'center',
            },
            bodyStyles: {
                textColor: [51, 65, 85],
            },
            alternateRowStyles: {
                fillColor: [248, 250, 252],
            },
            columnStyles: {
                0: { cellWidth: 8, halign: 'center', fontStyle: 'bold' },
                1: { cellWidth: 14, halign: 'center' },
                2: { cellWidth: 20 },
                3: { cellWidth: 'auto' },
                4: { cellWidth: 28, halign: 'center', fontSize: 5 },
                5: { cellWidth: 28, halign: 'center', fontSize: 5 },
                6: { cellWidth: 20, halign: 'center', fontStyle: 'bold' },
                7: { cellWidth: 20, halign: 'center', fontSize: 6 }
            },
            didParseCell: (data) => {
                // Estilo para columna #
                if (data.section === 'body' && data.column.index === 0) {
                    data.cell.styles.fillColor = [240, 253, 250];
                    data.cell.styles.textColor = [13, 148, 136];
                }
                // Colores para condición
                if (data.section === 'body' && data.column.index === 6) {
                    const condicion = data.cell.raw as string;
                    if (condicion === 'VOZ Y VOTO') {
                        data.cell.styles.fillColor = [209, 250, 229];
                        data.cell.styles.textColor = [4, 120, 87];
                    } else {
                        data.cell.styles.fillColor = [254, 243, 199];
                        data.cell.styles.textColor = [180, 83, 9];
                    }
                }
            },
            margin: { left: 14, right: 14 },
        });

        // ===== PIE DE PÁGINA PREMIUM =====
        const finalY = (doc as any).lastAutoTable.finalY + 8;

        // Solo agregar pie si hay espacio
        if (finalY < pageHeight - 35) {
            // Línea separadora
            doc.setDrawColor(226, 232, 240);
            doc.setLineWidth(0.3);
            doc.line(14, pageHeight - 25, pageWidth - 14, pageHeight - 25);

            // Información de generación
            doc.setFontSize(8);
            doc.setTextColor(148, 163, 184);

            doc.text('Documento generado automáticamente por SIGA - Sistema Integral de Gestión de Asamblea', 14, pageHeight - 20);
            doc.text(`Operador: ${opNombre}`, 14, pageHeight - 16);
            doc.text(`Generado el: ${fechaHora} a. m.`, 14, pageHeight - 12);
            doc.text(`| Usuario: @${opUser}`, 120, pageHeight - 16);

            // Marca SIGA
            doc.setFillColor(65, 140, 120); // tono suave similar al logo
            doc.roundedRect(pageWidth - 30, pageHeight - 18, 16, 8, 2, 2, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');
            doc.text('SIGA', pageWidth - 26, pageHeight - 12);
        }

        doc.save(`Reporte_Operadores_${opUser}_${new Date().toISOString().split('T')[0]}.pdf`);
    };
    const formatDate = (dateStr: string) => {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        return date.toLocaleString('es-PY', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    // Estadísticas globales
    const totalAsignados = operadores.reduce((sum, f) => sum + (f.total || 0), 0);
    const operadoresConAsignaciones = operadores.filter(f => f.total > 0).length;

    return (
        <div className="mx-auto space-y-6" style={{ maxWidth: 'clamp(320px, 98vw, 1400px)', padding: 'clamp(0.5rem, 2vw, 1.5rem)' }}>
            {/* Header Premium */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-teal-500 via-emerald-500 to-teal-500 p-5 sm:p-8 shadow-2xl"
            >
                {/* Formas decorativas */}
                <div className="absolute -left-10 -top-10 h-[150px] w-[150px] sm:h-[200px] sm:w-[200px] rounded-[60%_40%_70%_30%/50%_60%_40%_50%] bg-teal-500/30 blur-2xl"></div>
                <div className="absolute -right-10 -bottom-10 h-[120px] w-[120px] sm:h-[180px] sm:w-[180px] rounded-[40%_60%_30%_70%/60%_40%_70%_30%] bg-emerald-400/30 blur-2xl"></div>

                <div className="relative z-10">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 rounded-full mb-3">
                                <Briefcase className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
                                <span className="text-white font-bold text-[10px] sm:text-xs uppercase tracking-widest">Reporte Operadores</span>
                            </div>
                            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight">
                                Asignaciones por <span className="text-emerald-100">Operador</span>
                            </h1>
                            <p className="text-emerald-100/80 text-sm sm:text-base mt-2 max-w-xl">
                                Busca un operador para ver los socios asignados a su lista.
                            </p>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Stats Cards */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4"
            >
                <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 border border-slate-100 shadow-sm hover:shadow-lg transition-shadow">
                    <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                        <div className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-teal-100">
                            <Users className="h-4 w-4 sm:h-5 sm:w-5 text-teal-500" />
                        </div>
                        <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Operadores</span>
                    </div>
                    <p className="text-2xl sm:text-3xl font-black text-teal-500">{operadores.length}</p>
                </div>
                <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 border border-slate-100 shadow-sm hover:shadow-lg transition-shadow">
                    <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                        <div className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-emerald-100">
                            <UserCheck className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-500" />
                        </div>
                        <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Con Asignaciones</span>
                    </div>
                    <p className="text-2xl sm:text-3xl font-black text-emerald-500">{operadoresConAsignaciones}</p>
                </div>
                <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 border border-slate-100 shadow-sm hover:shadow-lg transition-shadow col-span-2 lg:col-span-1">
                    <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                        <div className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-blue-100">
                            <UserPlus className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                        </div>
                        <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Total Asignados</span>
                    </div>
                    <p className="text-2xl sm:text-3xl font-black text-blue-600">{totalAsignados}</p>
                </div>
            </motion.div>

            {/* Search & List */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-2xl sm:rounded-3xl shadow-xl border border-slate-100 overflow-hidden"
            >
                {/* Search Bar */}
                <div className="p-4 sm:p-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
                    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                        <div className="relative flex-1 max-w-md w-full">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Buscar por nombre de operador..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-11 sm:pl-12 pr-4 py-3 sm:py-3.5 bg-white border border-slate-200 rounded-xl text-sm sm:text-base font-medium focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all shadow-sm"
                            />
                        </div>
                        {selectedOperador && listaDetalle && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="flex items-center gap-2"
                            >
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={handleExportPDF}
                                    className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-rose-200"
                                >
                                    <FileText className="h-4 w-4" />
                                    PDF
                                </motion.button>
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={handleExportExcel}
                                    className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-emerald-200"
                                >
                                    <FileSpreadsheet className="h-4 w-4" />
                                    CSV
                                </motion.button>
                            </motion.div>
                        )}
                    </div>
                </div>

                {/* Lista de Operadores */}
                {loading ? (
                    <div className="p-12 text-center">
                        <Loader2 className="h-10 w-10 text-teal-500 animate-spin mx-auto mb-4" />
                        <p className="text-slate-500 font-medium">Cargando operadores...</p>
                    </div>
                ) : filteredOperadores.length === 0 ? (
                    <div className="p-12 text-center">
                        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Users className="h-10 w-10 text-slate-300" />
                        </div>
                        <p className="text-slate-500 font-medium text-lg">No se encontraron operadores</p>
                        <p className="text-slate-400 text-sm mt-1">Intenta con otro término de búsqueda</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {filteredOperadores.map((func) => (
                            <div key={func.id}>
                                {/* Fila del operador */}
                                <motion.div
                                    onClick={() => handleSelectOperador(func)}
                                    className={`p-4 sm:p-5 cursor-pointer transition-all hover:bg-slate-50 ${selectedOperador?.id === func.id ? 'bg-teal-50 border-l-4 border-teal-500' : ''
                                        }`}
                                    whileHover={{ x: 4 }}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-teal-200">
                                                {func.responsable?.charAt(0) || 'O'}
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-800 text-base sm:text-lg">{func.responsable}</p>
                                                <p className="text-sm text-slate-500">@{func.responsableUser}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="text-right">
                                                <p className="text-2xl font-black text-teal-500">{func.total}</p>
                                                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Asignados</p>
                                            </div>
                                            <div className={`p-2 rounded-xl transition-all ${selectedOperador?.id === func.id ? 'bg-teal-500 text-white' : 'bg-slate-100 text-slate-400'
                                                }`}>
                                                {selectedOperador?.id === func.id ? (
                                                    <ChevronUp className="h-5 w-5" />
                                                ) : (
                                                    <ChevronDown className="h-5 w-5" />
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>

                                {/* Detalle expandido */}
                                <AnimatePresence>
                                    {selectedOperador?.id === func.id && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.3 }}
                                            className="overflow-hidden bg-gradient-to-br from-slate-50 to-teal-50/30"
                                        >
                                            {loadingDetalle ? (
                                                <div className="p-8 text-center">
                                                    <Loader2 className="h-8 w-8 text-teal-500 animate-spin mx-auto mb-3" />
                                                    <p className="text-slate-500 text-sm">Cargando socios asignados...</p>
                                                </div>
                                            ) : !listaDetalle || listaDetalle.socios.length === 0 ? (
                                                <div className="p-8 text-center">
                                                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                                        <Users className="h-8 w-8 text-slate-300" />
                                                    </div>
                                                    <p className="text-slate-500 font-medium">Sin socios asignados</p>
                                                    <p className="text-slate-400 text-sm mt-1">Este operador no tiene socios en su lista</p>
                                                </div>
                                            ) : (
                                                <div className="p-4 sm:p-6">
                                                    {/* Stats del operador */}
                                                    <div className="grid grid-cols-3 gap-3 mb-5">
                                                        <div className="bg-white rounded-xl p-3 text-center shadow-sm border border-slate-100">
                                                            <p className="text-xl font-black text-teal-500">{listaDetalle.stats.total}</p>
                                                            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Total</p>
                                                        </div>
                                                        <div className="bg-white rounded-xl p-3 text-center shadow-sm border border-emerald-100">
                                                            <p className="text-xl font-black text-emerald-500">{listaDetalle.stats.vyv}</p>
                                                            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Voz y Voto</p>
                                                        </div>
                                                        <div className="bg-white rounded-xl p-3 text-center shadow-sm border border-amber-100">
                                                            <p className="text-xl font-black text-amber-600">{listaDetalle.stats.soloVoz}</p>
                                                            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Solo Voz</p>
                                                        </div>
                                                    </div>

                                                    {/* Tabla de socios */}
                                                    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                                                        <div className="overflow-x-auto">
                                                            <table className="w-full min-w-[600px]">
                                                                <thead className="bg-gradient-to-r from-teal-500 to-emerald-500 text-white">
                                                                    <tr>
                                                                        <th className="px-2 py-2 text-center text-xs font-bold">#</th>
                                                                        <th className="px-2 py-2 text-center text-xs font-bold">NRO</th>
                                                                        <th className="px-2 py-2 text-left text-xs font-bold">CÉDULA</th>
                                                                        <th className="px-2 py-2 text-left text-xs font-bold">SOCIO</th>
                                                                        <th className="px-2 py-2 text-center text-xs font-bold">FECHA/HORA LISTA</th>
                                                                        <th className="px-2 py-2 text-center text-xs font-bold">FECHA/HORA INGRESO</th>
                                                                        <th className="px-2 py-2 text-center text-xs font-bold">CONDICIÓN</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-slate-100">
                                                                    {listaDetalle.socios.map((socio, idx) => (
                                                                        <motion.tr
                                                                            key={socio.id}
                                                                            initial={{ opacity: 0, x: -10 }}
                                                                            animate={{ opacity: 1, x: 0 }}
                                                                            transition={{ delay: idx * 0.02 }}
                                                                            className={`${socio.esVyV ? 'bg-emerald-50/50' : 'bg-amber-50/50'} hover:bg-slate-50 transition-colors`}
                                                                        >
                                                                            <td className="px-2 py-2 text-sm text-center font-bold text-teal-500">{idx + 1}</td>
                                                                            <td className="px-2 py-2 text-sm text-center font-bold text-teal-500">{socio.numeroSocio}</td>
                                                                            <td className="px-2 py-2">
                                                                                <span className="font-mono text-sm text-slate-700">{socio.cedula}</span>
                                                                            </td>
                                                                            <td className="px-2 py-2">
                                                                                <span className="font-bold text-slate-800 text-sm">{socio.nombreCompleto}</span>
                                                                            </td>
                                                                            <td className="px-2 py-2 text-center">
                                                                                <span className="text-xs font-mono text-slate-600">{formatDate(socio.fechaAsignacion)}</span>
                                                                            </td>
                                                                            <td className="px-2 py-2 text-center">
                                                                                <span className="text-xs font-mono text-slate-600">{formatDate(socio.fechaHoraIngreso || '')}</span>
                                                                            </td>
                                                                            <td className="px-2 py-2 text-center">
                                                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider ${socio.esVyV
                                                                                    ? 'bg-emerald-100 text-teal-500 border border-emerald-200'
                                                                                    : 'bg-amber-100 text-amber-700 border border-amber-200'
                                                                                    }`}>
                                                                                    {socio.condicion}
                                                                                </span>
                                                                            </td>
                                                                        </motion.tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        ))}
                    </div>
                )}

                {/* Footer */}
                {filteredOperadores.length > 0 && (
                    <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                        <p className="text-sm text-slate-500">
                            Mostrando <span className="font-bold text-slate-700">{filteredOperadores.length}</span> de <span className="font-bold text-slate-700">{operadores.length}</span> operadores
                        </p>
                        <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-slate-400" />
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Reporte Asignaciones</span>
                        </div>
                    </div>
                )}
            </motion.div>
        </div>
    );
}
