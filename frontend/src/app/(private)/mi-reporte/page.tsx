'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    ClipboardCheck,
    Download,
    Clock,
    UserCheck,
    FileText,
    Loader2,
    CheckCircle,
    User,
    FileSpreadsheet,
    Calendar,
    Award
} from 'lucide-react';
import axios from 'axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface MiRegistro {
    id: number;
    cedula: string;
    nombreCompleto: string;
    numeroSocio: string;
    fechaHoraLista: string | null;
    fechaHoraIngreso: string;
    condicion: string;
    esVyV: boolean;
}

interface MiReporte {
    usuario: {
        id: number;
        nombre: string;
        username: string;
        rol: string;
    };
    registros: MiRegistro[];
    stats: {
        total: number;
        vyv: number;
        soloVoz: number;
    };
}

export default function MiReportePage() {
    const [reporte, setReporte] = useState<MiReporte | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [coopNombre, setCoopNombre] = useState('Sistema de Asambleas');
    const [coopLogo, setCoopLogo] = useState('/logo.png');

    useEffect(() => {
        loadMiReporte();
        fetch('/api/cooperativa/publica')
            .then(r => r.ok ? r.json() : null)
            .then(data => {
                if (data?.nombre) setCoopNombre(data.nombre);
                if (data?.logo) setCoopLogo(data.logo);
            })
            .catch(() => { });
    }, []);

    const loadMiReporte = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/api/asistencia/mi-reporte', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setReporte(res.data);
        } catch (err: any) {
            console.error('Error loading mi reporte:', err);
            setError(err.response?.data?.error || 'Error al cargar el reporte');
        } finally {
            setLoading(false);
        }
    };

    const formatFechaHora = (fechaHora: string | null) => {
        if (!fechaHora) return '-';
        const date = new Date(fechaHora);
        return date.toLocaleString('es-PY', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        });
    };

    const handleExportCSV = () => {
        if (!reporte) return;

        const headers = ['#', 'NRO SOCIO', 'CÉDULA', 'SOCIO', 'FECHA/HORA LISTA', 'FECHA/HORA INGRESO', 'CONDICIÓN'];
        const rows = reporte.registros.map((r, idx) => [
            String(idx + 1),
            r.numeroSocio,
            r.cedula,
            r.nombreCompleto,
            formatFechaHora(r.fechaHoraLista),
            formatFechaHora(r.fechaHoraIngreso),
            r.condicion
        ]);

        const csvContent = [
            `MI REPORTE DE REGISTROS - ${reporte.usuario.nombre}`,
            `Total: ${reporte.stats.total} | Voz y Voto: ${reporte.stats.vyv} | Solo Voz: ${reporte.stats.soloVoz}`,
            '',
            headers.join(','),
            ...rows.map(r => r.join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `mi_reporte_${reporte.usuario.username}_${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
    };

    const handleExportPDF = async () => {
        if (!reporte) return;

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
        const logoUrl = coopLogo;
        try {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.src = logoUrl;
            await new Promise<void>((resolve) => {
                img.onload = () => {
                    try {
                        doc.addImage(img, 'PNG', 10, 8, 28, 28);
                    } catch (e) {
                        // Si falla, dibujar círculo con iniciales
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
        doc.text(coopNombre.toUpperCase(), 42, 22);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text('SIGA - Mi Reporte Personal', 42, 30);
        doc.setFontSize(8);
        doc.text(`Fecha: ${fechaHora}`, pageWidth - 14, 36, { align: 'right' });

        // Título
        doc.setTextColor(17, 94, 89);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('MI REPORTE DE REGISTROS', 14, 55);
        doc.setDrawColor(13, 148, 136);
        doc.setLineWidth(0.8);
        doc.line(14, 59, 100, 59);

        // Info usuario
        doc.setFillColor(240, 253, 250);
        doc.roundedRect(14, 64, pageWidth - 28, 28, 3, 3, 'F');

        doc.setTextColor(100, 116, 139);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text('OPERADOR:', 20, 73);
        doc.setTextColor(17, 94, 89);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(reporte.usuario.nombre.toUpperCase(), 20, 82);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text(`Usuario: @${reporte.usuario.username} | Rol: ${reporte.usuario.rol}`, 20, 88);

        // Stats
        const total = reporte.stats.total;
        const vyv = reporte.stats.vyv;
        const soloVoz = reporte.stats.soloVoz;
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
        const tableData = reporte.registros.map((r, idx) => [
            String(idx + 1),
            r.numeroSocio,
            r.cedula,
            r.nombreCompleto,
            formatFechaHora(r.fechaHoraLista),
            formatFechaHora(r.fechaHoraIngreso),
            r.condicion
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

        doc.save(`mi_reporte_${reporte.usuario.username}_${now.toISOString().slice(0, 10)}.pdf`);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/30 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="h-12 w-12 text-teal-500 animate-spin mx-auto mb-4" />
                    <p className="text-slate-500 font-medium">Cargando tu reporte...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/30 flex items-center justify-center">
                <div className="text-center bg-white rounded-2xl p-8 shadow-xl">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <ClipboardCheck className="h-8 w-8 text-red-500" />
                    </div>
                    <p className="text-slate-700 font-medium">{error}</p>
                </div>
            </div>
        );
    }

    if (!reporte) return null;

    const porcVyV = reporte.stats.total > 0 ? Math.round((reporte.stats.vyv / reporte.stats.total) * 100) : 0;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/30 p-4 sm:p-6 lg:p-8 space-y-6">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-r from-indigo-600 via-purple-500 to-pink-500 p-6 sm:p-8 shadow-2xl"
            >
                <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl" />

                <div className="relative z-10">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 rounded-full mb-3">
                                <Award className="h-4 w-4 text-white" />
                                <span className="text-white font-bold text-xs uppercase tracking-widest">Mi Reporte</span>
                            </div>
                            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight">
                                Hola, <span className="text-pink-100">{reporte.usuario.nombre.split(' ')[0]}</span>
                            </h1>
                            <p className="text-white/80 text-sm sm:text-base mt-2">
                                Aquí está el resumen de tus registros de asistencia
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={handleExportPDF}
                                className="flex items-center gap-2 px-4 py-3 bg-white/20 hover:bg-white/30 text-white rounded-xl font-bold text-sm transition-all"
                            >
                                <FileText className="h-4 w-4" />
                                PDF
                            </motion.button>
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={handleExportCSV}
                                className="flex items-center gap-2 px-4 py-3 bg-white/20 hover:bg-white/30 text-white rounded-xl font-bold text-sm transition-all"
                            >
                                <FileSpreadsheet className="h-4 w-4" />
                                CSV
                            </motion.button>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Stats Cards */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="grid grid-cols-2 lg:grid-cols-4 gap-4"
            >
                <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-lg transition-shadow">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500">
                            <ClipboardCheck className="h-5 w-5 text-white" />
                        </div>
                        <span className="text-xs font-bold text-slate-400 uppercase">Total Registros</span>
                    </div>
                    <p className="text-3xl font-black text-indigo-600">{reporte.stats.total}</p>
                </div>
                <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-lg transition-shadow">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2.5 rounded-xl bg-emerald-100">
                            <CheckCircle className="h-5 w-5 text-emerald-500" />
                        </div>
                        <span className="text-xs font-bold text-slate-400 uppercase">Voz y Voto</span>
                    </div>
                    <p className="text-3xl font-black text-emerald-500">{reporte.stats.vyv}</p>
                </div>
                <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-lg transition-shadow">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2.5 rounded-xl bg-amber-100">
                            <User className="h-5 w-5 text-amber-600" />
                        </div>
                        <span className="text-xs font-bold text-slate-400 uppercase">Solo Voz</span>
                    </div>
                    <p className="text-3xl font-black text-amber-600">{reporte.stats.soloVoz}</p>
                </div>
                <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-lg transition-shadow">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2.5 rounded-xl bg-blue-100">
                            <Award className="h-5 w-5 text-blue-600" />
                        </div>
                        <span className="text-xs font-bold text-slate-400 uppercase">% Voz y Voto</span>
                    </div>
                    <p className="text-3xl font-black text-blue-600">{porcVyV}%</p>
                </div>
            </motion.div>

            {/* Tabla */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden"
            >
                <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
                    <h2 className="text-lg font-bold text-slate-800">Mis Registros de Asistencia</h2>
                    <p className="text-sm text-slate-500">Socios que registraste en la asamblea</p>
                </div>

                {reporte.registros.length === 0 ? (
                    <div className="p-12 text-center">
                        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <ClipboardCheck className="h-10 w-10 text-slate-300" />
                        </div>
                        <p className="text-slate-500 font-medium">Aún no tienes registros de asistencia</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gradient-to-r from-teal-500 to-emerald-500 text-white">
                                <tr>
                                    <th className="px-2 py-3 text-center text-xs font-bold">#</th>
                                    <th className="px-2 py-3 text-center text-xs font-bold">NRO</th>
                                    <th className="px-2 py-3 text-left text-xs font-bold">CÉDULA</th>
                                    <th className="px-2 py-3 text-left text-xs font-bold">SOCIO</th>
                                    <th className="px-2 py-3 text-center text-xs font-bold">FECHA/HORA LISTA</th>
                                    <th className="px-2 py-3 text-center text-xs font-bold">FECHA/HORA INGRESO</th>
                                    <th className="px-2 py-3 text-center text-xs font-bold">CONDICIÓN</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {reporte.registros.map((registro, idx) => (
                                    <motion.tr
                                        key={registro.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: idx * 0.03 }}
                                        className="hover:bg-slate-50 transition-colors"
                                    >
                                        <td className="px-2 py-3 text-sm text-center font-bold text-teal-500">{idx + 1}</td>
                                        <td className="px-2 py-3 text-sm text-center text-slate-600">{registro.numeroSocio}</td>
                                        <td className="px-2 py-3 text-sm text-slate-700">{registro.cedula}</td>
                                        <td className="px-2 py-3 text-sm font-medium text-slate-800">{registro.nombreCompleto}</td>
                                        <td className="px-2 py-3 text-xs text-center font-mono text-slate-600">
                                            {formatFechaHora(registro.fechaHoraLista)}
                                        </td>
                                        <td className="px-2 py-3 text-xs text-center font-mono text-slate-700">
                                            {formatFechaHora(registro.fechaHoraIngreso)}
                                        </td>
                                        <td className="px-2 py-3 text-center">
                                            <span className={`px-2 py-1 rounded-lg text-xs font-bold ${registro.esVyV
                                                ? 'bg-emerald-100 text-teal-500'
                                                : 'bg-amber-100 text-amber-700'
                                                }`}>
                                                {registro.condicion}
                                            </span>
                                        </td>
                                    </motion.tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </motion.div>
        </div>
    );
}
