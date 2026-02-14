package com.asamblea.controller;

import com.asamblea.model.Mesa;
import com.asamblea.model.Sucursal;
import com.asamblea.model.Usuario;
import com.asamblea.repository.MesaRepository;
import com.asamblea.repository.SucursalRepository;
import com.asamblea.repository.UsuarioRepository;
import com.asamblea.repository.SocioRepository;
import com.asamblea.service.LogAuditoriaService;
import com.asamblea.service.MesaService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/mesas")
@RequiredArgsConstructor
public class MesaController {

    private final MesaRepository mesaRepository;
    private final SucursalRepository sucursalRepository;
    private final UsuarioRepository usuarioRepository;
    private final LogAuditoriaService auditService;
    private final SocioRepository socioRepository;
    private final MesaService mesaService;

    @GetMapping
    public List<Mesa> listarMesas() {
        return mesaRepository.findByOrderByNumeroAsc();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Mesa> obtenerMesa(@PathVariable Long id) {
        return mesaRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<?> crearMesa(@RequestBody Map<String, Object> body, Authentication auth) {
        try {
            Mesa mesa = new Mesa();
            mesa.setNumero((Integer) body.get("numero"));
            mesa.setDescripcion((String) body.get("descripcion"));
            mesa.setTipo((String) body.getOrDefault("tipo", "RANGO"));
            mesa.setUbicacion((String) body.get("ubicacion"));

            if (body.get("rangoDesde") != null)
                mesa.setRangoDesde((Integer) body.get("rangoDesde"));
            if (body.get("rangoHasta") != null)
                mesa.setRangoHasta((Integer) body.get("rangoHasta"));
            mesa.setActiva(Boolean.TRUE.equals(body.get("activa")));

            if (body.get("sucursalId") != null) {
                Long sucId = ((Number) body.get("sucursalId")).longValue();
                Sucursal sucursal = sucursalRepository.findById(sucId)
                        .orElseThrow(() -> new RuntimeException("Sucursal no encontrada"));
                mesa.setSucursal(sucursal);
            }

            if (body.get("encargadosIds") != null) {
                List<Integer> ids = (List<Integer>) body.get("encargadosIds");
                List<Long> longIds = ids.stream().map(Number::longValue).collect(Collectors.toList());
                List<Usuario> encargados = usuarioRepository.findAllById(longIds);
                mesa.setEncargados(encargados);
            }

            Mesa guardada = mesaRepository.save(mesa);

            auditService.registrar(
                    "CONFIGURACION",
                    "CREAR_MESA",
                    "Creó mesa #" + mesa.getNumero(),
                    auth.getName(),
                    "API");

            return ResponseEntity.ok(guardada);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<?> actualizarMesa(@PathVariable Long id, @RequestBody Map<String, Object> body,
            Authentication auth) {
        return mesaRepository.findById(id).map(mesa -> {
            try {
                if (body.containsKey("numero"))
                    mesa.setNumero((Integer) body.get("numero"));
                if (body.containsKey("descripcion"))
                    mesa.setDescripcion((String) body.get("descripcion"));
                if (body.containsKey("tipo"))
                    mesa.setTipo((String) body.get("tipo"));
                if (body.containsKey("ubicacion"))
                    mesa.setUbicacion((String) body.get("ubicacion"));
                if (body.containsKey("rangoDesde"))
                    mesa.setRangoDesde((Integer) body.get("rangoDesde"));
                if (body.containsKey("rangoHasta"))
                    mesa.setRangoHasta((Integer) body.get("rangoHasta"));
                if (body.containsKey("activa"))
                    mesa.setActiva((Boolean) body.get("activa"));

                if (body.containsKey("sucursalId")) {
                    Long sucId = body.get("sucursalId") != null ? ((Number) body.get("sucursalId")).longValue() : null;
                    if (sucId != null) {
                        Sucursal sucursal = sucursalRepository.findById(sucId)
                                .orElseThrow(() -> new RuntimeException("Sucursal no encontrada"));
                        mesa.setSucursal(sucursal);
                    } else {
                        mesa.setSucursal(null);
                    }
                }

                if (body.containsKey("encargadosIds")) {
                    List<?> ids = (List<?>) body.get("encargadosIds");
                    List<Long> longIds = ids.stream().map(obj -> ((Number) obj).longValue())
                            .collect(Collectors.toList());
                    List<Usuario> encargados = usuarioRepository.findAllById(longIds);
                    mesa.setEncargados(encargados);
                }

                mesa.setUpdatedAt(LocalDateTime.now());
                Mesa actualizada = mesaRepository.save(mesa);

                auditService.registrar(
                        "CONFIGURACION",
                        "ACTUALIZAR_MESA",
                        "Actualizó mesa #" + mesa.getNumero(),
                        auth.getName(),
                        "API");

                return ResponseEntity.ok(actualizada);
            } catch (Exception e) {
                return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
            }
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<?> eliminarMesa(@PathVariable Long id, Authentication auth) {
        return mesaRepository.findById(id).map(mesa -> {
            mesaRepository.delete(mesa);
            auditService.registrar(
                    "CONFIGURACION",
                    "ELIMINAR_MESA",
                    "Eliminó mesa #" + mesa.getNumero(),
                    auth.getName(),
                    "API");
            return ResponseEntity.ok().build();
        }).orElse(ResponseEntity.notFound().build());
    }
    @GetMapping("/consulta")
    public ResponseEntity<?> consultarMesa(@RequestParam String query) {
        if (query == null || query.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Debe proporcionar un criterio de búsqueda (query)"));
        }

        String term = query.trim();
        java.util.Optional<com.asamblea.model.Socio> socioOpt = socioRepository.findByNumeroSocio(term);
        
        if (socioOpt.isEmpty()) {
             // Try by cedula
             socioOpt = socioRepository.findByCedula(term);
        }

        if (socioOpt.isPresent()) {
            Map<String, Object> mesaInfo = mesaService.calcularMesa(socioOpt.get());
            
            Map<String, Object> result = new HashMap<>(mesaInfo);
            result.put("socioId", socioOpt.get().getId());
            result.put("socioNombre", socioOpt.get().getNombreCompleto());
            result.put("socioNro", socioOpt.get().getNumeroSocio());
            result.put("cedula", socioOpt.get().getCedula());
            
            return ResponseEntity.ok(result);
        } else {
            return ResponseEntity.status(404).body(Map.of("error", "Socio no encontrado", "mesa", 0, "mensaje", "Socio no encontrado"));
        }
    }
}
