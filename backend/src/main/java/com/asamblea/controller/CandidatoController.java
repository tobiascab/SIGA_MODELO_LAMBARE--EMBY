package com.asamblea.controller;

import com.asamblea.model.Candidato;
import com.asamblea.model.Socio;
import com.asamblea.repository.CandidatoRepository;
import com.asamblea.repository.SocioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/candidatos")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class CandidatoController {

    private final CandidatoRepository candidatoRepository;
    private final SocioRepository socioRepository;
    private final com.asamblea.service.LogAuditoriaService auditService;

    @GetMapping
    public List<Candidato> listar() {
        return candidatoRepository.findByActivoTrueOrderByOrganoAscOrdenAsc();
    }

    // Endpoint público (sin autenticación requerida)
    @GetMapping("/publico")
    public List<Candidato> listarPublico() {
        return candidatoRepository.findByActivoTrueOrderByOrganoAscOrdenAsc();
    }

    @PostMapping
    public ResponseEntity<?> guardar(@RequestBody Map<String, Object> data,
            org.springframework.security.core.Authentication auth,
            jakarta.servlet.http.HttpServletRequest request) {
        try {
            Long socioId = Long.parseLong(data.get("socioId").toString());
            Optional<Socio> socioOpt = socioRepository.findById(socioId);

            if (socioOpt.isEmpty()) {
                return ResponseEntity.badRequest().body("Socio no encontrado");
            }

            Candidato candidato = new Candidato();
            candidato.setSocio(socioOpt.get());
            candidato.setOrgano(Candidato.Organo.valueOf(data.get("organo").toString()));
            candidato.setTipo(Candidato.TipoCandidato.valueOf(data.get("tipo").toString()));
            candidato.setFoto((String) data.get("foto"));
            candidato.setBiografia((String) data.get("biografia"));
            candidato.setOrden(data.get("orden") != null ? (Integer) data.get("orden") : 0);

            candidatoRepository.save(candidato);

            // Auditoría
            auditService.registrar(
                    "CANDIDATOS",
                    "CREAR_CANDIDATO",
                    String.format("Creó candidato: %s para el cargo %s", candidato.getSocio().getNombreCompleto(),
                            candidato.getOrgano().name()),
                    auth.getName(),
                    request.getRemoteAddr());

            return ResponseEntity.ok(Map.of("message", "Candidato guardado con éxito"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error: " + e.getMessage());
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> actualizar(@PathVariable Long id, @RequestBody Map<String, Object> data,
            org.springframework.security.core.Authentication auth,
            jakarta.servlet.http.HttpServletRequest request) {
        return candidatoRepository.findById(id).map(candidato -> {
            if (data.containsKey("organo"))
                candidato.setOrgano(Candidato.Organo.valueOf(data.get("organo").toString()));
            if (data.containsKey("tipo"))
                candidato.setTipo(Candidato.TipoCandidato.valueOf(data.get("tipo").toString()));
            if (data.containsKey("foto"))
                candidato.setFoto((String) data.get("foto"));
            if (data.containsKey("biografia"))
                candidato.setBiografia((String) data.get("biografia"));
            if (data.containsKey("orden"))
                candidato.setOrden((Integer) data.get("orden"));
            if (data.containsKey("activo"))
                candidato.setActivo((Boolean) data.get("activo"));

            candidatoRepository.save(candidato);

            // Auditoría
            auditService.registrar(
                    "CANDIDATOS",
                    "ACTUALIZAR_CANDIDATO",
                    String.format("Actualizó datos del candidato: %s (ID: %d)",
                            candidato.getSocio().getNombreCompleto(), candidato.getId()),
                    auth.getName(),
                    request.getRemoteAddr());

            return ResponseEntity.ok(Map.of("message", "Candidato actualizado"));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> eliminar(@PathVariable Long id,
            org.springframework.security.core.Authentication auth,
            jakarta.servlet.http.HttpServletRequest request) {
        return candidatoRepository.findById(id).map(c -> {
            c.setActivo(false);
            candidatoRepository.save(c);

            // Auditoría
            auditService.registrar(
                    "CANDIDATOS",
                    "ELIMINAR_CANDIDATO",
                    String.format("Desactivó candidato: %s (ID: %d)", c.getSocio().getNombreCompleto(), c.getId()),
                    auth.getName(),
                    request.getRemoteAddr());

            return ResponseEntity.ok(Map.of("message", "Candidato desactivado"));
        }).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/like")
    public ResponseEntity<?> darLike(@PathVariable Long id) {
        return candidatoRepository.findById(id).map(candidato -> {
            candidato.setLikes(candidato.getLikes() == null ? 1 : candidato.getLikes() + 1);
            candidatoRepository.save(candidato);
            return ResponseEntity.ok(Map.of(
                    "message", "Like registrado",
                    "likes", candidato.getLikes()));
        }).orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{id}/likes")
    public ResponseEntity<?> obtenerLikes(@PathVariable Long id) {
        return candidatoRepository.findById(id).map(candidato -> {
            return ResponseEntity.ok(Map.of(
                    "likes", candidato.getLikes() == null ? 0 : candidato.getLikes()));
        }).orElse(ResponseEntity.notFound().build());
    }
}
