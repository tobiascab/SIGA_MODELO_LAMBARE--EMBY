package com.asamblea.controller;

import com.asamblea.model.Asistencia;
import com.asamblea.model.Usuario;
import com.asamblea.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Controlador con endpoints PÚBLICOS para la pantalla de presentación.
 * NO requieren autenticación - diseñado para proyección en pantalla grande.
 */
@RestController
@RequestMapping("/api/public")
@RequiredArgsConstructor
public class PublicDashboardController {

    private final SocioRepository socioRepository;
    private final AsistenciaRepository asistenciaRepository;
    private final AsignacionRepository asignacionRepository;
    private final UsuarioRepository usuarioRepository;
    private final ListaAsignacionRepository listaAsignacionRepository;

    /**
     * Estadísticas generales del padrón - PÚBLICO
     */
    @GetMapping("/estadisticas")
    public ResponseEntity<Map<String, Object>> getEstadisticas() {
        Map<String, Object> stats = new HashMap<>();

        // SOLO contar socios en el padrón actual (excluye los dados de baja)
        Long totalPadron = socioRepository.countEnPadronActual();
        if (totalPadron == null)
            totalPadron = 0L;

        Long conVozYVoto = socioRepository.countConVozYVotoEnPadron();
        if (conVozYVoto == null)
            conVozYVoto = 0L;
        Long soloVoz = socioRepository.countSoloVozEnPadron();
        if (soloVoz == null)
            soloVoz = 0L;

        // Presentes hoy
        LocalDateTime inicioDia = LocalDate.now().atStartOfDay();
        LocalDateTime finDia = LocalDate.now().atTime(23, 59, 59);

        long presentes = asistenciaRepository.countByFechaHoraBetween(inicioDia, finDia);
        long presentesVyV = asistenciaRepository.countByFechaHoraBetweenAndEstadoVozVoto(inicioDia, finDia, true);

        stats.put("totalPadron", totalPadron);
        stats.put("conVozYVoto", conVozYVoto);
        stats.put("soloVoz", soloVoz);
        stats.put("presentes", presentes);
        stats.put("presentesVyV", presentesVyV);

        return ResponseEntity.ok(stats);
    }

    /**
     * Metas de registro segmentadas - PÚBLICO
     * CORREGIDO: Cuenta desde ASIGNACIONES (listas), NO desde ASISTENCIAS
     * (check-ins)
     */
    @GetMapping("/metas")
    public ResponseEntity<Map<String, Object>> getMetas() {
        Map<String, Object> response = new HashMap<>();

        // Meta global
        Long metaGlobal = usuarioRepository.sumTotalMetas();
        if (metaGlobal == null)
            metaGlobal = 0L;

        // CORREGIDO: Contar desde ASIGNACIONES (listas creadas por usuarios)
        Long registradosVyV = asignacionRepository.countTotalVyV();
        if (registradosVyV == null)
            registradosVyV = 0L;

        double porcentaje = metaGlobal > 0 ? (registradosVyV.doubleValue() / metaGlobal.doubleValue()) * 100 : 0;

        response.put("meta", metaGlobal);
        response.put("registradosVozYVoto", registradosVyV);
        response.put("porcentajeMeta", porcentaje);

        // Segmentado: Asesores (desde sus listas)
        Long metaAsesores = usuarioRepository.sumTotalMetasByRol(Usuario.Rol.ASESOR_DE_CREDITO);
        if (metaAsesores == null)
            metaAsesores = 0L;

        Long regAsesores = asignacionRepository.countVyVByUsuarioRol(Usuario.Rol.ASESOR_DE_CREDITO);
        if (regAsesores == null)
            regAsesores = 0L;

        double porcAsesores = metaAsesores > 0 ? (regAsesores.doubleValue() / metaAsesores.doubleValue()) * 100 : 0;

        Map<String, Object> asesoresData = new HashMap<>();
        asesoresData.put("meta", metaAsesores);
        asesoresData.put("registradosVozYVoto", regAsesores);
        asesoresData.put("porcentajeMeta", porcAsesores);
        response.put("asesores", asesoresData);

        // Segmentado: Funcionarios (desde sus listas)
        Long metaFunc = usuarioRepository.sumTotalMetasByRolNot(Usuario.Rol.ASESOR_DE_CREDITO);
        if (metaFunc == null)
            metaFunc = 0L;

        Long regFunc = asignacionRepository.countVyVByUsuarioRolNot(Usuario.Rol.ASESOR_DE_CREDITO);
        if (regFunc == null)
            regFunc = 0L;

        double porcFunc = metaFunc > 0 ? (regFunc.doubleValue() / metaFunc.doubleValue()) * 100 : 0;

        Map<String, Object> funcData = new HashMap<>();
        funcData.put("meta", metaFunc);
        funcData.put("registradosVozYVoto", regFunc);
        funcData.put("porcentajeMeta", porcFunc);
        response.put("funcionarios", funcData);

        return ResponseEntity.ok(response);
    }

    /**
     * Asistencias del día - PÚBLICO (solo datos mínimos)
     */
    @GetMapping("/asistencia-hoy")
    public ResponseEntity<List<Map<String, Object>>> getAsistenciaHoy() {
        LocalDateTime inicioDia = LocalDate.now().atStartOfDay();
        LocalDateTime finDia = LocalDate.now().atTime(23, 59, 59);

        List<Asistencia> asistencias = asistenciaRepository.findByFechaHoraBetween(inicioDia, finDia);

        // Retornar datos mínimos para la gráfica pública
        List<Map<String, Object>> result = asistencias.stream().map(a -> {
            Map<String, Object> item = new HashMap<>();
            item.put("fechaHora", a.getFechaHora());
            item.put("vozVoto", a.getEstadoVozVoto());
            return item;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    /**
     * Ranking de funcionarios por registros en listas - PÚBLICO
     * Muestra el top de funcionarios que más socios han registrado
     */
    @GetMapping("/ranking-funcionarios")
    public ResponseEntity<List<Map<String, Object>>> getRankingFuncionarios() {
        List<Object[]> resultados = usuarioRepository.findRankingByAsignaciones();

        // Paso 1: Construir mapa de ranking por username
        Map<String, Map<String, Object>> rankingMap = new java.util.LinkedHashMap<>();
        Map<String, Long> userIdMap = new HashMap<>(); // username -> userId

        for (Object[] row : resultados) {
            String username = (String) row[0];
            Map<String, Object> item = new HashMap<>();
            item.put("username", username);
            item.put("cargo", row[1]);
            item.put("meta", row[2]);
            item.put("registrados", row[3]);
            item.put("porcentaje", row[4] != null ? row[4] : 0);

            String nombreUsuario = (String) row[5];
            String nombreSocio = (String) row[7];
            String nombreFinal = nombreUsuario;
            if (nombreUsuario == null || nombreUsuario.matches("\\d+") || nombreUsuario.trim().isEmpty()) {
                if (nombreSocio != null && !nombreSocio.trim().isEmpty()) {
                    nombreFinal = nombreSocio;
                }
            }
            item.put("nombre", nombreFinal != null ? nombreFinal : username);
            item.put("sucursal", row[6] != null ? row[6] : "Sin Sucursal");
            item.put("esDirigente", false);
            item.put("incluyePunteros", 0);
            item.put("registradosPunteros", 0L);

            rankingMap.put(username, item);
        }

        // Paso 2: Sumar asignaciones de punteros a sus dirigentes
        List<Usuario> dirigentes = usuarioRepository.findDirigentesActivos();
        for (Usuario dirigente : dirigentes) {
            String dirUsername = dirigente.getUsername();
            if (!rankingMap.containsKey(dirUsername)) continue;

            Map<String, Object> dirItem = rankingMap.get(dirUsername);
            dirItem.put("esDirigente", true);

            // Buscar punteros de este dirigente
            List<Usuario> punteros = usuarioRepository.findByDirigenteIdAndActivoTrue(dirigente.getId());
            long totalPunteros = 0;
            int cantPunteros = 0;

            for (Usuario puntero : punteros) {
                long asigPuntero = listaAsignacionRepository.findByUsuarioId(puntero.getId())
                        .stream()
                        .mapToLong(l -> asignacionRepository.countByListaAsignacionId(l.getId()))
                        .sum();
                totalPunteros += asigPuntero;
                cantPunteros++;

                // Remover puntero del ranking independiente (se suma al dirigente)
                rankingMap.remove(puntero.getUsername());
            }

            if (cantPunteros > 0) {
                long registradosPropios = ((Number) dirItem.get("registrados")).longValue();
                long nuevoTotal = registradosPropios + totalPunteros;
                dirItem.put("registrados", nuevoTotal);
                dirItem.put("registradosPunteros", totalPunteros);
                dirItem.put("incluyePunteros", cantPunteros);

                // Recalcular porcentaje
                Integer meta = (Integer) dirItem.get("meta");
                if (meta != null && meta > 0) {
                    dirItem.put("porcentaje", nuevoTotal * 100.0 / meta);
                }
            }
        }

        // Paso 3: Reordenar por total y limitar a top 10
        List<Map<String, Object>> ranking = rankingMap.values().stream()
                .sorted((a, b) -> Long.compare(
                        ((Number) b.get("registrados")).longValue(),
                        ((Number) a.get("registrados")).longValue()))
                .limit(10)
                .collect(Collectors.toList());

        return ResponseEntity.ok(ranking);
    }

    /**
     * Distribución de registros por sucursal - PÚBLICO
     */
    @GetMapping("/distribucion-sucursales")
    public ResponseEntity<List<Map<String, Object>>> getDistribucionSucursales() {
        List<Object[]> resultados = asignacionRepository.countBySucursal();

        List<Map<String, Object>> distribucion = resultados.stream()
                .map(row -> {
                    Map<String, Object> item = new HashMap<>();
                    item.put("sucursal", row[0] != null ? row[0] : "Sin Sucursal");
                    item.put("total", row[1]);
                    item.put("conVyV", row[2] != null ? row[2] : 0);
                    return item;
                })
                .collect(Collectors.toList());

        return ResponseEntity.ok(distribucion);
    }

    /**
     * Últimas asignaciones (registros en listas) - PÚBLICO
     */
    @GetMapping("/ultimas-asignaciones")
    public ResponseEntity<List<Map<String, Object>>> getUltimasAsignaciones() {
        List<Object[]> resultados = asignacionRepository.findUltimasAsignaciones();

        List<Map<String, Object>> ultimas = resultados.stream()
                .limit(8)
                .map(row -> {
                    Map<String, Object> item = new HashMap<>();
                    item.put("socioNombre", row[0]);
                    item.put("socioNumero", row[1]);
                    item.put("sucursal", row[2] != null ? row[2] : "N/A");
                    item.put("funcionario", row[3]);
                    item.put("tieneVyV", row[4]);
                    return item;
                })
                .collect(Collectors.toList());

        return ResponseEntity.ok(ultimas);
    }
}
