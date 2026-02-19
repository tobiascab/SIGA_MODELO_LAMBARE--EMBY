
"use client";

import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import {
    Users, Building2, UserCircle2, BarChart3,
    TrendingUp, FileText, CheckCircle2, AlertCircle,
    Download, ChevronDown, Map, Printer, UserX
} from "lucide-react";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
    Legend, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell,
    ComposedChart, Line, Area, AreaChart
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import * as XLSX from 'xlsx';

// --- TIPOS ---
type Alcance = "GLOBAL" | "SUCURSAL" | "ASESOR";
type ReporteTipo = "GESTION" | "PADRON" | "ASISTENCIA" | "TOP" | "SIN_CARGA";

export default function IntelligenceHubPage() {
    // --- ESTADOS DE FILTRO ---
    const [alcance, setAlcance] = useState<Alcance>("GLOBAL");
    const [reporteTipo, setReporteTipo] = useState<ReporteTipo>("GESTION");

    // Filtros específicos
    const [selectedSucursalId, setSelectedSucursalId] = useState<number | null>(null);
    const [selectedAsesorId, setSelectedAsesorId] = useState<number | null>(null);

    // Configuración de Reporte
    const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('landscape');

    // Estado para reporte SIN_CARGA
    const [soloAsesores, setSoloAsesores] = useState(false);
    const [usuariosSinCarga, setUsuariosSinCarga] = useState<any[]>([]);
    const [loadingSinCarga, setLoadingSinCarga] = useState(false);

    // --- DATOS MAESTROS ---
    const [sucursales, setSucursales] = useState<any[]>([]);
    const [asesores, setAsesores] = useState<any[]>([]);
    const [rawData, setRawData] = useState<any[]>([]);

    const [loading, setLoading] = useState(true);

    // Cooperativa data for reports
    const [coopNombre, setCoopNombre] = useState('Sistema de Asambleas');
    const [coopLogo, setCoopLogo] = useState('/logo.png');

    // --- COLORES ---
    const COLORS = {
        primary: '#10b981', // Emerald 500
        secondary: '#3b82f6',
        warning: '#f59e0b',
        danger: '#ef4444',
        dark: '#1e293b',
        chart: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']
    };

    // --- CARGA INICIAL ---
    useEffect(() => {
        const loadMasterData = async () => {
            setLoading(true);
            try {
                const token = localStorage.getItem("token");

                // 1. Cargar Sucursales
                const resSucursales = await axios.get("/api/reportes/sucursales-lista", {
                    headers: { Authorization: `Bearer ${token} ` }
                });
                setSucursales(resSucursales.data);

                // 2. Cargar Ranking Global
                const resRanking = await axios.get("/api/reportes/ranking-global", {
                    headers: { Authorization: `Bearer ${token} ` }
                });
                setRawData(resRanking.data);

                // 3. Mapear usuarios para el select de Asesores
                const resIds = await axios.get("/api/asignaciones/ranking-usuarios", {
                    headers: { Authorization: `Bearer ${token} ` }
                });

                const asesoresMap = resRanking.data.map((r: any) => {
                    const idObj = resIds.data.find((u: any) => u.username === r.username);
                    return {
                        ...r,
                        id: idObj ? idObj.id : null
                    };
                }).filter((a: any) => a.id);

                setAsesores(asesoresMap);

            } catch (error) {
                console.error("Error cargando datos maestros:", error);
            } finally {
                setLoading(false);
            }
        };

        loadMasterData();

        // Load cooperativa data
        fetch('/api/cooperativa/publica')
            .then(r => r.ok ? r.json() : null)
            .then(data => {
                if (data?.nombre) setCoopNombre(data.nombre);
                if (data?.logo) setCoopLogo(data.logo);
            })
            .catch(() => { });
    }, []);

    // --- CARGAR USUARIOS SIN CARGA ---
    useEffect(() => {
        if (reporteTipo !== 'SIN_CARGA') return;

        const fetchUsuariosSinCarga = async () => {
            setLoadingSinCarga(true);
            try {
                const token = localStorage.getItem("token");
                const params = new URLSearchParams();
                params.append('soloAsesores', String(soloAsesores));
                if (selectedSucursalId) {
                    params.append('sucursalId', String(selectedSucursalId));
                }

                const res = await axios.get(`/api/reportes/usuarios-sin-carga?${params.toString()}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setUsuariosSinCarga(res.data);
            } catch (error) {
                console.error("Error cargando usuarios sin carga:", error);
                setUsuariosSinCarga([]);
            } finally {
                setLoadingSinCarga(false);
            }
        };

        fetchUsuariosSinCarga();
    }, [reporteTipo, soloAsesores, selectedSucursalId]);

    // --- MOTOR DE PROCESAMIENTO ---
    const processedData = useMemo(() => {
        let data = [...rawData];

        // 1. Filtrar por Alcance
        if (alcance === "SUCURSAL" && selectedSucursalId) {
            const sucursalNombre = sucursales.find(s => s.id === selectedSucursalId)?.nombre;
            if (sucursalNombre) {
                data = data.filter(d => d.sucursal === sucursalNombre);
            }
        } else if (alcance === "ASESOR" && selectedAsesorId) {
            const asesor = asesores.find(a => a.id === selectedAsesorId);
            if (asesor) {
                data = data.filter(d => d.username === asesor.username);
            }
        }

        // Filtrar basura (N/A o vacíos)
        data = data.filter(d => d.sucursal !== 'N/A' && d.nombreCompleto !== 'N/A' && d.meta > 0);

        // 2. Calcular Totales
        // Nota: "Registrados" es para Gestión/Padron. Para Asistencia necesitamos "Presentes".
        // Como no hay endpoint de asistencia aun, simularemos 0 o un valor placeholder si quisieramos probar.
        const totalRegistrados = data.reduce((acc, curr) => acc + (curr.registrados || 0), 0);
        const totalHabilitados = data.reduce((acc, curr) => acc + (curr.meta || 0), 0);

        let totalPresentes = 0; // POR AHORA 0 HASTA QUE HAYA ENDPOINT

        // Simulacion de Voz y Voto (proporcional por ahora, ya que el endpoint no lo trae desglosado aun)
        const totalVoz = Math.round(totalHabilitados * 0.15);
        const totalVoto = Math.round(totalHabilitados * 0.85);

        // 3. Generar estructuras para Gráficos /Tablas
        let chartData: any[] = [];

        // Lógica diferenciada para ASISTENCIA vs GESTION/PADRON
        if (reporteTipo === 'ASISTENCIA') {
            // Estructura para Asistencia: Entidad | Habilitados | Presentes | Ausentes | Quorum
            const group = data.reduce((acc: any, curr) => {
                const key = alcance === 'GLOBAL' ? (curr.sucursal || "Otros") : curr.nombreCompleto;
                if (!acc[key]) acc[key] = { name: key, meta: 0, value: 0 };
                acc[key].meta += curr.meta || 0;
                // acc[key].value += curr.presentes || 0; // Standardized 'value' as 'presentes'
                return acc;
            }, {});
            chartData = Object.values(group).sort((a: any, b: any) => b.meta - a.meta); // Ordenar por tamaño de padrón
        } else {
            // Estructura Original para Gestion/Padron
            if (alcance === "GLOBAL") {
                const group = data.reduce((acc: any, curr) => {
                    const key = curr.sucursal || "Otros";
                    if (!acc[key]) acc[key] = { name: key, value: 0, meta: 0 };
                    acc[key].value += curr.registrados || 0;
                    acc[key].meta += curr.meta || 0;
                    return acc;
                }, {});
                chartData = Object.values(group).sort((a: any, b: any) => b.value - a.value);
            } else if (alcance === "SUCURSAL") {
                chartData = data.map(d => ({
                    name: d.nombreCompleto.split(" ")[0] + " " + (d.nombreCompleto.split(" ")[1] || ""),
                    value: d.registrados || 0,
                    meta: d.meta || 0,
                    sucursal: d.sucursal
                })).sort((a: any, b: any) => b.value - a.value).slice(0, 15);
            } else {
                chartData = [{ name: "Realizado", value: totalRegistrados }, { name: "Pendiente", value: Math.max(0, totalHabilitados - totalRegistrados) }];
            }
        }

        return {
            totalRegistrados,
            totalHabilitados,
            totalVoz,
            totalVoto,
            totalPresentes,
            totalAusentes: totalHabilitados - totalPresentes,
            cumplimiento: totalHabilitados > 0 ? (totalRegistrados / totalHabilitados) * 100 : 0,
            quorum: totalHabilitados > 0 ? (totalPresentes / totalHabilitados) * 100 : 0,
            chartData
        };
    }, [rawData, alcance, selectedSucursalId, selectedAsesorId, sucursales, asesores, reporteTipo]);


    // --- HELPERS EXPORTACION (PDF VECTORIAL) ---
    const handleDownloadDirectPDF = async () => {
        const jsPDF = (await import('jspdf')).default;
        const autoTable = (await import('jspdf-autotable')).default;
        const html2canvas = (await import('html2canvas')).default;

        const doc = new jsPDF({ orientation: orientation, unit: 'mm', format: 'a4' });
        const pageWidth = doc.internal.pageSize.getWidth();
        const marginX = 14;

        // Colores Verdes Premium
        const colors = {
            primary: [5, 150, 105], // emerald-600
            secondary: [16, 185, 129], // emerald-500
            accent: [245, 158, 11], // amber-500
            dark: [2, 44, 34], // emerald-950
            text: [51, 65, 85], // slate-700
            light: [236, 253, 245], // emerald-50
            white: [255, 255, 255]
        };

        // --- LOAD IMAGE ---
        const loadImage = (src: string): Promise<HTMLImageElement> => {
            return new Promise((resolve) => {
                const img = new Image();
                img.src = src;
                img.onload = () => resolve(img);
                img.onerror = () => resolve(img);
            });
        };

        // --- RENDER HEADER ---
        // 1. Logo
        try {
            const logoImg = await loadImage(coopLogo);
            if (logoImg.width > 0) {
                const logoWidth = 35; // Un poco más pequeño para ser elegante
                const logoHeight = (logoImg.height * logoWidth) / logoImg.width;
                doc.addImage(logoImg, 'PNG', marginX, 10, logoWidth, logoHeight);
            }
        } catch (e) { console.error("Logo error", e); }

        // 2. Textos Header (Centrados)
        const centerX = pageWidth / 2;

        doc.setFontSize(22);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2]);
        doc.text(coopNombre.toUpperCase(), centerX, 20, { align: 'center' });

        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
        doc.text(`REPORTE DE ASAMBLEA 2026 - ${reporteTipo}`, centerX, 28, { align: 'center' });

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);

        const subheader1 = alcance === 'GLOBAL' ? 'CONSOLIDADO NACIONAL' :
            alcance === 'SUCURSAL' ? `SUCURSAL: ${sucursales.find(s => s.id === selectedSucursalId)?.nombre || ''}`.toUpperCase() :
                `OPERADOR: ${asesores.find(a => a.id === selectedAsesorId)?.nombreCompleto || ''}`.toUpperCase();

        doc.text(`DIRECCIÓN COMERCIAL - ${subheader1}`, centerX, 34, { align: 'center' });

        const fecha = new Date().toLocaleDateString('es-PY', { day: '2-digit', month: 'long', year: 'numeric' });
        doc.text(`EMISIÓN: ${fecha.toUpperCase()} ${new Date().toLocaleTimeString()}`, centerX, 39, { align: 'center' });

        // 3. Línea Divisoria
        const lineY = 45;
        doc.setDrawColor(colors.primary[0], colors.primary[1], colors.primary[2]);
        doc.setLineWidth(0.8);
        doc.line(marginX, lineY, pageWidth - marginX, lineY);

        // --- DESCRIPCIÓN CONTEXTUAL ---
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 116, 139); // Slate 500

        const descTexto = `Estado actual del ${reporteTipo === 'ASISTENCIA' ? 'quorum y asistencia' : 'padrón y metas'} para la Asamblea 2025. Datos filtrados por alcance ${alcance === 'GLOBAL' ? 'Global Corporativo' : alcance}.`;

        // Split text para ajustar al ancho
        const splitDesc = doc.splitTextToSize(descTexto, pageWidth - (marginX * 2));
        doc.text(splitDesc, marginX, lineY + 5);


        // --- TARJETAS KPIs (Diseño High Impact) ---
        const availableWidth = pageWidth - (marginX * 2);
        const gap = 6;

        let cardCount = 4;
        if (orientation === 'landscape') cardCount = 5;

        const cardWidth = (availableWidth - ((cardCount - 1) * gap)) / cardCount;
        const startKPIS = lineY + 15; // Bajamos más para dar espacio al texto descriptivo
        const cardHeight = 28;

        const drawKPICard = (index: number, title: string, value: string, type: 'neutral' | 'primary' | 'warning' = 'neutral') => {
            const x = marginX + (index * (cardWidth + gap));
            const centerX = x + (cardWidth / 2);

            // Fondo
            doc.setDrawColor(226, 232, 240);
            doc.setLineWidth(0.1);
            doc.setFillColor(252, 252, 253);

            if (type === 'primary') {
                doc.setFillColor(236, 253, 245);
                doc.setDrawColor(16, 185, 129);
            } else if (type === 'warning') {
                doc.setFillColor(255, 251, 235);
                doc.setDrawColor(245, 158, 11);
            }

            doc.roundedRect(x, startKPIS, cardWidth, cardHeight, 3, 3, 'FD');

            // TÍTULO
            doc.setFontSize(7);
            doc.setFont("helvetica", "bold");

            if (type === 'warning') doc.setTextColor(180, 83, 9);
            else if (type === 'primary') doc.setTextColor(4, 120, 87);
            else doc.setTextColor(100, 116, 139);

            doc.text(title, centerX, startKPIS + 7, { align: 'center' });

            // VALOR
            doc.setFontSize(22);
            doc.setFont("helvetica", "bold");

            if (type === 'warning') doc.setTextColor(217, 119, 6);
            else if (type === 'primary') doc.setTextColor(5, 150, 105);
            else doc.setTextColor(15, 23, 42);

            doc.text(value, centerX, startKPIS + 20, { align: 'center' });
        };

        if (reporteTipo === 'ASISTENCIA') {
            drawKPICard(0, "HABILITADOS TOTAL", processedData.totalHabilitados.toLocaleString(), 'neutral');
            drawKPICard(1, "PRESENTES", processedData.totalPresentes.toLocaleString(), 'primary');
            drawKPICard(2, "AUSENTES", processedData.totalAusentes.toLocaleString(), 'warning');
            drawKPICard(3, "QUORUM ACTUAL", `${processedData.quorum.toFixed(1)}%`, 'neutral');
            if (orientation === 'landscape') drawKPICard(4, "ESTADO ASAMBLEA", processedData.quorum > 50 ? "VALIDO" : "EN ESPERA", processedData.quorum > 50 ? 'primary' : 'warning');
        } else {
            drawKPICard(0, "TOTAL REGISTRADOS", processedData.totalRegistrados.toLocaleString(), 'neutral');
            drawKPICard(1, "HABILITADOS", processedData.totalHabilitados.toLocaleString(), 'neutral');
            drawKPICard(2, "TOTAL REG. SOLO VOZ", processedData.totalVoz.toLocaleString(), 'warning');
            drawKPICard(3, "TOTAL REG. V&V", processedData.totalVoto.toLocaleString(), 'primary');
            if (orientation === 'landscape') {
                drawKPICard(4, "CUMPLIMIENTO", `${processedData.cumplimiento.toFixed(1)}%`, 'primary');
            }
        }

        // --- TABLA DINAMICA ---
        let headRow: any[] = [];
        let bodyData: any[] = [];
        let colStyles: any = {};
        const PROPORTION_VYV = 0.85; // Proporción V&V estimada

        // Lógica UNIFICADA para desglose V&V vs Solo Voz en todos los reportes
        // Asistencia: Presentes V&V | Presentes SV | Hab V&V | Hab SV
        // Otros: Reg V&V | Reg SV | Meta V&V | Meta SV

        let labelRegVyV = "REG. V&V";
        let labelRegSV = "REG. S.VOZ";
        let labelMetaVyV = "META V&V";
        let labelMetaSV = "META S.VOZ";
        let labelPct = "AVANCE";

        if (reporteTipo === 'ASISTENCIA') {
            labelRegVyV = "PRES. V&V";
            labelRegSV = "PRES. S.VOZ";
            labelMetaVyV = "HAB. V&V";
            labelMetaSV = "HAB. S.VOZ";
            labelPct = "QUORUM";
        }

        headRow = [['#', 'ENTIDAD /NOMBRE', labelRegVyV, labelRegSV, labelMetaVyV, labelMetaSV, labelPct]];

        bodyData = processedData.chartData.map((d: any, index: number) => {
            // Cálculos estimados por fila
            const regTotal = d.value || 0; // Presentes en Asistencia, Registrados en otros
            const metaTotal = d.meta || 0;

            const metaVyV = Math.round(metaTotal * PROPORTION_VYV);
            const metaSV = Math.round(metaTotal * (1 - PROPORTION_VYV));

            const regVyV = Math.round(regTotal * PROPORTION_VYV);
            const regSV = Math.round(regTotal * (1 - PROPORTION_VYV));

            const pct = metaTotal > 0 ? (regTotal / metaTotal) * 100 : 0;

            return [
                { content: (index + 1).toString(), styles: { halign: 'center', fontStyle: 'bold', textColor: [100, 100, 100] as [number, number, number] } },
                d.name, // Nombre/Entidad 
                regVyV.toLocaleString(), // Col 2
                regSV.toLocaleString(),  // Col 3
                metaVyV.toLocaleString(), // Col 4
                metaSV.toLocaleString(),  // Col 5
                { content: `${pct.toFixed(0)}%`, styles: { halign: 'right', fontStyle: 'bold', textColor: (pct >= 50 ? colors.primary : colors.accent) as [number, number, number] } }
            ];
        });

        colStyles = {
            0: { cellWidth: 8 },
            1: { cellWidth: 'auto', fontStyle: 'bold' },
            2: { halign: 'center', fontStyle: 'bold', cellWidth: 20, textColor: colors.primary },
            3: { halign: 'center', cellWidth: 20, textColor: colors.accent },
            4: { halign: 'center', cellWidth: 20 },
            5: { halign: 'center', cellWidth: 20 },
            6: { halign: 'right', cellWidth: 22 }
        };

        // --- GRÁFICOS (CAPTURA HTML) ---
        let chartY = startKPIS + cardHeight + 10;

        // Solo intentar capturar si estamos en el navegador
        if (typeof window !== 'undefined') {
            const overviewEl = document.getElementById('chart-overview');
            const distributionEl = document.getElementById('chart-distribution');

            if (overviewEl && distributionEl) {
                try {
                    // Captura Overview
                    const canvas1 = await html2canvas(overviewEl, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
                    const img1 = canvas1.toDataURL('image/png');

                    // Layout: Overview toma 65% ancho, Dist toma 30% width (aprox)
                    const w1 = (availableWidth * 0.65);
                    const h1 = (canvas1.height * w1) / canvas1.width;

                    doc.addImage(img1, 'PNG', marginX, chartY, w1, h1);

                    // Captura Distribution
                    const canvas2 = await html2canvas(distributionEl, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
                    const img2 = canvas2.toDataURL('image/png');

                    const w2 = (availableWidth * 0.32);
                    const h2 = (canvas2.height * w2) / canvas2.width;

                    // Alinear a la derecha
                    doc.addImage(img2, 'PNG', marginX + w1 + (availableWidth * 0.03), chartY, w2, h2);

                    chartY += Math.max(h1, h2) + 10;
                } catch (err) {
                    console.error("Error capturando gráficos para PDF:", err);
                }
            }
        }

        // @ts-ignore
        autoTable(doc, {
            startY: chartY, // 10mm de espacio tras las tarjetas
            head: headRow,
            body: bodyData,
            theme: 'grid',
            styles: {
                font: 'helvetica',
                fontSize: 8,
                cellPadding: 3,
                lineColor: [241, 245, 249],
                lineWidth: 0.1,
                textColor: colors.text as [number, number, number]
            },
            headStyles: {
                fillColor: colors.dark as [number, number, number], // Emerald oscuro muy elegante
                textColor: [255, 255, 255],
                fontSize: 7, // Fuente header más pequeña para evitar wraps raros
                fontStyle: 'bold',
                halign: 'center',
                valign: 'middle',
                lineWidth: 0
            },
            alternateRowStyles: {
                fillColor: [248, 250, 252] // Slate-50 muy suave
            },
            columnStyles: colStyles,
            margin: { left: marginX, right: marginX }
        });

        const pageCount = (doc as any).internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.text(`${coopNombre} - Sistema SIGA`, 14, doc.internal.pageSize.getHeight() - 10);
            doc.text(`Pag. ${i}/${pageCount}`, pageWidth - 20, doc.internal.pageSize.getHeight() - 10, { align: 'right' });
        }

        doc.save(`Reporte_SIGA_${reporteTipo}_${new Date().toISOString().slice(0, 10)}.pdf`);
    };

    const handleExportExcel = () => {
        // Etiquetas dinámicas para Excel
        const isAsistencia = reporteTipo === 'ASISTENCIA';
        const labelRegVyV = isAsistencia ? "Pres. V&V" : "Reg. V&V";
        const labelRegSV = isAsistencia ? "Pres. S.Voz" : "Reg. S.Voz";
        const labelMetaVyV = isAsistencia ? "Hab. V&V" : "Meta V&V";
        const labelMetaSV = isAsistencia ? "Hab. S.Voz" : "Meta S.Voz";
        const labelPct = isAsistencia ? "Quorum Global (%)" : "Avance Global (%)";

        // Mapeo detallado para Excel con las mismas lógicas que el PDF
        const excelData = processedData.chartData.map((d: any) => {
            const regTotal = d.value || 0;
            const metaTotal = d.meta || 0;

            // Proporciones estimadas igual que en el PDF
            const PROPORTION_VYV = 0.85;

            const metaVyV = Math.round(metaTotal * PROPORTION_VYV);
            const metaSV = Math.round(metaTotal * (1 - PROPORTION_VYV));

            const regVyV = Math.round(regTotal * PROPORTION_VYV);
            const regSV = Math.round(regTotal * (1 - PROPORTION_VYV));

            const cumplimiento = metaTotal > 0 ? ((regTotal / metaTotal) * 100).toFixed(2) : "0";

            return {
                "Entidad": d.name,
                [`Total ${labelRegVyV}`]: regVyV,
                [`Total ${labelRegSV}`]: regSV,
                [labelMetaVyV]: metaVyV,
                [labelMetaSV]: metaSV,
                [labelPct]: `${cumplimiento}%`
            };
        });

        // Crear Libro y Hoja
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(excelData);

        // Ajustar anchos de columna automáticamente
        const wscols = [
            { wch: 30 }, // Entidad
            { wch: 15 }, // Reg V&V
            { wch: 15 }, // Reg SV
            { wch: 15 }, // Meta V&V
            { wch: 15 }, // Meta SV
            { wch: 15 }  // Avance
        ];
        ws['!cols'] = wscols;

        XLSX.utils.book_append_sheet(wb, ws, "Reporte SIGA");

        // Generar archivo
        XLSX.writeFile(wb, `Reporte_SIGA_${reporteTipo}_${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    // --- RENDERIZADO ---
    if (loading) return <div className="p-10 text-center text-slate-500">Cargando Intelligence Hub...</div>;

    return (
        <div key="monitor-hub" className="min-h-screen bg-slate-50 relative overflow-hidden p-3 sm:p-6 pb-20">
            {/* Background Mesh Gradient */}
            <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-emerald-50/50 to-transparent pointer-events-none" />
            {/* --- HEADER SUPERIOR: FILTROS MAESTROS (Oculto al imprimir) --- */}
            <header className="relative bg-white/80 backdrop-blur-xl rounded-2xl sm:rounded-3xl shadow-lg shadow-slate-900/5 border border-white/20 p-3 sm:p-6 mb-4 sm:mb-8 sticky top-2 sm:top-4 z-40 print:hidden">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 sm:gap-6">
                    <div>
                        <h1 className="text-lg sm:text-2xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                            <BarChart3 className="h-5 w-5 sm:h-8 sm:w-8 text-emerald-500" />
                            Intelligence Hub
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-400 font-medium">Centro de Reportes Unificado</p>
                    </div>

                    <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                {alcance === "GLOBAL" && <Map className="h-4 w-4 text-slate-400" />}
                                {alcance === "SUCURSAL" && <Building2 className="h-4 w-4 text-emerald-500" />}
                                {alcance === "ASESOR" && <UserCircle2 className="h-4 w-4 text-blue-500" />}
                            </div>
                            <select
                                value={alcance}
                                onChange={(e) => {
                                    setAlcance(e.target.value as Alcance);
                                    setSelectedSucursalId(null);
                                    setSelectedAsesorId(null);
                                }}
                                className="pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 appearance-none min-w-[180px] cursor-pointer"
                            >
                                <option value="GLOBAL">Corporativo (Todo)</option>
                                <option value="SUCURSAL">Por Sucursal</option>
                                {reporteTipo !== 'TOP' && <option value="ASESOR">Por Colaborador</option>}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                        </div>

                        {alcance === "SUCURSAL" && (
                            <div className="relative">
                                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <select
                                    value={selectedSucursalId || ""}
                                    onChange={(e) => setSelectedSucursalId(Number(e.target.value))}
                                    className="pl-10 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 min-w-[200px]"
                                >
                                    <option value="">Seleccionar Sede...</option>
                                    {sucursales.map(s => (
                                        <option key={s.id} value={s.id}>{s.nombre}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {alcance === "ASESOR" && (
                            <div className="relative">
                                <UserCircle2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <select
                                    value={selectedAsesorId || ""}
                                    onChange={(e) => setSelectedAsesorId(Number(e.target.value))}
                                    className="pl-10 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 min-w-[240px]"
                                >
                                    <option value="">Buscar Colaborador...</option>
                                    {asesores.sort((a, b) => a.nombreCompleto.localeCompare(b.nombreCompleto)).map(a => (
                                        <option key={a.id} value={a.id}>{a.nombreCompleto}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-3 sm:mt-6 border-b border-slate-100 pb-2">
                    {[
                        { id: "GESTION", label: "Gestión", icon: TrendingUp },
                        { id: "PADRON", label: "Padrón", icon: FileText },
                        { id: "ASISTENCIA", label: "En Vivo", icon: CheckCircle2 },
                        { id: "TOP", label: "Rankings", icon: AlertCircle },
                        { id: "SIN_CARGA", label: "Sin Carga", icon: UserX },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => {
                                setReporteTipo(tab.id as ReporteTipo);
                                if (tab.id === 'TOP' && alcance === 'ASESOR') {
                                    setAlcance('GLOBAL');
                                }
                            }}
                            className={`flex flex-1 md:flex-none items-center justify-center gap-2 px-3 md:px-5 py-2 md:py-2.5 text-[10px] md:text-sm font-bold transition-all whitespace-nowrap rounded-xl ${reporteTipo === tab.id
                                ? "bg-slate-900 text-white shadow-lg shadow-slate-900/20"
                                : "text-slate-500 bg-slate-50 md:bg-transparent hover:bg-slate-100 hover:text-slate-700"
                                }`}
                        >
                            <tab.icon className="h-3.5 w-3.5 md:h-4 w-4" />
                            {tab.label}
                        </button>
                    ))}
                </div>
            </header>

            {/* --- CONTENIDO ESPECÍFICO PARA SIN_CARGA --- */}
            {reporteTipo === 'SIN_CARGA' && (
                <main className="max-w-7xl mx-auto print:hidden">
                    {/* Filtros específicos */}
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 mb-6">
                        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <UserX className="h-5 w-5 text-red-500" />
                                Usuarios Sin Carga
                            </h3>
                            <div className="flex flex-wrap gap-4 ml-auto">
                                {/* Toggle Solo Asesores */}
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={soloAsesores}
                                        onChange={(e) => setSoloAsesores(e.target.checked)}
                                        className="w-4 h-4 text-emerald-500 rounded focus:ring-emerald-500"
                                    />
                                    <span className="text-sm font-medium text-slate-600">Solo Asesores</span>
                                </label>
                                {/* Selector Sucursal */}
                                <select
                                    value={selectedSucursalId || ""}
                                    onChange={(e) => setSelectedSucursalId(e.target.value ? Number(e.target.value) : null)}
                                    className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500"
                                >
                                    <option value="">Todas las Sucursales</option>
                                    {sucursales.map(s => (
                                        <option key={s.id} value={s.id}>{s.nombre}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Tarjeta Resumen */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                        <div className="bg-gradient-to-br from-red-50 to-white p-6 rounded-3xl shadow-sm border border-red-100 relative group overflow-hidden">
                            <div className="absolute right-0 top-0 p-4 opacity-10">
                                <UserX size={60} />
                            </div>
                            <p className="text-red-400 text-xs font-bold uppercase tracking-wider mb-2">Usuarios Sin Carga</p>
                            <h3 className="text-4xl font-black text-red-600">{usuariosSinCarga.length}</h3>
                            <div className="mt-2 text-xs text-red-500 font-medium">
                                {soloAsesores ? 'Solo Asesores' : 'Todos los Usuarios'}
                                {selectedSucursalId ? ` | ${sucursales.find(s => s.id === selectedSucursalId)?.nombre}` : ' | Todas las Sucursales'}
                            </div>
                        </div>
                    </div>

                    {/* Tabla de Usuarios */}
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6">
                            <h3 className="text-lg font-bold text-slate-800">Listado de Usuarios</h3>
                            <div className="flex gap-2">
                                <button
                                    onClick={async () => {
                                        const token = localStorage.getItem("token");
                                        const params = new URLSearchParams();
                                        params.append('soloAsesores', String(soloAsesores));
                                        if (selectedSucursalId) params.append('sucursalId', String(selectedSucursalId));
                                        try {
                                            const res = await axios.get(`/api/reportes/usuarios-sin-carga/export-pdf?${params.toString()}`, {
                                                headers: { Authorization: `Bearer ${token}` },
                                                responseType: 'blob'
                                            });
                                            const url = window.URL.createObjectURL(new Blob([res.data]));
                                            const link = document.createElement('a');
                                            link.href = url;
                                            link.setAttribute('download', 'usuarios_sin_carga.pdf');
                                            document.body.appendChild(link);
                                            link.click();
                                            link.remove();
                                        } catch (err) { console.error('Error descargando PDF:', err); }
                                    }}
                                    className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-xl font-bold hover:bg-black transition-all text-sm"
                                >
                                    <Printer className="h-4 w-4" />
                                    PDF
                                </button>
                                <button
                                    onClick={async () => {
                                        const token = localStorage.getItem("token");
                                        const params = new URLSearchParams();
                                        params.append('soloAsesores', String(soloAsesores));
                                        if (selectedSucursalId) params.append('sucursalId', String(selectedSucursalId));
                                        try {
                                            const res = await axios.get(`/api/reportes/usuarios-sin-carga/export-excel?${params.toString()}`, {
                                                headers: { Authorization: `Bearer ${token}` },
                                                responseType: 'blob'
                                            });
                                            const url = window.URL.createObjectURL(new Blob([res.data]));
                                            const link = document.createElement('a');
                                            link.href = url;
                                            link.setAttribute('download', 'usuarios_sin_carga.xlsx');
                                            document.body.appendChild(link);
                                            link.click();
                                            link.remove();
                                        } catch (err) { console.error('Error descargando Excel:', err); }
                                    }}
                                    className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 transition-all text-sm"
                                >
                                    <Download className="h-4 w-4" />
                                    Excel
                                </button>
                            </div>
                        </div>

                        {loadingSinCarga ? (
                            <div className="text-center py-12 text-slate-400">Cargando...</div>
                        ) : usuariosSinCarga.length === 0 ? (
                            <div className="text-center py-12">
                                <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto mb-3" />
                                <p className="text-slate-500 font-medium">¡Excelente! Todos los usuarios tienen asignaciones.</p>
                            </div>
                        ) : (
                            <div className="overflow-auto max-h-[500px]">
                                <table className="w-full text-left text-sm">
                                    <thead className="text-xs text-slate-400 font-bold uppercase sticky top-0 bg-white shadow-sm z-10">
                                        <tr>
                                            <th className="pb-3 pl-2">#</th>
                                            <th className="pb-3">Nombre Completo</th>
                                            <th className="pb-3">Usuario</th>
                                            <th className="pb-3">Rol</th>
                                            <th className="pb-3 pr-2">Sucursal</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {usuariosSinCarga.map((u, i) => (
                                            <tr key={u.id} className="group hover:bg-red-50 transition-colors">
                                                <td className="py-3 pl-2 text-slate-400">{i + 1}</td>
                                                <td className="py-3 font-medium text-slate-700">{u.nombreCompleto}</td>
                                                <td className="py-3 text-slate-500">{u.username}</td>
                                                <td className="py-3">
                                                    <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold">
                                                        {u.rol}
                                                    </span>
                                                </td>
                                                <td className="py-3 pr-2 text-slate-500">{u.sucursal}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </main>
            )}

            {/* --- CONTENIDO DINÁMICO INTERACTIVO (Oculto al imprimir) --- */}
            {reporteTipo !== 'SIN_CARGA' && (
                <main className="max-w-7xl mx-auto print:hidden">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                        <div className="bg-gradient-to-br from-white to-slate-50/50 p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 relative group overflow-hidden hover:-translate-y-1 hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] transition-all duration-300">
                            <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                <Users size={80} />
                            </div>
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Total Registrados</p>
                            <h3 className="text-4xl font-black bg-gradient-to-br from-slate-900 to-slate-700 bg-clip-text text-transparent">{processedData.totalRegistrados.toLocaleString()}</h3>
                            <div className="mt-2 text-xs text-emerald-600 font-bold bg-emerald-50 inline-block px-2 py-1 rounded">
                                {alcance === 'GLOBAL' ? 'Total Cooperativa' : 'Sede/Operador'}
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-white to-slate-50/50 p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 relative group overflow-hidden hover:-translate-y-1 hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] transition-all duration-300">
                            <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                <TrendingUp size={80} />
                            </div>
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Total Habilitados</p>
                            <h3 className="text-4xl font-black bg-gradient-to-br from-slate-900 to-slate-700 bg-clip-text text-transparent">{processedData.totalHabilitados.toLocaleString()}</h3>
                            <div className="mt-4 w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(processedData.cumplimiento, 100)}%` }} />
                            </div>
                        </div>

                        {/* Nuevas Tarjetas Visuales */}
                        <div className="bg-gradient-to-br from-white to-slate-50/50 p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 relative group overflow-hidden hover:-translate-y-1 hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] transition-all duration-300">
                            <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                <FileText size={80} />
                            </div>
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Habilitados Voz/Voto</p>
                            <div className="flex gap-4 items-end">
                                <div>
                                    <h3 className="text-2xl font-black bg-gradient-to-br from-slate-900 to-slate-700 bg-clip-text text-transparent">{processedData.totalVoto.toLocaleString()}</h3>
                                    <div className="text-[10px] text-slate-400 font-bold uppercase">Voz y Voto</div>
                                </div>
                                <div className="h-full border-l border-slate-200 pl-4">
                                    <h3 className="text-2xl font-black text-slate-500">{processedData.totalVoz.toLocaleString()}</h3>
                                    <div className="text-[10px] text-slate-400 font-bold uppercase">Solo Voz</div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-white to-slate-50/50 p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 relative group overflow-hidden hover:-translate-y-1 hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] transition-all duration-300">
                            <div className="flex h-full items-center justify-between">
                                <div>
                                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Avance General</p>
                                    <h3 className={`text-5xl font-black ${processedData.cumplimiento >= 100 ? 'text-emerald-500' : 'bg-gradient-to-br from-blue-600 to-blue-400 bg-clip-text text-transparent'}`}>
                                        {processedData.cumplimiento.toFixed(1)}%
                                    </h3>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                        {/* --- GRAFICO PRINCIPAL (OVERVIEW) --- */}
                        <div id="chart-overview" className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 lg:col-span-2 relative overflow-hidden">
                            <div className="flex flex-col md:flex-row justify-between md:items-center gap-3 mb-6">
                                <div>
                                    <h3 className="text-base md:text-lg font-bold text-slate-800 flex items-center gap-2">
                                        <BarChart3 className="h-5 w-5 text-emerald-500" />
                                        Panorama General
                                    </h3>
                                    <p className="text-xs md:text-sm text-slate-400">Comparativa de Metas vs Realizado</p>
                                </div>
                                {/* Leyenda más compacta en móvil */}
                                <div className="flex flex-wrap gap-2">
                                    <div className="flex items-center gap-1.5 text-[10px] md:text-xs font-bold text-slate-500 bg-slate-50 px-2 md:px-3 py-1 md:py-1.5 rounded-lg">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                        {reporteTipo === 'ASISTENCIA' ? 'Presentes' : 'Registrados'}
                                    </div>
                                    <div className="flex items-center gap-1.5 text-[10px] md:text-xs font-bold text-slate-500 bg-slate-50 px-2 md:px-3 py-1 md:py-1.5 rounded-lg">
                                        <div className="w-2 h-2 rounded-full bg-slate-300"></div>
                                        Habilitados
                                    </div>
                                </div>
                            </div>

                            <div className="h-[320px] w-full">
                                <ResponsiveContainer width="100%" height="100%" minHeight={280}>
                                    <BarChart data={processedData.chartData} margin={{ top: 20, right: 30, left: 10, bottom: 20 }} barGap={8}>
                                        <defs>
                                            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                                                <stop offset="100%" stopColor="#059669" stopOpacity={1} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} stroke="#cbd5e1" />
                                        <XAxis
                                            dataKey="name"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#64748b', fontSize: 9, fontWeight: 600 }}
                                            interval={0}
                                            dy={5}
                                            angle={-35}
                                            textAnchor="end"
                                            height={80}
                                            tickFormatter={(value) => value.length > 12 ? value.substring(0, 10) + '...' : value}
                                        />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                                        <RechartsTooltip
                                            cursor={{ fill: '#f1f5f9', radius: 12 }}
                                            contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px -5px rgb(0 0 0/0.1)' }}
                                            itemStyle={{ color: '#1e293b', fontWeight: 600 }}
                                            formatter={(value: any) => value?.toLocaleString()}
                                        />
                                        <Legend iconType="circle" verticalAlign="top" height={36} wrapperStyle={{ right: 0, top: -20, fontSize: '12px', fontWeight: 600 }} />

                                        <Bar
                                            dataKey="value"
                                            name={reporteTipo === 'ASISTENCIA' ? 'Presentes' : 'Registrados'}
                                            fill="url(#barGradient)"
                                            radius={[6, 6, 6, 6]}
                                            barSize={20}
                                            className="drop-shadow-sm"
                                        />
                                        <Bar
                                            dataKey="meta"
                                            name="Habilitados"
                                            fill="#e2e8f0"
                                            radius={[6, 6, 6, 6]}
                                            barSize={20}
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* --- DONUT CHART (DISTRIBUTION) --- */}
                        <div id="chart-distribution" className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col justify-center relative">
                            <h3 className="text-lg font-bold text-slate-800 mb-2">Distribución</h3>
                            <p className="text-sm text-slate-400 mb-4">{reporteTipo === 'ASISTENCIA' ? 'Presentes vs Ausentes' : 'Voz y Voto vs Solo Voz'}</p>

                            <div className="h-[250px] w-full relative">
                                <ResponsiveContainer width="100%" height="100%" minHeight={200}>
                                    <RechartsPieChart>
                                        <Pie
                                            data={
                                                reporteTipo === 'ASISTENCIA'
                                                    ? [{ name: 'Presentes', value: processedData.totalPresentes }, { name: 'Ausentes', value: processedData.totalAusentes }]
                                                    : [{ name: 'Voz y Voto', value: processedData.totalVoto }, { name: 'Solo Voz', value: processedData.totalVoz }]
                                            }
                                            cx="50%" cy="50%"
                                            innerRadius={70} outerRadius={90}
                                            paddingAngle={5}
                                            dataKey="value"
                                            cornerRadius={8}
                                        >
                                            <Cell fill={COLORS.primary} />
                                            <Cell fill={COLORS.warning} />
                                        </Pie>
                                        <RechartsTooltip />
                                    </RechartsPieChart>
                                </ResponsiveContainer>
                                {/* Center Text */}
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                    <span className="text-3xl font-black text-slate-800">
                                        {reporteTipo === 'ASISTENCIA' ? processedData.quorum.toFixed(0) : processedData.cumplimiento.toFixed(0)}%
                                    </span>
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                        {reporteTipo === 'ASISTENCIA' ? 'Quorum' : 'Avance'}
                                    </span>
                                </div>
                            </div>
                            <div className="flex justify-center gap-6 mt-2">
                                <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                                    <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                                    {reporteTipo === 'ASISTENCIA' ? 'Presentes' : 'Voz y Voto'}
                                </div>
                                <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                                    <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                                    {reporteTipo === 'ASISTENCIA' ? 'Ausentes' : 'Solo Voz'}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* --- TABLA DE DETALLE - Mobile optimized with horizontal scroll --- */}
                        <div className="bg-white p-4 md:p-6 rounded-[2rem] shadow-sm border border-slate-100 lg:col-span-2 flex flex-col h-[400px]">
                            <div className="flex flex-col md:flex-row justify-between md:items-center gap-3 mb-4 md:mb-6">
                                <h3 className="text-base md:text-lg font-bold text-slate-800">Desglose Detallado</h3>
                                <button onClick={handleExportExcel} className="text-xs font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg transition-colors touch-manipulation active:scale-95 w-full md:w-auto text-center">
                                    Exportar Datos
                                </button>
                            </div>
                            {/* Scroll horizontal para móvil */}
                            <div className="flex-1 overflow-auto custom-scrollbar">
                                <table className="w-full text-left text-sm min-w-[400px]">
                                    <thead className="text-[10px] md:text-xs text-slate-400 font-bold uppercase sticky top-0 bg-white shadow-sm z-10">
                                        <tr>
                                            <th className="pb-3 pl-2 whitespace-nowrap">Entidad</th>
                                            <th className="pb-3 text-right whitespace-nowrap">Real.</th>
                                            <th className="pb-3 text-right whitespace-nowrap">Meta</th>
                                            <th className="pb-3 text-right pr-2 whitespace-nowrap">Avance</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {processedData.chartData.map((d: any, i) => (
                                            <tr key={i} className="group hover:bg-slate-50 transition-colors">
                                                <td className="py-3 pl-2 font-medium text-slate-600">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-slate-300 text-[10px] font-mono group-hover:text-emerald-400">#{i + 1}</span>
                                                        <span className="truncate max-w-[120px] md:max-w-[180px]" title={d.name}>{d.name}</span>
                                                    </div>
                                                </td>
                                                <td className="py-3 text-right font-bold text-slate-800 whitespace-nowrap">{d.value.toLocaleString()}</td>
                                                <td className="py-3 text-right text-slate-400 text-xs whitespace-nowrap">{d.meta.toLocaleString()}</td>
                                                <td className="py-3 text-right pr-2">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <span className={`text-xs font-bold whitespace-nowrap ${(d.meta > 0 && d.value >= d.meta) ? 'text-emerald-600' : 'text-slate-500'}`}>
                                                            {d.meta > 0 ? Math.round((d.value / d.meta) * 100) : 0}%
                                                        </span>
                                                        <div className="w-10 md:w-12 h-1 bg-slate-100 rounded-full overflow-hidden hidden md:block">
                                                            <div
                                                                className={`h-full rounded-full ${(d.meta > 0 && d.value >= d.meta) ? 'bg-emerald-500' : 'bg-slate-300'}`}
                                                                style={{ width: `${Math.min(100, (d.meta > 0 ? (d.value / d.meta) * 100 : 0))}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* --- SECONDARY AREA CHART (TREND/WAVE) & ACTIONS --- */}
                        <div className="flex flex-col gap-6">
                            <div className="bg-indigo-600 p-6 rounded-[2rem] shadow-lg shadow-indigo-500/20 text-white relative overflow-hidden flex-1">
                                <div className="relative z-10">
                                    <h3 className="text-lg font-bold mb-1">Tendencia de Datos</h3>
                                    <p className="text-indigo-200 text-sm mb-4">Comportamiento del registro en tiempo real.</p>
                                </div>
                                <div className="absolute bottom-0 left-0 right-0 h-32">
                                    <ResponsiveContainer width="100%" height="100%" minHeight={100}>
                                        <AreaChart data={processedData.chartData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#fff" stopOpacity={0.4} />
                                                    <stop offset="95%" stopColor="#fff" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <Area type="monotone" dataKey="value" stroke="#fff" strokeWidth={3} fillOpacity={1} fill="url(#colorTrend)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* --- BOTONES DE ACCIÓN FLOTANTES --- */}
                            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col gap-4">
                                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest text-center">Exportar Reporte</h3>
                                <div className="flex gap-2 p-1 bg-slate-50 rounded-xl justify-center mb-2">
                                    <button
                                        onClick={() => setOrientation('landscape')}
                                        className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${orientation === 'landscape' ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}
                                    >
                                        Horizontal
                                    </button>
                                    <button
                                        onClick={() => setOrientation('portrait')}
                                        className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${orientation === 'portrait' ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}
                                    >
                                        Vertical
                                    </button>
                                </div>
                                <button
                                    onClick={handleDownloadDirectPDF}
                                    className="w-full py-3 bg-slate-800 text-white rounded-xl font-bold hover:bg-black transition-all flex items-center justify-center gap-3 shadow-lg shadow-slate-900/10 active:scale-95"
                                >
                                    <Printer className="h-4 w-4" />
                                    Vista PDF
                                </button>
                                <button
                                    onClick={handleExportExcel}
                                    className="w-full py-3 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 transition-all flex items-center justify-center gap-3 shadow-lg shadow-emerald-500/20 active:scale-95"
                                >
                                    <Download className="h-4 w-4" />
                                    Excel
                                </button>
                            </div>
                        </div>
                    </div>
                </main>
            )}

            {/* --- REPORTE IMPRIMIBLE OCULTO (Solo visible al imprimir) --- */}
            <div className="hidden print:block bg-white p-8" id="reporte-for-pdf">
                <style jsx global>{`
                    @media print {
                        @page { margin: 1cm; size: landscape; }
                        header, .print\\:hidden { display: none !important; }
                        body { background: white !important; }
                        .shadow-sm, .shadow-md, .shadow-lg { box-shadow: none !important; }
                        .bg-slate-50\\/50 { background: white !important; }
                    }
                `}</style>
                {/* 
                    Este div se mantiene 'por si acaso' se quisiera imprimir nativo, 
                    pero la funcionalidad principal ahora es el PDF generado por JS. 
                */}
            </div>
        </div>
    );
}
