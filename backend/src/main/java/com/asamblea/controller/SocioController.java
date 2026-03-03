 package com.asamblea.controller;

import com.asamblea.model.ImportacionHistorial;
import com.asamblea.model.Socio;
import com.asamblea.model.Sucursal;
import com.asamblea.repository.AsistenciaRepository;
import com.asamblea.repository.ImportacionHistorialRepository;
import com.asamblea.repository.SocioRepository;
import com.asamblea.repository.SucursalRepository;
import com.asamblea.service.ImportacionService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.core.Authentication;

import java.util.*;

@RestController
@RequestMapping("/api/socios")
@RequiredArgsConstructor
@SuppressWarnings("null")
public class SocioController {

    private final ImportacionService importacionService;
    private final SocioRepository socioRepository;
    private final SucursalRepository sucursalRepository;
    private final AsistenciaRepository asistenciaRepository;
    private final ImportacionHistorialRepository importacionHistorialRepository;
    private final com.asamblea.service.LogAuditoriaService auditService;
    private final com.asamblea.repository.UsuarioRepository usuarioRepository;
    private final org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;

    @PostMapping("/import")
    public ResponseEntity<?> importExcel(@RequestParam("file") MultipartFile file, Authentication auth) {
        try {
            // Inicia el proceso asincrono y retorna un ID
            String username = auth != null ? auth.getName() : "SISTEMA";
            String processId = importacionService.iniciarImportacion(file, username, com.asamblea.model.ImportType.PADRON_COMPLETO);
            return ResponseEntity.ok(Map.of("processId", processId));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/import/complementary")
    public ResponseEntity<?> importExcelComplementary(@RequestParam("file") MultipartFile file, Authentication auth) {
        try {
            // Inicia el proceso asincrono en modo COMPLEMENTARIO (Solo rellenar huecos)
            String username = auth != null ? auth.getName() : "SISTEMA";
            String processId = importacionService.iniciarImportacion(file, username, com.asamblea.model.ImportType.SOLO_FALTANTES);
            return ResponseEntity.ok(Map.of("processId", processId));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/import/update-contacts")
    public ResponseEntity<?> importExcelUpdateContacts(@RequestParam("file") MultipartFile file, Authentication auth) {
        try {
            // Inicia el proceso asincrono en modo ACTUALIZACION (Upsert sin invalidar)
            String username = auth != null ? auth.getName() : "SISTEMA";
            String processId = importacionService.iniciarImportacion(file, username, com.asamblea.model.ImportType.ACTUALIZACION_DATOS);
            return ResponseEntity.ok(Map.of("processId", processId));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/import-progress/{id}")
    public ResponseEntity<?> checkImportProgress(@PathVariable String id) {
        return ResponseEntity.ok(importacionService.getStatus(id));
    }

    @PostMapping("/import/cancel/{id}")
    public ResponseEntity<?> cancelImport(@PathVariable String id) {
        importacionService.cancelarImportacion(id);
        return ResponseEntity.ok(Map.of("message", "Cancelación solicitada"));
    }

    // Historial de importaciones
    @GetMapping("/import-history")
    public ResponseEntity<List<ImportacionHistorial>> getImportHistory() {
        return ResponseEntity.ok(importacionHistorialRepository.findTop10ByOrderByFechaImportacionDesc());
    }

    // Descargar archivo de importación por ID de historial
    @GetMapping("/import-history/{id}/download")
    public ResponseEntity<?> downloadImportFile(@PathVariable Long id) {
        return importacionHistorialRepository.findById(id).map(historial -> {
            if (historial.getArchivoRuta() == null || historial.getArchivoRuta().isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(java.util.Map.of("error", "Archivo no disponible para esta importación"));
            }

            java.io.File file = new java.io.File(historial.getArchivoRuta());
            if (!file.exists()) {
                return ResponseEntity.notFound().build();
            }

            try {
                org.springframework.core.io.Resource resource = new org.springframework.core.io.FileSystemResource(
                        file);
                String filename = historial.getArchivoNombre() != null ? historial.getArchivoNombre()
                        : "importacion.xlsx";

                return ResponseEntity.ok()
                        .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION,
                                "attachment; filename=\"" + filename + "\"")
                        .header(org.springframework.http.HttpHeaders.CONTENT_TYPE,
                                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
                        .body(resource);
            } catch (Exception e) {
                return ResponseEntity.internalServerError().body(java.util.Map.of("error", e.getMessage()));
            }
        }).orElse(ResponseEntity.notFound().build());
    }

    // Listar todos los socios con paginación y filtros
    @GetMapping
    public ResponseEntity<org.springframework.data.domain.Page<com.asamblea.dto.SocioDTO>> listarTodos(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String estado,
            @RequestParam(required = false) String numeroSocio,
            @RequestParam(required = false) String nombre,
            @RequestParam(required = false) String telefono,
            @RequestParam(required = false) Long sucursalId) {
        Pageable pageable = PageRequest.of(page, size);
        org.springframework.data.domain.Page<Socio> sociosPage;

        // Filtrar por estado si se especifica
        if (numeroSocio != null || nombre != null || telefono != null || sucursalId != null
                || (estado != null && !"todos".equals(estado))) {
            String nSocio = (numeroSocio != null && !numeroSocio.isEmpty()) ? numeroSocio : null;
            String nNombre = (nombre != null && !nombre.isEmpty()) ? nombre : null;
            String nTel = (telefono != null && !telefono.isEmpty()) ? telefono : null;
            String nEstado = (estado != null && !"todos".equals(estado)) ? estado : null;

            sociosPage = socioRepository.findWithFilters(nSocio, nNombre, nTel, sucursalId, nEstado, pageable);
        } else {
            sociosPage = socioRepository.findAllWithSucursal(pageable);
        }

        // Convertir a DTOs para GARANTIZAR que sucursal.nombre se serialice
        org.springframework.data.domain.Page<com.asamblea.dto.SocioDTO> dtoPage = sociosPage
                .map(com.asamblea.dto.SocioDTO::fromEntity);

        return ResponseEntity.ok(dtoPage);
    }

    // -------------------------------------------------------------------------
    // SEARCH ENDPOINT
    // -------------------------------------------------------------------------
    @GetMapping("/buscar")
    public ResponseEntity<List<Map<String, Object>>> buscar(
            @RequestParam String term,
            @RequestParam(required = false) String tipo) {
        String cleanTerm = term.trim();
        List<Socio> sociosEncontrados;

        if (tipo != null && !tipo.isEmpty()) {
            // Búsqueda específica por tipo
            switch (tipo) {
                case "cedula":
                    sociosEncontrados = socioRepository.buscarPorCedula(cleanTerm);
                    break;
                case "nroSocio":
                    sociosEncontrados = socioRepository.buscarPorNumeroSocio(cleanTerm);
                    break;
                case "nombre":
                    sociosEncontrados = socioRepository.buscarPorNombre(cleanTerm);
                    break;
                default:
                    // Fallback al comportamiento original
                    List<Socio> exactos = socioRepository.buscarExacto(cleanTerm);
                    sociosEncontrados = !exactos.isEmpty() ? exactos : socioRepository.buscarParcial(cleanTerm);
                    break;
            }
        } else {
            // Comportamiento original (buscar en todo)
            List<Socio> exactos = socioRepository.buscarExacto(cleanTerm);
            if (!exactos.isEmpty()) {
                sociosEncontrados = exactos;
            } else {
                sociosEncontrados = socioRepository.buscarParcial(cleanTerm);
            }
        }

        if (sociosEncontrados.size() > 50) {
            sociosEncontrados = sociosEncontrados.subList(0, 50);
        }

        List<Map<String, Object>> response = new ArrayList<>();
        for (Socio socio : sociosEncontrados) {
            Map<String, Object> dto = new HashMap<>();
            dto.put("id", socio.getId());
            dto.put("nombreCompleto", socio.getNombreCompleto());
            dto.put("numeroSocio", socio.getNumeroSocio());
            dto.put("cedula", socio.getCedula());
            dto.put("telefono", socio.getTelefono());
            // SUCURSAL - devolver como objeto para compatibilidad con frontend
            if (socio.getSucursal() != null) {
                Map<String, Object> sucursalObj = new HashMap<>();
                sucursalObj.put("id", socio.getSucursal().getId());
                sucursalObj.put("nombre", socio.getSucursal().getNombre());
                sucursalObj.put("codigo", socio.getSucursal().getCodigo());
                dto.put("sucursal", sucursalObj);
            } else {
                dto.put("sucursal", null);
            }
            dto.put("aporteAlDia", socio.isAporteAlDia());
            dto.put("solidaridadAlDia", socio.isSolidaridadAlDia());
            dto.put("fondoAlDia", socio.isFondoAlDia());
            dto.put("incoopAlDia", socio.isIncoopAlDia());
            dto.put("creditoAlDia", socio.isCreditoAlDia());
            dto.put("vozYVoto", socio.isEstadoVozVoto());
            
            // Campos del Padrón moderno
            dto.put("habilitadoVozVoto", socio.getHabilitadoVozVoto());
            dto.put("direccion", socio.getDireccion());
            dto.put("barrio", socio.getBarrio());
            dto.put("ciudad", socio.getCiudad());
            dto.put("profesion", socio.getProfesion());
            dto.put("edad", socio.getEdad());
            dto.put("email", socio.getEmail());
            dto.put("ocupacion", socio.getOcupacion());
            dto.put("mesa", socio.getMesa());
            dto.put("nroOrdenPadron", socio.getNroOrdenPadron());
            dto.put("movil", socio.getMovil());
            dto.put("fechaIngreso", socio.getFechaIngreso());
            dto.put("fechaPadron", socio.getFechaPadron());
            dto.put("enPadronActual", socio.isEnPadronActual());

            dto.put("yaAsignado", false);
            response.add(dto);
        }
        return ResponseEntity.ok(response);
    }

    // Obtener un socio por ID
    @GetMapping("/{id}")
    public ResponseEntity<Socio> obtenerPorId(@PathVariable Long id) {
        return socioRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // -------------------------------------------------------------------------
    // UPDATE STATUS ENDPOINT
    // -------------------------------------------------------------------------
    @PatchMapping("/{id}/estado")
    public ResponseEntity<?> actualizarEstado(@PathVariable Long id, @RequestBody Map<String, Object> updates,
            Authentication auth, HttpServletRequest request) {
        return socioRepository.findById(id).map(socio -> {
            if (updates.containsKey("aporteAlDia"))
                socio.setAporteAlDia(Boolean.TRUE.equals(updates.get("aporteAlDia")));
            if (updates.containsKey("solidaridadAlDia"))
                socio.setSolidaridadAlDia(Boolean.TRUE.equals(updates.get("solidaridadAlDia")));
            if (updates.containsKey("fondoAlDia"))
                socio.setFondoAlDia(Boolean.TRUE.equals(updates.get("fondoAlDia")));
            if (updates.containsKey("incoopAlDia"))
                socio.setIncoopAlDia(Boolean.TRUE.equals(updates.get("incoopAlDia")));
            if (updates.containsKey("creditoAlDia"))
                socio.setCreditoAlDia(Boolean.TRUE.equals(updates.get("creditoAlDia")));
            if (updates.containsKey("habilitadoVozVoto"))
                socio.setHabilitadoVozVoto(String.valueOf(updates.get("habilitadoVozVoto")));
            socioRepository.save(socio);
            return ResponseEntity.ok(Map.of("message", "Estado actualizado correctamente", "socio", socio));
        }).orElse(ResponseEntity.notFound().build());
    }

    // Estadísticas generales del padrón
    @GetMapping("/estadisticas")
    public ResponseEntity<Map<String, Object>> estadisticas() {
        // SOLO contar socios en padrón actual
        Long total = socioRepository.countEnPadronActual();
        if (total == null)
            total = 0L;
        Long conVozYVoto = socioRepository.countConVozYVotoEnPadron();
        if (conVozYVoto == null)
            conVozYVoto = 0L;
        Long soloVoz = socioRepository.countSoloVozEnPadron();
        if (soloVoz == null)
            soloVoz = 0L;
        long presentes = asistenciaRepository.count();
        long presentesVyV = asistenciaRepository.countByEstadoVozVoto(true);
        Long totalMeta = usuarioRepository.sumTotalMetas();

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalPadron", total);
        stats.put("conVozYVoto", conVozYVoto);
        stats.put("soloVoz", soloVoz);
        stats.put("presentes", presentes);
        stats.put("presentesVyV", presentesVyV);
        stats.put("totalMeta", totalMeta != null ? totalMeta : 0);

        return ResponseEntity.ok(stats);
    }

    // Estadísticas por sucursal
    @GetMapping("/estadisticas/por-sucursal")
    public ResponseEntity<List<Map<String, Object>>> estadisticasPorSucursal() {
        List<Sucursal> sucursales = sucursalRepository.findAllByOrderByCodigoAsc();
        List<Map<String, Object>> resultado = new ArrayList<>();

        for (Sucursal suc : sucursales) {
            Map<String, Object> item = new HashMap<>();
            long padron = socioRepository.countBySucursalId(suc.getId());
            long conVozYVoto = socioRepository.countConVozYVotoBySucursalId(suc.getId());
            long presentes = asistenciaRepository.countBySucursalId(suc.getId());
            double ratio = padron > 0 ? ((double) presentes / padron) * 100 : 0;

            item.put("sucursalId", suc.getId());
            item.put("sucursal",
                    suc.getNombre() != null ? suc.getNombre().toUpperCase() : "SIN NOMBRE (" + suc.getId() + ")");
            item.put("padron", padron);
            item.put("presentes", presentes);
            item.put("vozVoto", conVozYVoto);
            item.put("ratio", Math.round(ratio * 10.0) / 10.0);
            resultado.add(item);
        }
        return ResponseEntity.ok(resultado);
    }

    @GetMapping("/stats-globales")
    public ResponseEntity<Map<String, Object>> statsGlobales() {
        Long totalHabilitados = socioRepository.countConVozYVotoEnPadron();
        if (totalHabilitados == null)
            totalHabilitados = 0L;
        long presentesGlobal = asistenciaRepository.countByEstadoVozVoto(true);

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalHabilitados", totalHabilitados);
        stats.put("presentesGlobal", presentesGlobal);
        return ResponseEntity.ok(stats);
    }

    @GetMapping("/buscar-exacto")
    public ResponseEntity<?> buscarSocio(
            @RequestParam String term,
            @RequestParam(required = false) String tipo) {
        String cleanTerm = term.trim();
        Optional<Socio> socioOpt = Optional.empty();

        if (tipo != null && !tipo.isEmpty()) {
            // Búsqueda específica por tipo
            switch (tipo) {
                case "cedula":
                    socioOpt = socioRepository.findByCedula(cleanTerm);
                    break;
                case "nroSocio":
                    socioOpt = socioRepository.findByNumeroSocio(cleanTerm);
                    break;
                case "nombre":
                    List<Socio> porNombreTipo = socioRepository.buscarPorNombre(cleanTerm);
                    if (!porNombreTipo.isEmpty()) {
                        socioOpt = Optional.of(porNombreTipo.get(0));
                    }
                    break;
                default:
                    socioOpt = socioRepository.findByNumeroSocio(cleanTerm);
                    if (socioOpt.isEmpty()) {
                        socioOpt = socioRepository.findByCedula(cleanTerm);
                    }
                    break;
            }
        } else {
            // Comportamiento original: buscar en todo
            // 1. Buscar por número de socio exacto
            socioOpt = socioRepository.findByNumeroSocio(cleanTerm);

            // 2. Si no encontró, buscar por cédula
            if (socioOpt.isEmpty()) {
                socioOpt = socioRepository.findByCedula(cleanTerm);
            }

            // 3. Si no encontró y el término tiene al menos 3 caracteres, buscar por nombre
            // parcial
            if (socioOpt.isEmpty() && cleanTerm.length() >= 3) {
                List<Socio> porNombre = socioRepository.buscarParcial(cleanTerm);
                if (!porNombre.isEmpty()) {
                    socioOpt = Optional.of(porNombre.get(0));
                }
            }
        }

        if (socioOpt.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of("error", "Socio no encontrado"));
        }

        Socio socio = socioOpt.get();
        boolean asistenciaConfirmada = asistenciaRepository.existsBySocioId(socio.getId());

        Map<String, Object> response = new HashMap<>();
        response.put("id", socio.getId());
        response.put("numeroSocio", socio.getNumeroSocio());
        response.put("cedula", socio.getCedula());
        response.put("nombreCompleto", socio.getNombreCompleto());
        response.put("telefono", socio.getTelefono());
        response.put("sucursal", socio.getSucursal());
        response.put("aporteAlDia", socio.isAporteAlDia());
        response.put("solidaridadAlDia", socio.isSolidaridadAlDia());
        response.put("fondoAlDia", socio.isFondoAlDia());
        response.put("incoopAlDia", socio.isIncoopAlDia());
        response.put("creditoAlDia", socio.isCreditoAlDia());
        response.put("asistenciaConfirmada", asistenciaConfirmada);

        // Campos del padrón moderno
        response.put("habilitadoVozVoto", socio.getHabilitadoVozVoto());
        response.put("direccion", socio.getDireccion());
        response.put("barrio", socio.getBarrio());
        response.put("fechaIngreso", socio.getFechaIngreso());
        response.put("fechaPadron", socio.getFechaPadron());
        response.put("edad", socio.getEdad());
        response.put("profesion", socio.getProfesion());
        response.put("ocupacion", socio.getOcupacion());
        response.put("ciudad", socio.getCiudad());
        response.put("email", socio.getEmail());
        response.put("movil", socio.getMovil());
        response.put("mesa", socio.getMesa());
        response.put("nroOrdenPadron", socio.getNroOrdenPadron());
        response.put("enPadronActual", socio.isEnPadronActual());

        boolean conVozYVoto = socio.isEstadoVozVoto();
        response.put("conVozYVoto", conVozYVoto);
        return ResponseEntity.ok(response);
    }

    /**
     * Reset completo del padrón - Elimina todos los datos
     * CUIDADO: Esta acción es irreversible
     */
    @Transactional
    @PostMapping("/reset-padron")
    public ResponseEntity<?> resetPadron(@RequestBody Map<String, Boolean> options, Authentication auth,
            HttpServletRequest request) {
        System.out.println("========================================");
        System.out.println("🎛️ GRANULAR RESET (STRICT MODE) CALLED");
        System.out.println("Options: " + options);
        System.out.println("========================================");

        try {
            boolean borrarAsistencias = options.getOrDefault("asistencias", false);
            boolean borrarAsignaciones = options.getOrDefault("asignaciones", false);
            boolean borrarListas = options.getOrDefault("listas", false);
            boolean borrarSocios = options.getOrDefault("socios", false);
            boolean borrarUsuarios = options.getOrDefault("usuarios", false);
            boolean borrarImportaciones = options.getOrDefault("importaciones", false);

            Map<String, Long> deletedCounts = new HashMap<>();

            // =================================================================================
            // PASO 0: DESVINCULACIÓN TOTAL (Prepara el terreno - "Clean Users First")
            // =================================================================================
            // El usuario pidió: "elimina primero los usuarios registrados o socios
            // registrados por el admin"
            // Esto significa ROMPER VINCULOS.

            // 0.1 Limpiar referencias de TODOS los usuarios (incluido Admin)
            List<com.asamblea.model.Usuario> allUsuarios = usuarioRepository.findAll();
            for (com.asamblea.model.Usuario u : allUsuarios) {
                boolean changed = false;
                if (u.getIdSocio() != null) {
                    u.setIdSocio(null);
                    changed = true;
                }
                if (u.getSucursal() != null) {
                    u.setSucursal(null);
                    changed = true;
                }
                if (changed)
                    usuarioRepository.save(u);
            }
            usuarioRepository.flush(); // Commit inmediato de desvinculación

            // =================================================================================
            // PASO 1: ELIMINACIÓN EN CASCADA MANUAL (Strict Order)
            // =================================================================================

            // 1.1 Asistencias (No dependen de nadie, borrar primero para limpiar referencia
            // a socio)
            if (borrarAsistencias) {
                jdbcTemplate.execute("DELETE FROM asistencias"); // Más rápido que JPA delete all
                deletedCounts.put("asistencias", -1L);
            }

            // 1.2 Listas y Asignaciones (Interdependientes)
            if (borrarListas || borrarAsignaciones) {
                // Primero el detalle (Asignaciones)
                jdbcTemplate.execute("DELETE FROM asignaciones_socios");
                deletedCounts.put("asignaciones", -1L);

                // Luego la cabecera (Listas)
                if (borrarListas) {
                    jdbcTemplate.execute("DELETE FROM listas_asignacion");
                    deletedCounts.put("listas", -1L);
                }
            }

            // 1.3 Historial (Aislado)
            if (borrarImportaciones) {
                jdbcTemplate.execute("DELETE FROM importaciones_historial");
                deletedCounts.put("importaciones", -1L);
            }

            // 1.4 Socios (Ahora que no hay asistencias, asignaciones, ni usuarios
            // apuntándoles)
            if (borrarSocios) {
                jdbcTemplate.execute("DELETE FROM socios");
                deletedCounts.put("socios", -1L);
            }

            // 1.5 Usuarios (Operadores)
            if (borrarUsuarios) {
                // Borrar todos MENOS los Super Admin
                jdbcTemplate.update("DELETE FROM usuarios WHERE rol != 'SUPER_ADMIN'");
                deletedCounts.put("usuarios", -1L);
            }

            System.out.println("✅ Strict Reset Completed!");

            auditService.registrar(
                    "SOCIOS",
                    "RESET_GRANULAR",
                    "Reinicio granular (STRICT_PROCESS). Options: " + options.toString(),
                    auth != null ? auth.getName() : "SYSTEM",
                    request.getRemoteAddr());

            Map<String, Object> result = new HashMap<>();
            result.put("success", true);
            result.put("message", "Limpieza completada exitosamente.");
            result.put("eliminados", deletedCounts);

            return ResponseEntity.ok(result);
        } catch (Exception e) {
            System.err.println("❌ Error en reset: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of(
                    "success", false,
                    "error", "Server Error: " + e.getMessage()));
        }
    }

    // =========================================================================
    // EXPORT ENDPOINTS (Excel & PDF)
    // =========================================================================

    @GetMapping("/export/excel")
    public void exportToExcel(jakarta.servlet.http.HttpServletResponse response) throws Exception {
        response.setContentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        response.setHeader("Content-Disposition", "attachment; filename=padron_completo_socios.xlsx");

        List<Socio> socios = socioRepository.findAll();

        try (org.apache.poi.xssf.usermodel.XSSFWorkbook workbook = new org.apache.poi.xssf.usermodel.XSSFWorkbook()) {
            org.apache.poi.xssf.usermodel.XSSFSheet sheet = workbook.createSheet("Padrón Completo");

            // ── Estilos de cabecera por sección ──
            // Verde: Datos Básicos & Identificación
            org.apache.poi.xssf.usermodel.XSSFCellStyle styleBasicos = createHeaderStyle(workbook, new byte[]{(byte)16, (byte)185, (byte)129});
            // Azul: Contacto
            org.apache.poi.xssf.usermodel.XSSFCellStyle styleContacto = createHeaderStyle(workbook, new byte[]{(byte)59, (byte)130, (byte)246});
            // Naranja: Ubicación
            org.apache.poi.xssf.usermodel.XSSFCellStyle styleUbicacion = createHeaderStyle(workbook, new byte[]{(byte)245, (byte)158, (byte)11});
            // Morado: Datos Personales
            org.apache.poi.xssf.usermodel.XSSFCellStyle stylePersonales = createHeaderStyle(workbook, new byte[]{(byte)139, (byte)92, (byte)246});
            // Cyan: Fechas
            org.apache.poi.xssf.usermodel.XSSFCellStyle styleFechas = createHeaderStyle(workbook, new byte[]{(byte)6, (byte)182, (byte)212});
            // Rojo: Deudas
            org.apache.poi.xssf.usermodel.XSSFCellStyle styleDeudas = createHeaderStyle(workbook, new byte[]{(byte)239, (byte)68, (byte)68});
            // Verde oscuro: Estado Electoral
            org.apache.poi.xssf.usermodel.XSSFCellStyle styleElectoral = createHeaderStyle(workbook, new byte[]{(byte)5, (byte)150, (byte)105});

            // ── Definir columnas con sus estilos ──
            String[] columns = {
                // Datos Básicos (0-2)
                "N° Socio", "Nombre Completo", "Cédula",
                // Contacto (3-5)
                "Teléfono", "Móvil", "Email",
                // Ubicación (6-10)
                "Dirección", "Barrio", "Ciudad", "Sucursal", "Clasificación",
                // Datos Personales (11-14)
                "Edad", "Profesión", "Ocupación", "Grado Instrucción",
                // Fechas (15-16)
                "Fecha Ingreso", "Fecha Padrón",
                // Deudas (17-26)
                "Deuda Aporte", "Aporte Cubierto", "Deuda Solidaridad", "Solidaridad Cubierto",
                "Deuda Sede Social", "Sede Social Cubierto", "Deuda Préstamo",
                "Mayor Día Atraso Préstamo", "Deuda Tarjeta Crédito", "Mayor Día Atraso TC",
                // Estado Electoral (27-31)
                "Habilitado Voz/Voto", "Estado Voz y Voto", "Mesa", "Nro Orden Padrón", "En Padrón Actual"
            };

            org.apache.poi.xssf.usermodel.XSSFCellStyle[] columnStyles = new org.apache.poi.xssf.usermodel.XSSFCellStyle[columns.length];
            for (int i = 0; i <= 2; i++) columnStyles[i] = styleBasicos;
            for (int i = 3; i <= 5; i++) columnStyles[i] = styleContacto;
            for (int i = 6; i <= 10; i++) columnStyles[i] = styleUbicacion;
            for (int i = 11; i <= 14; i++) columnStyles[i] = stylePersonales;
            for (int i = 15; i <= 16; i++) columnStyles[i] = styleFechas;
            for (int i = 17; i <= 26; i++) columnStyles[i] = styleDeudas;
            for (int i = 27; i < columns.length; i++) columnStyles[i] = styleElectoral;

            // ── Crear fila de cabecera ──
            org.apache.poi.ss.usermodel.Row headerRow = sheet.createRow(0);
            for (int i = 0; i < columns.length; i++) {
                org.apache.poi.ss.usermodel.Cell cell = headerRow.createCell(i);
                cell.setCellValue(columns[i]);
                cell.setCellStyle(columnStyles[i]);
            }

            // ── Filas de datos ──
            int rowNum = 1;
            for (Socio socio : socios) {
                org.apache.poi.ss.usermodel.Row row = sheet.createRow(rowNum++);
                int col = 0;
                // Datos Básicos
                row.createCell(col++).setCellValue(safe(socio.getNumeroSocio()));
                row.createCell(col++).setCellValue(safe(socio.getNombreCompleto()));
                row.createCell(col++).setCellValue(safe(socio.getCedula()));
                // Contacto
                row.createCell(col++).setCellValue(safe(socio.getTelefono()));
                row.createCell(col++).setCellValue(safe(socio.getMovil()));
                row.createCell(col++).setCellValue(safe(socio.getEmail()));
                // Ubicación
                row.createCell(col++).setCellValue(safe(socio.getDireccion()));
                row.createCell(col++).setCellValue(safe(socio.getBarrio()));
                row.createCell(col++).setCellValue(safe(socio.getCiudad()));
                row.createCell(col++).setCellValue(socio.getSucursal() != null && socio.getSucursal().getNombre() != null ? socio.getSucursal().getNombre() : "Casa Central");
                row.createCell(col++).setCellValue(safe(socio.getClasificacion()));
                // Datos Personales
                row.createCell(col++).setCellValue(safe(socio.getEdad()));
                row.createCell(col++).setCellValue(safe(socio.getProfesion()));
                row.createCell(col++).setCellValue(safe(socio.getOcupacion()));
                row.createCell(col++).setCellValue(safe(socio.getGradoInstruccion()));
                // Fechas
                row.createCell(col++).setCellValue(safe(socio.getFechaIngreso()));
                row.createCell(col++).setCellValue(safe(socio.getFechaPadron()));
                // Deudas
                row.createCell(col++).setCellValue(safe(socio.getDeudaAporte()));
                row.createCell(col++).setCellValue(safe(socio.getAporteCubierto()));
                row.createCell(col++).setCellValue(safe(socio.getDeudaSolidaridad()));
                row.createCell(col++).setCellValue(safe(socio.getSolidaridadCubierto()));
                row.createCell(col++).setCellValue(safe(socio.getDeudaSedeSocial()));
                row.createCell(col++).setCellValue(safe(socio.getSedeSocialCubierto()));
                row.createCell(col++).setCellValue(safe(socio.getDeudaPrestamo()));
                row.createCell(col++).setCellValue(safe(socio.getMayorDiaAtrasoPmo()));
                row.createCell(col++).setCellValue(safe(socio.getDeudaTarjetaCredito()));
                row.createCell(col++).setCellValue(safe(socio.getMayorDiaAtrasoTc()));
                // Estado Electoral
                row.createCell(col++).setCellValue(safe(socio.getHabilitadoVozVoto()));
                row.createCell(col++).setCellValue(socio.isEstadoVozVoto() ? "VOZ Y VOTO" : "SOLO VOZ");
                row.createCell(col++).setCellValue(safe(socio.getMesa()));
                row.createCell(col++).setCellValue(safe(socio.getNroOrdenPadron()));
                row.createCell(col++).setCellValue(socio.isEnPadronActual() ? "SI" : "NO");
            }

            // Auto-size columns (limitar a 60 chars para evitar lentitud con 30k filas)
            for (int i = 0; i < columns.length; i++) {
                sheet.setColumnWidth(i, Math.min(columns[i].length() * 400 + 1500, 15000));
            }

            // Congelar fila de cabecera
            sheet.createFreezePane(0, 1);
            // Filtro automático
            sheet.setAutoFilter(new org.apache.poi.ss.util.CellRangeAddress(0, 0, 0, columns.length - 1));

            workbook.write(response.getOutputStream());
        }
    }

    // Helper: valor seguro para celdas (evitar null)
    private String safe(String value) {
        return value != null ? value : "";
    }

    // Helper: crear estilo de cabecera con color RGB
    private org.apache.poi.xssf.usermodel.XSSFCellStyle createHeaderStyle(
            org.apache.poi.xssf.usermodel.XSSFWorkbook workbook, byte[] rgb) {
        org.apache.poi.xssf.usermodel.XSSFCellStyle style = workbook.createCellStyle();
        org.apache.poi.xssf.usermodel.XSSFFont font = workbook.createFont();
        font.setBold(true);
        font.setColor(org.apache.poi.ss.usermodel.IndexedColors.WHITE.getIndex());
        style.setFont(font);
        style.setFillForegroundColor(new org.apache.poi.xssf.usermodel.XSSFColor(rgb, null));
        style.setFillPattern(org.apache.poi.ss.usermodel.FillPatternType.SOLID_FOREGROUND);
        style.setBorderBottom(org.apache.poi.ss.usermodel.BorderStyle.THIN);
        style.setBorderTop(org.apache.poi.ss.usermodel.BorderStyle.THIN);
        style.setBorderLeft(org.apache.poi.ss.usermodel.BorderStyle.THIN);
        style.setBorderRight(org.apache.poi.ss.usermodel.BorderStyle.THIN);
        style.setAlignment(org.apache.poi.ss.usermodel.HorizontalAlignment.CENTER);
        return style;
    }

    @GetMapping("/export/pdf")
    public void exportToPdf(jakarta.servlet.http.HttpServletResponse response) throws Exception {
        response.setContentType("application/pdf");
        response.setHeader("Content-Disposition", "attachment; filename=padron_completo_socios.pdf");

        List<Socio> socios = socioRepository.findAll();

        com.lowagie.text.Document document = new com.lowagie.text.Document(com.lowagie.text.PageSize.A4.rotate());
        com.lowagie.text.pdf.PdfWriter.getInstance(document, response.getOutputStream());
        document.open();

        // Title
        com.lowagie.text.Font titleFont = new com.lowagie.text.Font(com.lowagie.text.Font.HELVETICA, 16,
                com.lowagie.text.Font.BOLD);
        com.lowagie.text.Paragraph title = new com.lowagie.text.Paragraph(
                "Padrón Completo de Socios - Cooperativa Multiactiva Lambaré Ltda.", titleFont);
        title.setAlignment(com.lowagie.text.Element.ALIGN_CENTER);
        title.setSpacingAfter(5);
        document.add(title);

        // Subtitle with date
        com.lowagie.text.Font subtitleFont = new com.lowagie.text.Font(com.lowagie.text.Font.HELVETICA, 10,
                com.lowagie.text.Font.ITALIC);
        com.lowagie.text.Paragraph subtitle = new com.lowagie.text.Paragraph(
                "Generado: " + java.time.LocalDateTime.now()
                        .format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"))
                        + " | Total: " + socios.size() + " socios",
                subtitleFont);
        subtitle.setAlignment(com.lowagie.text.Element.ALIGN_CENTER);
        subtitle.setSpacingAfter(15);
        document.add(subtitle);

        // Table with more columns
        String[] headers = { "N° Socio", "Nombre Completo", "Cédula", "Teléfono", "Email",
                "Dirección", "Barrio/Ciudad", "Sucursal", "Edad", "Profesión", "Estado V&V" };
        float[] widths = { 6f, 16f, 7f, 9f, 10f, 14f, 10f, 8f, 4f, 8f, 8f };

        com.lowagie.text.pdf.PdfPTable table = new com.lowagie.text.pdf.PdfPTable(headers.length);
        table.setWidthPercentage(100);
        table.setWidths(widths);
        table.setSpacingBefore(10);

        // Header style
        com.lowagie.text.Font headerFont = new com.lowagie.text.Font(com.lowagie.text.Font.HELVETICA, 7,
                com.lowagie.text.Font.BOLD, java.awt.Color.WHITE);
        java.awt.Color headerBg = new java.awt.Color(16, 185, 129);

        for (String header : headers) {
            com.lowagie.text.pdf.PdfPCell cell = new com.lowagie.text.pdf.PdfPCell(
                    new com.lowagie.text.Phrase(header, headerFont));
            cell.setBackgroundColor(headerBg);
            cell.setPadding(5);
            cell.setHorizontalAlignment(com.lowagie.text.Element.ALIGN_CENTER);
            cell.setVerticalAlignment(com.lowagie.text.Element.ALIGN_MIDDLE);
            table.addCell(cell);
        }

        // Data rows
        com.lowagie.text.Font dataFont = new com.lowagie.text.Font(com.lowagie.text.Font.HELVETICA, 6.5f);
        com.lowagie.text.Font dataFontBold = new com.lowagie.text.Font(com.lowagie.text.Font.HELVETICA, 6.5f,
                com.lowagie.text.Font.BOLD);
        java.awt.Color altRowColor = new java.awt.Color(240, 253, 244); // light green tint

        int rowIdx = 0;
        for (Socio socio : socios) {
            java.awt.Color rowBg = (rowIdx % 2 == 0) ? java.awt.Color.WHITE : altRowColor;

            addPdfCell(table, safe(socio.getNumeroSocio()), dataFont, rowBg);
            addPdfCell(table, safe(socio.getNombreCompleto()), dataFontBold, rowBg);
            addPdfCell(table, safe(socio.getCedula()), dataFont, rowBg);
            addPdfCell(table, safe(socio.getTelefono()), dataFont, rowBg);
            addPdfCell(table, safe(socio.getEmail()), dataFont, rowBg);
            addPdfCell(table, safe(socio.getDireccion()), dataFont, rowBg);
            String barrioCity = safe(socio.getBarrio());
            if (socio.getCiudad() != null && !socio.getCiudad().isEmpty()) {
                barrioCity += barrioCity.isEmpty() ? socio.getCiudad() : ", " + socio.getCiudad();
            }
            addPdfCell(table, barrioCity, dataFont, rowBg);
            addPdfCell(table, socio.getSucursal() != null ? socio.getSucursal().getNombre() : "-", dataFont, rowBg);
            addPdfCell(table, safe(socio.getEdad()), dataFont, rowBg);
            addPdfCell(table, safe(socio.getProfesion()), dataFont, rowBg);

            // Estado V&V con color
            String estadoVV = socio.isEstadoVozVoto() ? "VOZ Y VOTO" : "SOLO VOZ";
            java.awt.Color estadoColor = socio.isEstadoVozVoto()
                    ? new java.awt.Color(5, 150, 105) : new java.awt.Color(245, 158, 11);
            com.lowagie.text.Font estadoFont = new com.lowagie.text.Font(com.lowagie.text.Font.HELVETICA, 6,
                    com.lowagie.text.Font.BOLD, java.awt.Color.WHITE);
            com.lowagie.text.pdf.PdfPCell estadoCell = new com.lowagie.text.pdf.PdfPCell(
                    new com.lowagie.text.Phrase(estadoVV, estadoFont));
            estadoCell.setBackgroundColor(estadoColor);
            estadoCell.setPadding(3);
            estadoCell.setHorizontalAlignment(com.lowagie.text.Element.ALIGN_CENTER);
            estadoCell.setVerticalAlignment(com.lowagie.text.Element.ALIGN_MIDDLE);
            table.addCell(estadoCell);

            rowIdx++;
        }

        document.add(table);
        document.close();
    }

    // Helper: agregar celda al PDF
    private void addPdfCell(com.lowagie.text.pdf.PdfPTable table, String text,
            com.lowagie.text.Font font, java.awt.Color bgColor) {
        com.lowagie.text.pdf.PdfPCell cell = new com.lowagie.text.pdf.PdfPCell(
                new com.lowagie.text.Phrase(text != null ? text : "-", font));
        cell.setBackgroundColor(bgColor);
        cell.setPadding(3);
        cell.setVerticalAlignment(com.lowagie.text.Element.ALIGN_MIDDLE);
        table.addCell(cell);
    }

    // =========================================================================
    // ABM ENDPOINTS (Solo SUPER_ADMIN)
    // =========================================================================

    @org.springframework.security.access.prepost.PreAuthorize("hasRole('SUPER_ADMIN')")
    @PostMapping
    public ResponseEntity<?> crearSocio(@RequestBody Socio socio, Authentication auth, HttpServletRequest request) {
        try {
            // Validar campos obligatorios
            if (socio.getNumeroSocio() == null || socio.getNombreCompleto() == null || socio.getCedula() == null) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Número de socio, nombre y cédula son obligatorios"));
            }

            // Verificar duplicados
            if (socioRepository.findByNumeroSocio(socio.getNumeroSocio()).isPresent()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Ya existe un socio con ese número"));
            }
            if (socioRepository.findByCedula(socio.getCedula()).isPresent()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Ya existe un socio con esa cédula"));
            }

            Socio saved = socioRepository.save(socio);

            auditService.registrar("SOCIOS", "CREAR",
                    "Socio creado: " + saved.getNumeroSocio() + " - " + saved.getNombreCompleto(),
                    auth != null ? auth.getName() : "SYSTEM", request.getRemoteAddr());

            return ResponseEntity.ok(Map.of("message", "Socio creado exitosamente", "socio", saved));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    @org.springframework.security.access.prepost.PreAuthorize("hasRole('SUPER_ADMIN')")
    @PutMapping("/{id}")
    public ResponseEntity<?> actualizarSocio(@PathVariable Long id, @RequestBody Socio socioData,
            Authentication auth, HttpServletRequest request) {
        return socioRepository.findById(id).map(socio -> {
            // Actualizar campos
            if (socioData.getNumeroSocio() != null)
                socio.setNumeroSocio(socioData.getNumeroSocio());
            if (socioData.getNombreCompleto() != null)
                socio.setNombreCompleto(socioData.getNombreCompleto());
            if (socioData.getCedula() != null)
                socio.setCedula(socioData.getCedula());
            if (socioData.getTelefono() != null)
                socio.setTelefono(socioData.getTelefono());

            socio.setAporteAlDia(socioData.isAporteAlDia());
            socio.setSolidaridadAlDia(socioData.isSolidaridadAlDia());
            socio.setFondoAlDia(socioData.isFondoAlDia());
            socio.setIncoopAlDia(socioData.isIncoopAlDia());
            socio.setCreditoAlDia(socioData.isCreditoAlDia());

            Socio updated = socioRepository.save(socio);

            auditService.registrar("SOCIOS", "MODIFICAR", "Socio modificado: " + updated.getNumeroSocio(),
                    auth != null ? auth.getName() : "SYSTEM", request.getRemoteAddr());

            return ResponseEntity.ok(Map.of("message", "Socio actualizado exitosamente", "socio", updated));
        }).orElse(ResponseEntity.notFound().build());
    }

    @org.springframework.security.access.prepost.PreAuthorize("hasRole('SUPER_ADMIN')")
    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<?> eliminarSocio(@PathVariable Long id, Authentication auth, HttpServletRequest request) {
        return socioRepository.findById(id).map(socio -> {
            String numeroSocio = socio.getNumeroSocio();
            String nombre = socio.getNombreCompleto();

            // Eliminar asistencias relacionadas
            asistenciaRepository.deleteBySocioId(id);

            // Eliminar de asignaciones
            jdbcTemplate.update("DELETE FROM asignaciones_socios WHERE socio_id = ?", id);

            socioRepository.delete(socio);

            auditService.registrar("SOCIOS", "ELIMINAR", "Socio eliminado: " + numeroSocio + " - " + nombre,
                    auth != null ? auth.getName() : "SYSTEM", request.getRemoteAddr());

            return ResponseEntity.ok(Map.of("message", "Socio eliminado exitosamente"));
        }).orElse(ResponseEntity.notFound().build());
    }
}
