'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users,
    Briefcase,
    Download,
    Search,
    Clock,
    UserCheck,
    FileText,
    Loader2,
    ChevronDown,
    ChevronUp,
    CheckCircle,
    User,
    FileSpreadsheet
} from 'lucide-react';
import axios from 'axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Operador {
    id: number;
    nombre: string;
    username: string;
    rol: string;
    totalRegistros: number;
    vozYVoto: number;
    soloVoz: number;
}

interface AsistenciaDetalle {
    id: number;
    cedula: string;
    nombreCompleto: string;
    numeroSocio: string;
    fechaHoraLista: string | null;
    fechaHoraIngreso: string;
    condicion: string;
    esVyV: boolean;
}

interface ReporteAsistencia {
    operador: {
        id: number;
        nombre: string;
        username: string;
        rol: string;
    };
    asistencias: AsistenciaDetalle[];
    stats: {
        total: number;
        vyv: number;
        soloVoz: number;
    };
}

export default function ReporteAsistenciaOperadoresPage() {
    const [operadores, setOperadores] = useState<Operador[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedOperador, setSelectedOperador] = useState<Operador | null>(null);
    const [reporteDetalle, setReporteDetalle] = useState<ReporteAsistencia | null>(null);
    const [loadingDetalle, setLoadingDetalle] = useState(false);

    useEffect(() => {
        loadOperadores();
    }, []);

    const loadOperadores = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/api/asistencia/ranking-operadores', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setOperadores(res.data || []);
        } catch (error) {
            console.error('Error loading operadores:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadReporteDetalle = async (operador: Operador) => {
        setLoadingDetalle(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`/api/asistencia/admin/por-operador/${operador.id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setReporteDetalle(res.data);
        } catch (error) {
            console.error('Error loading detalle:', error);
            setReporteDetalle(null);
        } finally {
            setLoadingDetalle(false);
        }
    };

    const handleSelectOperador = (operador: Operador) => {
        if (selectedOperador?.id === operador.id) {
            setSelectedOperador(null);
            setReporteDetalle(null);
        } else {
            setSelectedOperador(operador);
            loadReporteDetalle(operador);
        }
    };

    const filteredOperadores = operadores.filter(o =>
        o.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.username?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalRegistros = operadores.reduce((sum, o) => sum + o.totalRegistros, 0);
    const totalVyV = operadores.reduce((sum, o) => sum + o.vozYVoto, 0);

    const handleExportCSV = () => {
        if (!selectedOperador || !reporteDetalle) return;

        const headers = ['#', 'NRO SOCIO', 'CÉDULA', 'SOCIO', 'FECHA/HORA LISTA', 'FECHA/HORA INGRESO', 'CONDICIÓN'];
        const rows = reporteDetalle.asistencias.map((a, idx) => [
            String(idx + 1),
            a.numeroSocio,
            a.cedula,
            a.nombreCompleto,
            formatFechaHora(a.fechaHoraLista),
            formatFechaHora(a.fechaHoraIngreso),
            a.condicion
        ]);

        const csvContent = [
            `REPORTE DE ASISTENCIA - ${selectedOperador.nombre}`,
            `Total: ${reporteDetalle.stats.total} | Voz y Voto: ${reporteDetalle.stats.vyv} | Solo Voz: ${reporteDetalle.stats.soloVoz}`,
            '',
            headers.join(','),
            ...rows.map(r => r.join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `asistencia_${selectedOperador.username}_${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
    };

    const handleExportPDF = async () => {
        if (!selectedOperador || !reporteDetalle) return;

        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const now = new Date();
        const fechaHora = now.toLocaleString('es-PY');

        // Header
        doc.setFillColor(17, 94, 89);
        doc.rect(0, 0, pageWidth, 10, 'F');
        doc.setFillColor(13, 148, 136);
        doc.rect(0, 10, pageWidth, 30, 'F');
        doc.setFillColor(245, 158, 11);
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
                        doc.addImage(img, 'PNG', 10, 8, 28, 28);
                    } catch (e) {
                        doc.setFillColor(255, 255, 255);
                        doc.circle(23, 25, 12, 'F');
                        doc.setTextColor(13, 148, 136);
                        doc.setFontSize(12);
                        doc.setFont('helvetica', 'bold');
                        doc.text('CR', 17, 28);
                    }
                    resolve();
                };
                img.onerror = () => {
                    doc.setFillColor(255, 255, 255);
                    doc.circle(23, 25, 12, 'F');
                    doc.setTextColor(13, 148, 136);
                    doc.setFontSize(12);
                    doc.setFont('helvetica', 'bold');
                    doc.text('CR', 17, 28);
                    resolve();
                };
                setTimeout(() => resolve(), 1500);
            });
        } catch (e) {
            doc.setFillColor(255, 255, 255);
            doc.circle(23, 25, 12, 'F');
            doc.setTextColor(13, 148, 136);
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text('CR', 17, 28);
        }

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(18);
        doc.text('COOPERATIVA MULTIACTIVA LAMBARÉ LTDA.', 42, 22);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text('SIGA - Reporte de Asistencia', 42, 30);
        doc.setFontSize(8);
        doc.text(`Fecha: ${fechaHora}`, pageWidth - 14, 36, { align: 'right' });

        // Título
        doc.setTextColor(17, 94, 89);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('REPORTE OFICIAL DE ASISTENCIA', 14, 55);
        doc.setDrawColor(13, 148, 136);
        doc.setLineWidth(0.8);
        doc.line(14, 59, 120, 59);

        // Info operador
        doc.setFillColor(240, 253, 250);
        doc.roundedRect(14, 64, pageWidth - 28, 28, 3, 3, 'F');

        doc.setTextColor(100, 116, 139);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text('OPERADOR:', 20, 73);
        doc.setTextColor(17, 94, 89);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(selectedOperador.nombre.toUpperCase(), 20, 82);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text(`Usuario: @${selectedOperador.username}`, 20, 88);

        // Stats
        const total = reporteDetalle.stats.total;
        const vyv = reporteDetalle.stats.vyv;
        const soloVoz = reporteDetalle.stats.soloVoz;
        const porcVyV = total > 0 ? Math.round((vyv / total) * 100) : 0;
        const porcSoloVoz = total > 0 ? Math.round((soloVoz / total) * 100) : 0;

        const statsX = pageWidth - 115;
        doc.setFillColor(13, 148, 136);
        doc.roundedRect(statsX, 68, 30, 20, 2, 2, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.text('TOTAL', statsX + 7, 74);
        doc.setFontSize(14);
        doc.text(String(total), statsX + 10, 84);

        doc.setFillColor(4, 120, 87);
        doc.roundedRect(statsX + 35, 68, 35, 20, 2, 2, 'F');
        doc.setFontSize(6);
        doc.text('VOZ Y VOTO', statsX + 38, 74);
        doc.setFontSize(11);
        doc.text(`${vyv} (${porcVyV}%)`, statsX + 38, 84);

        doc.setFillColor(180, 83, 9);
        doc.roundedRect(statsX + 75, 68, 35, 20, 2, 2, 'F');
        doc.setFontSize(6);
        doc.text('SOLO VOZ', statsX + 80, 74);
        doc.setFontSize(11);
        doc.text(`${soloVoz} (${porcSoloVoz}%)`, statsX + 80, 84);

        // Tabla
        const tableData = reporteDetalle.asistencias.map((a, idx) => [
            String(idx + 1),
            a.numeroSocio,
            a.cedula,
            a.nombreCompleto,
            formatFechaHora(a.fechaHoraLista),
            formatFechaHora(a.fechaHoraIngreso),
            a.condicion
        ]);

        autoTable(doc, {
            startY: 98,
            head: [['#', 'NRO', 'CÉDULA', 'SOCIO', 'FECHA/HORA LISTA', 'FECHA/HORA INGRESO', 'CONDICIÓN']],
            body: tableData,
            theme: 'grid',
            styles: { fontSize: 6, cellPadding: 2 },
            headStyles: {
                fillColor: [17, 94, 89],
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                halign: 'center'
            },
            columnStyles: {
                0: { cellWidth: 8, halign: 'center' },
                1: { cellWidth: 14, halign: 'center' },
                2: { cellWidth: 20, halign: 'center' },
                3: { cellWidth: 'auto' },
                4: { cellWidth: 32, halign: 'center' },
                5: { cellWidth: 32, halign: 'center' },
                6: { cellWidth: 22, halign: 'center', fontStyle: 'bold' }
            },
            didParseCell: (data) => {
                if (data.section === 'body' && data.column.index === 6) {
                    const cond = data.cell.raw as string;
                    if (cond === 'VOZ Y VOTO') {
                        data.cell.styles.fillColor = [209, 250, 229];
                        data.cell.styles.textColor = [4, 120, 87];
                    } else {
                        data.cell.styles.fillColor = [254, 243, 199];
                        data.cell.styles.textColor = [180, 83, 9];
                    }
                }
            },
            margin: { left: 14, right: 14 }
        });

        // Pie
        const finalY = (doc as any).lastAutoTable.finalY + 10;
        if (finalY < pageHeight - 35) {
            doc.setFillColor(248, 250, 252);
            doc.roundedRect(14, finalY, pageWidth - 28, 18, 3, 3, 'F');
            doc.setFontSize(7);
            doc.setTextColor(100, 116, 139);
            doc.text('Documento generado por SIGA - Sistema Integral de Gestión de Asamblea', 20, finalY + 7);
            doc.text(`Generado el: ${fechaHora}`, 20, finalY + 13);

            doc.setFillColor(13, 148, 136);
            doc.roundedRect(pageWidth - 45, finalY + 2, 25, 14, 2, 2, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.text('SIGA', pageWidth - 40, finalY + 11);
        }

        doc.save(`reporte_asistencia_${selectedOperador.username}_${now.toISOString().slice(0, 10)}.pdf`);
    };

    const formatFechaHora = (fechaHora: string | null) => {
        if (!fechaHora) return '-';
        const date = new Date(fechaHora);
        return date.toLocaleString('es-PY', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        });
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/30 p-4 sm:p-6 lg:p-8 space-y-6">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-r from-teal-500 via-teal-500 to-emerald-500 p-6 sm:p-8 shadow-2xl"
            >
                <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl" />

                <div className="relative z-10">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 rounded-full mb-3">
                                <Clock className="h-4 w-4 text-white" />
                                <span className="text-white font-bold text-xs uppercase tracking-widest">Reporte Asistencia</span>
                            </div>
                            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight">
                                Asistencia por <span className="text-emerald-100">Operador</span>
                            </h1>
                            <p className="text-emerald-100/80 text-sm sm:text-base mt-2">
                                Ver socios que ingresaron a la asamblea registrados por cada operador
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
                className="grid grid-cols-2 lg:grid-cols-3 gap-4"
            >
                <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-lg transition-shadow">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2.5 rounded-xl bg-teal-100">
                            <Users className="h-5 w-5 text-teal-500" />
                        </div>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Operadores</span>
                    </div>
                    <p className="text-3xl font-black text-teal-500">{operadores.length}</p>
                </div>
                <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-lg transition-shadow">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2.5 rounded-xl bg-emerald-100">
                            <UserCheck className="h-5 w-5 text-emerald-500" />
                        </div>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Asistentes</span>
                    </div>
                    <p className="text-3xl font-black text-emerald-500">{totalRegistros}</p>
                </div>
                <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-lg transition-shadow col-span-2 lg:col-span-1">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2.5 rounded-xl bg-blue-100">
                            <CheckCircle className="h-5 w-5 text-blue-600" />
                        </div>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Voz y Voto</span>
                    </div>
                    <p className="text-3xl font-black text-blue-600">{totalVyV}</p>
                </div>
            </motion.div>

            {/* Search & List */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden"
            >
                {/* Search Bar */}
                <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
                    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                        <div className="relative flex-1 max-w-md w-full">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Buscar operador..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all shadow-sm"
                            />
                        </div>
                        {selectedOperador && reporteDetalle && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="flex items-center gap-2"
                            >
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={handleExportPDF}
                                    className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-xl font-bold text-sm shadow-lg"
                                >
                                    <FileText className="h-4 w-4" />
                                    PDF
                                </motion.button>
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={handleExportCSV}
                                    className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-bold text-sm shadow-lg"
                                >
                                    <FileSpreadsheet className="h-4 w-4" />
                                    CSV
                                </motion.button>
                            </motion.div>
                        )}
                    </div>
                </div>

                {/* Lista */}
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
                        <p className="text-slate-500 font-medium">No se encontraron operadores</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {filteredOperadores.map((operador) => (
                            <div key={operador.id}>
                                <motion.div
                                    whileHover={{ backgroundColor: 'rgba(240, 253, 250, 0.5)' }}
                                    onClick={() => handleSelectOperador(operador)}
                                    className="p-4 sm:p-5 cursor-pointer transition-all"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center shadow-lg">
                                                <User className="h-6 w-6 text-white" />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-slate-800">{operador.nombre}</h3>
                                                <p className="text-sm text-slate-500">@{operador.username}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-6">
                                            <div className="text-right hidden sm:block">
                                                <p className="text-2xl font-black text-teal-500">{operador.totalRegistros}</p>
                                                <p className="text-xs text-slate-500">registros</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <span className="px-2 py-1 bg-emerald-100 text-teal-500 rounded-lg text-xs font-bold">
                                                    {operador.vozYVoto} VyV
                                                </span>
                                                <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-lg text-xs font-bold">
                                                    {operador.soloVoz} SV
                                                </span>
                                            </div>
                                            {selectedOperador?.id === operador.id ? (
                                                <ChevronUp className="h-5 w-5 text-slate-400" />
                                            ) : (
                                                <ChevronDown className="h-5 w-5 text-slate-400" />
                                            )}
                                        </div>
                                    </div>
                                </motion.div>

                                {/* Detalle expandido */}
                                <AnimatePresence>
                                    {selectedOperador?.id === operador.id && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="overflow-hidden bg-gradient-to-br from-slate-50 to-teal-50/30 border-t border-slate-100"
                                        >
                                            {loadingDetalle ? (
                                                <div className="p-8 text-center">
                                                    <Loader2 className="h-8 w-8 text-teal-500 animate-spin mx-auto mb-2" />
                                                    <p className="text-slate-500 text-sm">Cargando detalle...</p>
                                                </div>
                                            ) : reporteDetalle ? (
                                                <div className="p-4 sm:p-6">
                                                    {/* Stats */}
                                                    <div className="grid grid-cols-3 gap-3 mb-6">
                                                        <div className="bg-white rounded-xl p-4 text-center shadow-sm">
                                                            <p className="text-2xl font-black text-teal-500">{reporteDetalle.stats.total}</p>
                                                            <p className="text-xs text-slate-500">Total</p>
                                                        </div>
                                                        <div className="bg-emerald-50 rounded-xl p-4 text-center">
                                                            <p className="text-2xl font-black text-emerald-500">{reporteDetalle.stats.vyv}</p>
                                                            <p className="text-xs text-emerald-500">Voz y Voto</p>
                                                        </div>
                                                        <div className="bg-amber-50 rounded-xl p-4 text-center">
                                                            <p className="text-2xl font-black text-amber-600">{reporteDetalle.stats.soloVoz}</p>
                                                            <p className="text-xs text-amber-600">Solo Voz</p>
                                                        </div>
                                                    </div>

                                                    {/* Tabla */}
                                                    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                                                        <div className="overflow-x-auto">
                                                            <table className="w-full">
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
                                                                    {reporteDetalle.asistencias.map((asist, idx) => (
                                                                        <tr key={asist.id} className="hover:bg-slate-50 transition-colors">
                                                                            <td className="px-2 py-2 text-sm text-center font-bold text-teal-500">{idx + 1}</td>
                                                                            <td className="px-2 py-2 text-sm text-center text-slate-600">{asist.numeroSocio}</td>
                                                                            <td className="px-2 py-2 text-sm text-slate-700">{asist.cedula}</td>
                                                                            <td className="px-2 py-2 text-sm font-medium text-slate-800">{asist.nombreCompleto}</td>
                                                                            <td className="px-2 py-2 text-xs text-center font-mono text-slate-600">
                                                                                {formatFechaHora(asist.fechaHoraLista)}
                                                                            </td>
                                                                            <td className="px-2 py-2 text-xs text-center font-mono text-slate-700">
                                                                                {formatFechaHora(asist.fechaHoraIngreso)}
                                                                            </td>
                                                                            <td className="px-2 py-2 text-center">
                                                                                <span className={`px-2 py-1 rounded-lg text-xs font-bold ${asist.esVyV
                                                                                    ? 'bg-emerald-100 text-teal-500'
                                                                                    : 'bg-amber-100 text-amber-700'
                                                                                    }`}>
                                                                                    {asist.condicion}
                                                                                </span>
                                                                            </td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="p-8 text-center">
                                                    <p className="text-slate-500">No hay datos disponibles</p>
                                                </div>
                                            )}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        ))}
                    </div>
                )}
            </motion.div>
        </div>
    );
}
