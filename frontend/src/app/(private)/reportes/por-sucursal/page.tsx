"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { Download, Building2, Users, UserCheck, UserX, ArrowLeft } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Toaster, toast } from "sonner";
import { Loader2, Printer } from "lucide-react";

interface SocioAsignado {
    id: number;
    socioNombre: string;
    socioNro: string;
    cedula: string;
    sucursal: string;
    vozVoto: string;
    fechaAsignacion: string;
    fechaHora: string | null;
    estado: string;
    operador: string;
}

export default function ReportePorSucursalPage() {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<SocioAsignado[]>([]);
    const [stats, setStats] = useState<any>({});
    const [user, setUser] = useState<any>(null);
    const [sucursales, setSucursales] = useState<any[]>([]);
    const [selectedSucursal, setSelectedSucursal] = useState<string>("");

    useEffect(() => {
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
            const parsedUser = JSON.parse(storedUser);
            setUser(parsedUser);
            cargarSucursales();
        }
    }, []);

    const cargarSucursales = async () => {
        try {
            const token = localStorage.getItem("token");
            const res = await axios.get("/api/reportes/sucursales-lista", {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSucursales(res.data);
        } catch (error) {
            console.error("Error cargando sucursales", error);
        }
    };

    const fetchReporte = async (sucursalId: string) => {
        if (!sucursalId) return;

        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const response = await axios.get(
                `/api/reportes/por-sucursal/${sucursalId}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setData(response.data.data);
            setStats(response.data.stats);
        } catch (error) {
            console.error("Error al obtener reporte", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSucursalChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const value = e.target.value;
        setSelectedSucursal(value);
        if (value) {
            fetchReporte(value);
        } else {
            setData([]);
            setStats({});
        }
    };

    // Función auxiliar para formatear fechas de forma segura
    const formatSafeTime = (dateValue: any) => {
        if (!dateValue) return "-";
        try {
            let date: Date;
            if (Array.isArray(dateValue)) {
                date = new Date(dateValue[0], dateValue[1] - 1, dateValue[2], dateValue[3] || 0, dateValue[4] || 0, dateValue[5] || 0);
            } else {
                date = new Date(dateValue);
            }
            if (isNaN(date.getTime())) return "-";
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch (e) {
            return "-";
        }
    };

    const formatSafeDateTime = (dateValue: any) => {
        if (!dateValue) return "-";
        try {
            let date: Date;
            if (Array.isArray(dateValue)) {
                date = new Date(dateValue[0], dateValue[1] - 1, dateValue[2], dateValue[3] || 0, dateValue[4] || 0, dateValue[5] || 0);
            } else {
                date = new Date(dateValue);
            }
            if (isNaN(date.getTime())) return "-";
            return format(date, "dd/MM/yyyy HH:mm", { locale: es });
        } catch (e) {
            return "-";
        }
    };

    const handleExportPDF = async () => {
        if (data.length === 0) return;

        const doc = new jsPDF('l', 'mm', 'a4');

        // Cargar logo
        let logoBase64 = '';
        try {
            const response = await fetch('/logo-cooperativa.png');
            const blob = await response.blob();
            logoBase64 = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(blob);
            });
        } catch (e) {
            console.error("No se pudo cargar el logo", e);
        }

        // Encabezado Premium
        doc.setFillColor(139, 92, 246); // Violeta
        doc.rect(0, 0, 297, 45, 'F');

        if (logoBase64) {
            doc.addImage(logoBase64, 'PNG', 10, 5, 35, 35);
        }

        doc.setFontSize(22);
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.text("COOPERATIVA MULTIACTIVA LAMBARÉ LTDA.", 50, 18);

        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        doc.text("SIGA - Sistema Integral de Gestión de Asamblea", 50, 26);

        doc.setFontSize(9);
        doc.text("Documento Oficial", 50, 33);
        doc.text(`Fecha: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, 283, 38, { align: 'right' });

        // Título del Reporte
        doc.setFontSize(16);
        doc.setTextColor(31, 41, 55);
        doc.setFont("helvetica", "bold");
        doc.text(`REPORTE DE ASISTENCIA - ${stats.sucursalNombre || 'SUCURSAL'}`, 14, 58);

        // Estadísticas
        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(75, 85, 99);
        doc.text(`Total: ${stats.totalRegistros} | Presentes: ${stats.presentes} | Ausentes: ${stats.ausentes} | Voz y Voto: ${stats.habilitados} | Solo Voz: ${stats.observados}`, 14, 66);

        doc.setFontSize(9);
        doc.setTextColor(120, 130, 140);
        doc.text(`Generado por: ${user?.nombreCompleto || 'Sistema'}`, 283, 66, { align: 'right' });

        // Tabla
        const columns = [
            { header: 'CÉDULA', dataKey: 'cedula' },
            { header: 'SOCIO', dataKey: 'socio' },
            { header: 'NRO', dataKey: 'nro' },
            { header: 'REGISTRADO EN LISTA', dataKey: 'fechaAsig' },
            { header: 'INGRESO ASAMBLEA', dataKey: 'fechaIngreso' },
            { header: 'OPERADOR', dataKey: 'operador' },
            { header: 'ASISTENCIA', dataKey: 'estado' },
            { header: 'CONDICIÓN', dataKey: 'condicion' },
        ];

        const rows = data.map(item => ({
            cedula: item.cedula,
            socio: item.socioNombre,
            nro: item.socioNro,
            fechaAsig: item.fechaAsignacion ? new Date(item.fechaAsignacion).toLocaleString():'-',
            fechaIngreso: item.fechaHora ? new Date(item.fechaHora).toLocaleString():'-',
            operador: item.operador,
            estado: item.estado,
            condicion: item.vozVoto === 'HABILITADO' ? 'VOZ Y VOTO':'SOLO VOZ',
            rawStatus: item.vozVoto,
            rawPresence: item.estado
        }));

        autoTable(doc, {
            startY: 75,
            columns: columns,
            body: rows,
            headStyles: {
                fillColor: [139, 92, 246],
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                halign: 'center'
            },
            bodyStyles: { valign: 'middle', fontSize: 8 },
            alternateRowStyles: { fillColor: [248, 250, 252] },
            didParseCell: function (cellData: any) {
                if (cellData.section === 'body') {
                    const row = cellData.row.raw as any;
                    if (row.rawPresence === 'PRESENTE') {
                        if (cellData.column.dataKey === 'estado') {
                            cellData.cell.styles.fillColor = [209, 250, 229];
                            cellData.cell.styles.textColor = [6, 78, 59];
                        }
                    } else if (row.rawPresence === 'AUSENTE') {
                        if (cellData.column.dataKey === 'estado') {
                            cellData.cell.styles.fillColor = [254, 226, 226];
                            cellData.cell.styles.textColor = [127, 29, 29];
                        }
                    }
                }
            }
        });

        // Pie de página
        const pageCount = (doc as any).internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.text(`Página ${i} de ${pageCount} - SIGA - Sistema Integral de Gestión de Asamblea`, 148, 200, { align: 'center' });
        }

        const fileName = `reporte_sucursal_${stats.sucursalNombre || 'desconocida'}_${new Date().toISOString().split('T')[0]}.pdf`;

        // --- LÓGICA DE PREVISUALIZACIÓN ---
        const pdfBlob = doc.output('blob');
        const pdfUrl = URL.createObjectURL(pdfBlob);
        const printWindow = window.open(pdfUrl, '_blank');

        if (!printWindow) {
            doc.save(fileName);
            toast.info("Se ha descargado el PDF porque se bloqueó la ventana emergente.");
        } else {
            toast.success("Vista de impresión generada correctamente.");
        }
    };

    const handleExportExcel = () => {
        if (data.length === 0) return;

        const ws = XLSX.utils.json_to_sheet(data.map(item => ({
            "Cédula": item.cedula,
            "Nro Socio": item.socioNro,
            "Nombre Completo": item.socioNombre,
            "Sucursal": item.sucursal,
            "Fecha Asignación": item.fechaAsignacion ? new Date(item.fechaAsignacion).toLocaleString():'-',
            "Fecha Ingreso": item.fechaHora ? new Date(item.fechaHora).toLocaleString():'-',
            "Estado": item.estado,
            "Condición": item.vozVoto === 'HABILITADO' ? 'VOZ Y VOTO':'SOLO VOZ',
            "Operador": item.operador
        })));

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Reporte");
        XLSX.writeFile(wb, `reporte_sucursal_${stats.sucursalNombre || 'desconocida'}.xlsx`);
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-12">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href="/reportes" className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors">
                    <ArrowLeft className="w-5 h-5 text-slate-600" />
                </Link>
                <div>
                    <Toaster position="top-center" richColors />
                    <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-purple-600">
                        Reporte por Sucursal
                    </h1>
                    <p className="text-slate-500">Socios asignados y asistencia filtrado por sucursal</p>
                </div>
            </div>

            {/* Selector de Sucursal */}
            <div className="bg-gradient-to-br from-violet-500 to-purple-600 p-8 rounded-3xl shadow-2xl shadow-violet-200">
                <div className="flex flex-col md:flex-row items-center gap-6">
                    <div className="p-4 bg-white/20 rounded-2xl">
                        <Building2 className="w-10 h-10 text-white" />
                    </div>
                    <div className="flex-1 w-full">
                        <label className="text-white/80 text-sm font-medium block mb-2">Seleccionar Sucursal</label>
                        <select
                            value={selectedSucursal}
                            onChange={handleSucursalChange}
                            className="w-full bg-white text-slate-800 text-lg font-medium rounded-xl px-6 py-4 focus:outline-none focus:ring-4 focus:ring-white/30 cursor-pointer"
                        >
                            <option value="">-- Seleccione una sucursal --</option>
                            {sucursales.map((suc: any) => (
                                <option key={suc.id} value={suc.id}>{suc.nombre}</option>
                            ))}
                        </select>
                    </div>
                    {selectedSucursal && (
                        <div className="flex gap-3">
                            <button
                                onClick={handleExportPDF}
                                disabled={data.length === 0}
                                className="px-6 py-4 bg-white text-violet-600 font-bold rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 flex items-center gap-2"
                            >
                                <Download className="w-5 h-5" /> PDF
                            </button>
                            <button
                                onClick={handleExportExcel}
                                disabled={data.length === 0}
                                className="px-6 py-4 bg-emerald-500 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 flex items-center gap-2"
                            >
                                <Download className="w-5 h-5" /> Excel
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Estadísticas */}
            {selectedSucursal && stats.totalRegistros !== undefined && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-100 text-center">
                        <Users className="w-8 h-8 mx-auto mb-2 text-violet-500" />
                        <p className="text-3xl font-black text-slate-800">{stats.totalRegistros}</p>
                        <p className="text-xs text-slate-400 uppercase tracking-wide">Total Asignados</p>
                    </div>
                    <div className="bg-gradient-to-br from-emerald-50 to-teal-50 p-6 rounded-2xl shadow-lg border border-emerald-100 text-center">
                        <UserCheck className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
                        <p className="text-3xl font-black text-emerald-500">{stats.presentes || 0}</p>
                        <p className="text-xs text-emerald-500 uppercase tracking-wide">Presentes</p>
                    </div>
                    <div className="bg-gradient-to-br from-red-50 to-rose-50 p-6 rounded-2xl shadow-lg border border-red-100 text-center">
                        <UserX className="w-8 h-8 mx-auto mb-2 text-red-500" />
                        <p className="text-3xl font-black text-red-600">{stats.ausentes || 0}</p>
                        <p className="text-xs text-red-500 uppercase tracking-wide">Ausentes</p>
                    </div>
                    <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-6 rounded-2xl shadow-lg border border-blue-100 text-center">
                        <p className="text-3xl font-black text-blue-600">{stats.habilitados || 0}</p>
                        <p className="text-xs text-blue-500 uppercase tracking-wide">Voz y Voto</p>
                    </div>
                    <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-6 rounded-2xl shadow-lg border border-amber-100 text-center">
                        <p className="text-3xl font-black text-amber-600">{stats.observados || 0}</p>
                        <p className="text-xs text-amber-500 uppercase tracking-wide">Solo Voz</p>
                    </div>
                </div>
            )}

            {/* Tabla de Datos */}
            {loading ? (
                <div className="text-center py-12">
                    <div className="animate-spin w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full mx-auto"></div>
                    <p className="text-slate-500 mt-4">Cargando datos...</p>
                </div>
            ):selectedSucursal && data.length> 0 ? (
                <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
                    <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-violet-50 to-purple-50">
                        <h3 className="font-bold text-slate-800">
                            📊 Socios de {stats.sucursalNombre} ({data.length})
                        </h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Socio</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Cédula</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Registrado</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Ingreso</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Operador</th>
                                    <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase">Estado</th>
                                    <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase">Condición</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {data.map((item, idx) => (
                                    <tr key={item.id || idx} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-4 py-4">
                                            <p className="font-bold text-slate-800">{item.socioNombre}</p>
                                            <p className="text-xs text-slate-400">Nro: {item.socioNro}</p>
                                        </td>
                                        <td className="px-4 py-4 text-slate-600">{item.cedula}</td>
                                        <td className="px-4 py-4 text-sm font-mono font-bold text-slate-700">
                                            {formatSafeDateTime(item.fechaAsignacion)}
                                        </td>
                                        <td className="px-4 py-4 text-sm font-mono font-bold text-emerald-500">
                                            {formatSafeDateTime(item.fechaHora)}
                                        </td>
                                        <td className="px-4 py-4 text-xs font-bold text-slate-600">{item.operador}</td>
                                        <td className="px-4 py-4 text-center">
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${item.estado === 'PRESENTE'
                                                ? 'bg-emerald-100 text-teal-500'
                                               :'bg-red-100 text-red-700'
                                                }`}>
                                                {item.estado}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${item.vozVoto === 'HABILITADO'
                                                ? 'bg-blue-100 text-blue-700'
                                               :'bg-amber-100 text-amber-700'
                                                }`}>
                                                {item.vozVoto === 'HABILITADO' ? 'VOZ Y VOTO':'SOLO VOZ'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ):selectedSucursal ? (
                <div className="text-center py-12 bg-white rounded-3xl shadow-lg">
                    <Building2 className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                    <p className="text-slate-500">No hay socios asignados en esta sucursal</p>
                </div>
            ):(
                <div className="text-center py-16 bg-gradient-to-br from-violet-50 to-purple-50 rounded-3xl border-2 border-dashed border-violet-200">
                    <Building2 className="w-20 h-20 mx-auto text-violet-300 mb-4" />
                    <p className="text-violet-600 font-bold text-lg">Selecciona una sucursal</p>
                    <p className="text-violet-400 text-sm">para ver los socios asignados y su asistencia</p>
                </div>
            )}
        </div>
    );
}
