package com.asamblea.controller;

import com.asamblea.model.Usuario;
import com.asamblea.repository.UsuarioRepository;
import com.asamblea.service.ReporteExportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/reportes/sucursales")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class ReporteSucursalesController {

    private final JdbcTemplate jdbcTemplate;
    private final UsuarioRepository usuarioRepository;
    private final ReporteExportService exportService;

    private boolean isAuthorized(Authentication auth) {
        if (auth == null)
            return false;
        Usuario user = usuarioRepository.findByUsername(auth.getName()).orElse(null);
        if (user == null)
            return false;
        // Super Admin y Directivo pueden ver reportes globales
        return user.getRol() == Usuario.Rol.SUPER_ADMIN || user.getRol() == Usuario.Rol.DIRECTIVO;
    }

    /**
     * Obtiene el avance de carga por sucursal (VyV vs Solo Voz)
     */
    @GetMapping("/avance")
    public ResponseEntity<?> getAvancePorSucursal(Authentication auth) {
        if (!isAuthorized(auth))
            return ResponseEntity.status(403).build();

        List<Map<String, Object>> result = fetchAvanceData();
        return ResponseEntity.ok(result);
    }

    /**
     * Genera PDF del avance por sucursal
     */
    @GetMapping("/avance/pdf")
    public ResponseEntity<byte[]> exportarPdfAvance(Authentication auth) {
        if (!isAuthorized(auth))
            return ResponseEntity.status(403).build();

        List<Map<String, Object>> data = fetchAvanceData();
        byte[] pdf = exportService.generarPdfAvanceSucursales(data);

        return ResponseEntity.ok()
                .header("Content-Type", "application/pdf")
                .header("Content-Disposition", "attachment; filename=avance_sucursales.pdf")
                .body(pdf);
    }

    private List<Map<String, Object>> fetchAvanceData() {
        String sql = """
                    SELECT
                        CASE 
                            WHEN UPPER(COALESCE(s.nombre, 'Sin Sucursal')) LIKE '%CENTRAL%' 
                              OR UPPER(COALESCE(s.nombre, 'Sin Sucursal')) LIKE '%SUCURSAL 5%' 
                              OR UPPER(COALESCE(s.nombre, 'Sin Sucursal')) LIKE '%SUC 5%'
                              OR UPPER(COALESCE(s.nombre, 'Sin Sucursal')) LIKE '%SAN LORENZO%' 
                            THEN 'CASA CENTRAL'
                            WHEN UPPER(COALESCE(s.nombre, 'Sin Sucursal')) LIKE '%CDE%' 
                              OR UPPER(COALESCE(s.nombre, 'Sin Sucursal')) LIKE '%CIUDAD DEL ESTE%'
                              OR UPPER(COALESCE(s.nombre, 'Sin Sucursal')) LIKE '%HERNANDARIAS%'
                              OR UPPER(COALESCE(s.nombre, 'Sin Sucursal')) LIKE '%ALTO PARANA%' 
                            THEN 'CDE ALTO PARANA'
                            ELSE COALESCE(s.nombre, 'Sin Sucursal') 
                        END as sucursal,
                        COUNT(CASE
                            WHEN LOWER(socio.habilitado_voz_voto) LIKE '%voto%'
                            THEN 1 END) as vyv,
                        COUNT(CASE
                            WHEN NOT(LOWER(COALESCE(socio.habilitado_voz_voto, '')) LIKE '%voto%')
                            THEN 1 END) as solo_voz,
                        COUNT(a.id) as total,
                        ROUND(COUNT(CASE
                            WHEN LOWER(socio.habilitado_voz_voto) LIKE '%voto%'
                            THEN 1 END) * 100.0 / COUNT(a.id), 1) as porcentaje_vyv
                    FROM asignaciones_socios a
                    INNER JOIN listas_asignacion la ON a.lista_id = la.id
                    INNER JOIN usuarios u ON la.user_id = u.id
                    LEFT JOIN sucursales s ON u.id_sucursal = s.id
                    INNER JOIN socios socio ON a.socio_id = socio.id
                    GROUP BY 1
                    ORDER BY total DESC
                """;

        return jdbcTemplate.queryForList(sql);
    }
}
