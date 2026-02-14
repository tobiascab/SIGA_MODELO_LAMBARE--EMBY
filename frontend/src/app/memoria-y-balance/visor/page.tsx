'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FileText, LogOut, ChevronLeft, ChevronRight,
    ZoomIn, ZoomOut, ChevronLast, ChevronFirst, Download,
    Search, X, Loader2
} from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configuración se hace dentro del componente para Next.js

// URL del PDF
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8585';
const PDF_URL = `${API_URL}/uploads/memoria-balance/memoria-2024.pdf`;

interface SocioData {
    numeroSocio: string;
    nombreCompleto: string;
    sucursal: string;
}

export default function MemoriaBalanceVisor() {
    const [socioData, setSocioData] = useState<SocioData | null>(null);
    const [loading, setLoading] = useState(true);
    const [numPages, setNumPages] = useState(0);
    const [currentPage, setCurrentPage] = useState(1); // Para móvil
    const [currentSpread, setCurrentSpread] = useState(0); // Para desktop
    const [scale, setScale] = useState(1.0);
    const [isMobile, setIsMobile] = useState(false);
    const [pageWidth, setPageWidth] = useState(400);
    const [flipDirection, setFlipDirection] = useState<'left' | 'right' | null>(null);

    // Estados para búsqueda y salto de página
    const [jumpPageInput, setJumpPageInput] = useState('');
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<{ page: number; text: string }[]>([]);
    const [currentSearchIndex, setCurrentSearchIndex] = useState(-1);
    const [searching, setSearching] = useState(false);
    const [pdfDocument, setPdfDocument] = useState<any>(null);

    const router = useRouter();

    // Páginas en desktop (spread)
    const leftPage = currentSpread * 2 + 1;
    const rightPage = currentSpread * 2 + 2;
    const totalSpreads = Math.ceil(numPages / 2);

    // Páginas a pre-renderizar
    const pagesToPrerender = useMemo(() => {
        if (isMobile) {
            // En móvil, pre-renderizar página actual ± 1
            const pages: number[] = [];
            for (let p = Math.max(1, currentPage - 1); p <= Math.min(numPages, currentPage + 1); p++) {
                pages.push(p);
            }
            return pages;
        } else {
            // En desktop, pre-renderizar spread actual ± 1
            const pages: number[] = [];
            for (let s = Math.max(0, currentSpread - 1); s <= Math.min(totalSpreads - 1, currentSpread + 1); s++) {
                const lp = s * 2 + 1;
                const rp = s * 2 + 2;
                if (lp <= numPages) pages.push(lp);
                if (rp <= numPages) pages.push(rp);
            }
            return pages;
        }
    }, [currentPage, currentSpread, numPages, isMobile, totalSpreads]);

    // Detectar móvil y ajustar ancho
    useEffect(() => {
        const updateLayout = () => {
            const mobile = window.innerWidth < 768;
            setIsMobile(mobile);

            if (mobile) {
                // Móvil: página ocupa casi todo el ancho
                setPageWidth(Math.min(window.innerWidth - 32, 500));
            } else {
                // Desktop: cada página es la mitad del espacio
                const availableWidth = window.innerWidth - 100;
                setPageWidth(Math.min(availableWidth / 2, 450));
            }
        };
        updateLayout();
        window.addEventListener('resize', updateLayout);
        return () => window.removeEventListener('resize', updateLayout);
    }, []);

    // Configurar worker y verificar autenticación
    useEffect(() => {
        // Configurar el worker de PDF.js localmente
        pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

        const token = localStorage.getItem('memoria_token');
        const socioDataStr = localStorage.getItem('memoria_socio');

        if (!token || !socioDataStr) {
            router.push('/memoria-y-balance');
            return;
        }

        setSocioData(JSON.parse(socioDataStr));
        setLoading(false);
    }, [router]);

    const onDocumentLoadSuccess = (pdf: any) => {
        console.log(`PDF cargado: ${pdf.numPages} páginas`);
        setNumPages(pdf.numPages);
        setPdfDocument(pdf);
    };

    const handleJumpPage = (e: React.FormEvent) => {
        e.preventDefault();
        const page = parseInt(jumpPageInput);
        if (isNaN(page) || page < 1 || page > numPages) {
            setJumpPageInput('');
            return;
        }

        if (isMobile) {
            setCurrentPage(page);
        } else {
            const spread = Math.floor((page - 1) / 2);
            setFlipDirection(spread > currentSpread ? 'right' : 'left');
            setCurrentSpread((s: number) => spread);
        }
        setJumpPageInput('');
    };

    const performSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery.trim() || !pdfDocument) return;

        setSearching(true);
        setSearchResults([]);
        setCurrentSearchIndex(-1);

        const results = [];
        const query = searchQuery.toLowerCase();

        try {
            for (let i = 1; i <= numPages; i++) {
                const page = await pdfDocument.getPage(i);
                const textContent = await page.getTextContent();
                const text = textContent.items.map((item: any) => item.str).join(' ');

                if (text.toLowerCase().includes(query)) {
                    results.push({ page: i, text });
                }
            }

            setSearchResults(results);
            if (results.length > 0) {
                setCurrentSearchIndex(0);
                navigateToPage(results[0].page);
            }
        } catch (error) {
            console.error('Error buscando:', error);
        } finally {
            setSearching(false);
        }
    };

    const navigateToPage = (page: number) => {
        if (isMobile) {
            setCurrentPage(page);
        } else {
            const spread = Math.floor((page - 1) / 2);
            setFlipDirection(spread > currentSpread ? 'right' : 'left');
            setCurrentSpread((prev: number) => spread);
        }
    };

    const nextSearchResult = () => {
        if (searchResults.length === 0) return;
        const nextIndex = (currentSearchIndex + 1) % searchResults.length;
        setCurrentSearchIndex(nextIndex);
        navigateToPage(searchResults[nextIndex].page);
    };

    const prevSearchResult = () => {
        if (searchResults.length === 0) return;
        const prevIndex = (currentSearchIndex - 1 + searchResults.length) % searchResults.length;
        setCurrentSearchIndex(prevIndex);
        navigateToPage(searchResults[prevIndex].page);
    };

    const handleLogout = () => {
        localStorage.removeItem('memoria_token');
        localStorage.removeItem('memoria_socio');
        router.push('/memoria-y-balance');
    };

    // Navegación MÓVIL (una página a la vez)
    const goNextMobile = () => {
        if (currentPage < numPages) {
            setCurrentPage((p: number) => p + 1);
        }
    };
    const goPrevMobile = () => {
        if (currentPage > 1) {
            setCurrentPage((p: number) => p - 1);
        }
    };

    // Navegación DESKTOP (spread de dos páginas)
    const goNextDesktop = () => {
        if (currentSpread < totalSpreads - 1) {
            setFlipDirection('right');
            setCurrentSpread((s: number) => s + 1);
        }
    };
    const goPrevDesktop = () => {
        if (currentSpread > 0) {
            setFlipDirection('left');
            setCurrentSpread((s: number) => s - 1);
        }
    };
    const goFirst = () => {
        if (isMobile) {
            setCurrentPage(1);
        } else {
            setFlipDirection('left');
            setCurrentSpread(0);
        }
    };
    const goLast = () => {
        if (isMobile) {
            setCurrentPage(numPages);
        } else {
            setFlipDirection('right');
            setCurrentSpread(totalSpreads - 1);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-emerald-50">
                <div className="w-16 h-16 border-4 border-emerald-100 border-t-emerald-500 rounded-full animate-spin mb-4"></div>
                <p className="text-emerald-700 font-bold animate-pulse">Preparando documento...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-emerald-100 overflow-y-auto">
            {/* Header */}
            <nav className="bg-white/95 backdrop-blur-md border-b border-emerald-100 px-3 md:px-6 py-2 md:py-3 flex items-center justify-between sticky top-0 z-50 shadow-sm">
                <div className="flex items-center gap-2 md:gap-3">
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:xl bg-emerald-100 flex items-center justify-center">
                        <FileText className="w-4 h-4 md:w-5 md:h-5 text-emerald-600" />
                    </div>
                    <div className="flex flex-col">
                        <h1 className="text-[10px] md:text-lg font-bold text-emerald-900 leading-tight">Memoria y Balance 2025</h1>
                        <p className="text-[9px] text-emerald-500 font-bold uppercase overflow-hidden whitespace-nowrap text-ellipsis max-w-[120px]">
                            {socioData?.nombreCompleto}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-1.5 md:gap-4">
                    {!isMobile && (
                        <div className="hidden md:flex flex-col text-right mr-2">
                            <span className="text-sm font-bold text-emerald-900">{socioData?.nombreCompleto}</span>
                            <span className="text-[10px] text-emerald-500">SOCIO N° {socioData?.numeroSocio}</span>
                        </div>
                    )}

                    <a
                        href={PDF_URL}
                        download="Memoria-Balance-2025.pdf"
                        className="flex items-center gap-1.5 px-2.5 md:px-4 py-1.5 md:py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-all text-xs md:text-sm font-bold shadow-lg shadow-emerald-200"
                    >
                        <Download className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Descargar</span>
                    </a>

                    <button
                        onClick={() => setIsSearchOpen(!isSearchOpen)}
                        className={`p-1.5 md:p-2 rounded-lg transition-all border ${isSearchOpen ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-white hover:bg-emerald-50 text-emerald-600 border-emerald-100'}`}
                        title="Buscar palabra"
                    >
                        <Search className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    </button>

                    <button
                        onClick={handleLogout}
                        className="p-1.5 md:p-2 bg-rose-50 hover:bg-rose-100 text-rose-500 rounded-lg transition-all border border-rose-100"
                    >
                        <LogOut className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    </button>
                </div>
            </nav>

            {/* Buscador Expandible */}
            <AnimatePresence>
                {isSearchOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="bg-white border-b border-emerald-100 shadow-sm overflow-hidden sticky top-[53px] md:top-[65px] z-40"
                    >
                        <div className="max-w-4xl mx-auto px-3 py-2 md:py-3">
                            <form onSubmit={performSearch} className="flex items-center gap-2">
                                <div className="relative flex-1">
                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-emerald-400" />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Buscar..."
                                        className="w-full pl-8 pr-3 py-1.5 bg-emerald-50/50 border border-emerald-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs md:text-sm"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={searching}
                                    className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs md:text-sm font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {searching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Buscar'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsSearchOpen(false);
                                        setSearchQuery('');
                                        setSearchResults([]);
                                    }}
                                    className="p-1.5 text-gray-400 hover:text-rose-500 transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </form>

                            {/* Resultados de búsqueda */}
                            {searchResults.length > 0 && (
                                <div className="mt-2 flex items-center justify-between bg-emerald-50 p-1.5 rounded-lg border border-emerald-100">
                                    <p className="text-[10px] md:text-xs text-emerald-800 font-medium">
                                        <span className="font-bold">{searchResults.length}</span> resultados
                                    </p>
                                    <div className="flex items-center gap-1">
                                        <span className="text-[10px] md:text-xs text-emerald-600 font-bold mr-1">
                                            {currentSearchIndex + 1} / {searchResults.length}
                                        </span>
                                        <button onClick={prevSearchResult} className="p-1 hover:bg-white rounded transition-colors text-emerald-600">
                                            <ChevronLeft className="w-3.5 h-3.5" />
                                        </button>
                                        <button onClick={nextSearchResult} className="p-1 hover:bg-white rounded transition-colors text-emerald-600">
                                            <ChevronRight className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Contenedor Principal */}
            <div className="flex flex-col items-center justify-start py-2 md:py-8 px-2 md:px-4" style={{ minHeight: 'calc(100vh - 53px)' }}>
                {/* Controles superiores compactos para móvil */}
                <div className="mb-2 md:mb-6 flex items-center gap-1.5 md:gap-4 px-3 md:px-6 py-1.5 md:py-3 bg-white/80 backdrop-blur rounded-full border border-emerald-100 shadow-lg shadow-emerald-100/50">
                    <button onClick={goFirst} disabled={isMobile ? currentPage === 1 : currentSpread === 0} className="p-1 md:p-2 text-emerald-600 hover:text-emerald-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                        <ChevronFirst className="w-4 h-4 md:w-5 md:h-5" />
                    </button>
                    <button onClick={isMobile ? goPrevMobile : goPrevDesktop} disabled={isMobile ? currentPage === 1 : currentSpread === 0} className="p-1 md:p-2 text-emerald-600 hover:text-emerald-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                        <ChevronLeft className="w-4 h-4 md:w-5 md:h-5" />
                    </button>

                    <div className="px-2 md:px-4 py-0.5 md:py-1 bg-emerald-50 rounded-full border border-emerald-100">
                        <span className="text-[11px] md:text-sm font-bold text-emerald-900">
                            {isMobile ? (
                                <>{currentPage} / {numPages}</>
                            ) : (
                                <>{leftPage}{rightPage <= numPages ? ` - ${rightPage}` : ''} / {numPages}</>
                            )}
                        </span>
                    </div>

                    <button onClick={isMobile ? goNextMobile : goNextDesktop} disabled={isMobile ? currentPage === numPages : currentSpread >= totalSpreads - 1} className="p-1 md:p-2 text-emerald-600 hover:text-emerald-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                        <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />
                    </button>
                    <button onClick={goLast} disabled={isMobile ? currentPage === numPages : currentSpread >= totalSpreads - 1} className="p-1 md:p-2 text-emerald-600 hover:text-emerald-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                        <ChevronLast className="w-4 h-4 md:w-5 md:h-5" />
                    </button>
                </div>

                {/* Documento PDF */}
                <Document
                    file={PDF_URL}
                    onLoadSuccess={onDocumentLoadSuccess}
                    loading={
                        <div className="flex flex-col items-center gap-4 p-10 md:p-20 bg-white rounded-2xl shadow-xl border border-emerald-50 my-4">
                            <div className="w-12 h-12 border-4 border-emerald-100 border-t-emerald-500 rounded-full animate-spin"></div>
                            <p className="text-sm text-emerald-600 font-bold">Cargando documento...</p>
                        </div>
                    }
                    error={
                        <div className="p-10 bg-red-50 border border-red-200 rounded-2xl text-center my-4">
                            <p className="text-red-500 font-bold">Error al cargar el documento</p>
                        </div>
                    }
                >
                    {numPages > 0 && (
                        <>
                            {/* ========== VISTA MÓVIL: Una página grande ========== */}
                            {isMobile ? (
                                <div
                                    key={`page-${currentPage}`}
                                    className="bg-white rounded-xl shadow-2xl shadow-emerald-200/50 border border-emerald-100 my-6 relative z-10"
                                    style={{ minHeight: '500px', minWidth: pageWidth }}
                                >
                                    <Page
                                        pageNumber={currentPage}
                                        width={pageWidth}
                                        renderTextLayer={false}
                                        renderAnnotationLayer={false}
                                        renderMode="canvas"
                                        loading={
                                            <div className="flex flex-col items-center justify-center bg-emerald-50/50 p-10 rounded-xl" style={{ width: pageWidth, height: pageWidth * 1.41 }}>
                                                <div className="w-10 h-10 border-4 border-emerald-100 border-t-emerald-500 rounded-full animate-spin mb-3"></div>
                                                <span className="text-sm text-emerald-600 font-bold">Cargando página {currentPage}...</span>
                                            </div>
                                        }
                                        error={
                                            <div className="flex items-center justify-center bg-rose-50 p-10 rounded-xl text-rose-500 font-bold" style={{ width: pageWidth, height: pageWidth * 1.41 }}>
                                                Error al renderizar página {currentPage}
                                            </div>
                                        }
                                    />
                                </div>
                            ) : (
                                /* ========== VISTA DESKTOP: Libro con dos páginas ========== */
                                <div
                                    className="relative my-4"
                                    style={{ transform: `scale(${scale})`, transformOrigin: 'top center' }}
                                >
                                    <div className="flex shadow-2xl shadow-emerald-200/50 rounded-lg overflow-hidden border border-emerald-100" style={{ perspective: '2000px' }}>
                                        {/* Página izquierda */}
                                        <AnimatePresence mode="wait">
                                            <motion.div
                                                key={`left-${leftPage}`}
                                                initial={{ rotateY: flipDirection === 'left' ? -90 : 0, opacity: 0.5 }}
                                                animate={{ rotateY: 0, opacity: 1 }}
                                                exit={{ rotateY: flipDirection === 'right' ? 90 : 0, opacity: 0.5 }}
                                                transition={{ duration: 0.3, ease: 'easeOut' }}
                                                style={{ transformOrigin: 'right center', backfaceVisibility: 'hidden' }}
                                                className="bg-white"
                                            >
                                                <Page
                                                    pageNumber={leftPage}
                                                    width={pageWidth}
                                                    renderTextLayer={false}
                                                    renderAnnotationLayer={false}
                                                    renderMode="canvas"
                                                    loading={
                                                        <div className="flex items-center justify-center bg-emerald-50/50" style={{ width: pageWidth, height: pageWidth * 1.4 }}>
                                                            <div className="w-6 h-6 border-2 border-emerald-200 border-t-emerald-500 rounded-full animate-spin"></div>
                                                        </div>
                                                    }
                                                />
                                            </motion.div>
                                        </AnimatePresence>

                                        {/* Lomo del libro */}
                                        <div className="w-1 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 shadow-inner"></div>

                                        {/* Página derecha */}
                                        {rightPage <= numPages && (
                                            <AnimatePresence mode="wait">
                                                <motion.div
                                                    key={`right-${rightPage}`}
                                                    initial={{ rotateY: flipDirection === 'right' ? 90 : 0, opacity: 0.5 }}
                                                    animate={{ rotateY: 0, opacity: 1 }}
                                                    exit={{ rotateY: flipDirection === 'left' ? -90 : 0, opacity: 0.5 }}
                                                    transition={{ duration: 0.3, ease: 'easeOut' }}
                                                    style={{ transformOrigin: 'left center', backfaceVisibility: 'hidden' }}
                                                    className="bg-white"
                                                >
                                                    <Page
                                                        pageNumber={rightPage}
                                                        width={pageWidth}
                                                        renderTextLayer={false}
                                                        renderAnnotationLayer={false}
                                                        renderMode="canvas"
                                                        loading={
                                                            <div className="flex items-center justify-center bg-emerald-50/50" style={{ width: pageWidth, height: pageWidth * 1.4 }}>
                                                                <div className="w-6 h-6 border-2 border-emerald-200 border-t-emerald-500 rounded-full animate-spin"></div>
                                                            </div>
                                                        }
                                                    />
                                                </motion.div>
                                            </AnimatePresence>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Pre-renderizado inteligente adaptado */}
                            <div className="hidden" aria-hidden="true">
                                {pagesToPrerender.map(pageNum => (
                                    <Page
                                        key={`prerender-${pageNum}`}
                                        pageNumber={pageNum}
                                        width={pageWidth * 0.5} // Renderizar más pequeño para pre-carga ultra rápida
                                        renderTextLayer={false}
                                        renderAnnotationLayer={false}
                                        renderMode="canvas"
                                    />
                                ))}
                            </div>
                        </>
                    )}
                </Document>

                {/* Navegación flotante inferior compacta */}
                <div className="mt-3 md:mt-8 flex items-center gap-2 md:gap-4 mb-8">
                    <button
                        onClick={isMobile ? goPrevMobile : goPrevDesktop}
                        disabled={isMobile ? currentPage === 1 : currentSpread === 0}
                        className="p-2 md:p-4 bg-emerald-100 hover:bg-emerald-200 text-emerald-600 rounded-full disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-md md:shadow-lg shadow-emerald-100"
                    >
                        <ChevronLeft className="w-5 h-5 md:w-8 md:h-8" />
                    </button>

                    <div className="px-3 md:px-6 py-1.5 md:py-3 bg-white/90 backdrop-blur rounded-full shadow-md md:shadow-lg border border-emerald-100 flex items-center gap-2 md:gap-3">
                        <span className="hidden sm:inline text-[10px] md:text-xs font-bold text-emerald-500 uppercase tracking-wider">Ir a:</span>
                        <form onSubmit={handleJumpPage} className="flex items-center">
                            <input
                                type="text"
                                value={jumpPageInput}
                                onChange={(e) => setJumpPageInput(e.target.value.replace(/\D/g, ''))}
                                placeholder={isMobile ? `${currentPage}` : `${leftPage}`}
                                className="w-8 md:w-12 text-center bg-emerald-50 border border-emerald-100 rounded-lg py-0.5 md:py-1 text-xs md:text-sm font-black text-emerald-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                            />
                        </form>
                        <div className="h-4 w-[1px] bg-emerald-100 mx-1"></div>
                        <span className="text-xs md:text-lg font-black text-emerald-900 whitespace-nowrap">
                            {isMobile ? (
                                <>Pág. {currentPage} / {numPages}</>
                            ) : (
                                <>Págs. {leftPage}{rightPage <= numPages ? ` - ${rightPage}` : ''} / {numPages}</>
                            )}
                        </span>
                    </div>

                    <button
                        onClick={isMobile ? goNextMobile : goNextDesktop}
                        disabled={isMobile ? currentPage === numPages : currentSpread >= totalSpreads - 1}
                        className="p-2 md:p-4 bg-emerald-100 hover:bg-emerald-200 text-emerald-600 rounded-full disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-md md:shadow-lg shadow-emerald-100"
                    >
                        <ChevronRight className="w-5 h-5 md:w-8 md:h-8" />
                    </button>
                </div>
            </div>
        </div>
    );
}
