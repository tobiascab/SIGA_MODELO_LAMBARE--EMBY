package com.asamblea.controller;

import com.asamblea.model.Socio;
import com.asamblea.model.Usuario;
import com.asamblea.model.ListaAsignacion;
import com.asamblea.repository.AsignacionRepository;
import com.asamblea.repository.AsistenciaRepository;
import com.asamblea.repository.SocioRepository;
import com.asamblea.repository.SucursalRepository;
import com.asamblea.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.core.Authentication;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/usuarios")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@SuppressWarnings("null")
public class UsuarioController {

    private final UsuarioRepository usuarioRepository;
    private final SocioRepository socioRepository;
    private final SucursalRepository sucursalRepository;
    private final PasswordEncoder passwordEncoder;
    private final com.asamblea.service.LogAuditoriaService auditService;
    private final com.asamblea.service.ArizarService arizarService;
    private final com.asamblea.service.PresenciaService presenciaService;
    private final AsignacionRepository asignacionRepository;
    private final AsistenciaRepository asistenciaRepository;
    private final com.asamblea.repository.ListaAsignacionRepository listaAsignacionRepository;

    // Buscar unificado (Usuarios + Socios) con FUSIÓN INTELIGENTE
    // Buscar unificado (Usuarios + Socios) con FUSIÓN INTELIGENTE
    // Este método maneja la búsqueda explícita.
    @GetMapping("/unificados")
    public ResponseEntity<List<Map<String, Object>>> buscarUnificado(@RequestParam(required = false) String term) {
        String query = (term != null) ? term.trim() : "";

        // Usamos un Map para fusionar coincicencias por Cédula/Username
        // Key: Cédula limpia (o Username limpio)
        Map<String, Map<String, Object>> mergedResults = new LinkedHashMap<>();

        // 1. Usuarios del sistema
        List<Usuario> usuarios = usuarioRepository.findAll();

        // Optimización: Cargar mapa de Socios (Only ID -> NumeroSocio) para evitar N+1
        // En un sistema muy grande esto se debe paginar, pero para < 50k socios es
        // manejable en memoria server-side filtrada
        // O mejor: Buscar solo los necesarios si hay query.

        Set<Long> socioIdsToFetch = usuarios.stream()
                .map(u -> u.getSocio() != null ? u.getSocio().getId() : null)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        Map<Long, String> socioNumeroMap = new HashMap<>();
        if (!socioIdsToFetch.isEmpty()) {
            List<Socio> linkedSocios = socioRepository.findAllById(socioIdsToFetch);
            linkedSocios.forEach(s -> socioNumeroMap.put(s.getId(), s.getNumeroSocio()));
        }

        if (!query.isEmpty()) {
            final String qLower = query.toLowerCase();
            usuarios = usuarios.stream()
                    .filter(u -> u.getUsername().equalsIgnoreCase(query) ||
                            u.getNombreCompleto().toLowerCase().contains(qLower) ||
                            (u.getCargo() != null && u.getCargo().toLowerCase().contains(qLower)) ||
                            (u.getSocio() != null && socioNumeroMap.get(u.getSocio().getId()) != null
                                    && socioNumeroMap.get(u.getSocio().getId()).contains(query))) // Buscar por numero
                                                                                                  // socio

                    .sorted((u1, u2) -> {
                        boolean exacto1 = u1.getUsername().equalsIgnoreCase(query);
                        boolean exacto2 = u2.getUsername().equalsIgnoreCase(query);
                        return Boolean.compare(exacto2, exacto1);
                    })
                    .collect(Collectors.toList());
        }

        for (Usuario u : usuarios) {
            Map<String, Object> map = new HashMap<>();
            map.put("id", u.getId());
            map.put("username", u.getUsername());
            map.put("nombreCompleto", u.getNombreCompleto());
            map.put("email", u.getEmail());
            map.put("telefono", u.getTelefono());
            map.put("cargo", u.getCargo()); 
            map.put("meta", u.getMeta()); 
            map.put("rol", u.getRol().name());
            map.put("rolNombre", u.getRol().getNombre());
            map.put("activo", u.isActivo());
            map.put("permisosEspeciales", u.getPermisosEspeciales());
            map.put("idSocio", u.getSocio() != null ? u.getSocio().getId() : null);
            map.put("numeroSocio", u.getSocio() != null ? u.getSocio().getNumeroSocio() : null); 
            map.put("sucursalId", u.getSucursal() != null ? u.getSucursal().getId() : (u.getSocio() != null && u.getSocio().getSucursal() != null ? u.getSocio().getSucursal().getId() : null));
            
            String sName = u.getSucursal() != null ? u.getSucursal().getNombre() : (u.getSocio() != null && u.getSocio().getSucursal() != null ? u.getSocio().getSucursal().getNombre() : "CASA CENTRAL");
            if (sName == null || sName.equalsIgnoreCase("Sucursal 5") || sName.equalsIgnoreCase("Central")) sName = "CASA CENTRAL";
            map.put("sucursal", sName);

            map.put("passwordVisible", u.getPasswordVisible()); 
            map.put("tipo", "USUARIO");

            // FUSIÓN: Si tiene socio vinculado, agregar detalles de estado
            if (u.getSocio() != null) {
                Socio s = u.getSocio();
                map.put("aporteAlDia", s.isAporteAlDia());
                map.put("solidaridadAlDia", s.isSolidaridadAlDia());
                map.put("fondoAlDia", s.isFondoAlDia());
                map.put("incoopAlDia", s.isIncoopAlDia());
                map.put("creditoAlDia", s.isCreditoAlDia());
            }

            // Usamos username como clave de fusión (asumiendo que es la cédula)
            String key = u.getUsername().replaceAll("[^0-9]", "");
            if (!key.isEmpty()) {
                mergedResults.put(key, map);
            } else {
                // Si el username no es numérico (ej: "admin"), usamos el ID como key única temp
                mergedResults.put("USER_" + u.getId(), map);
            }
        }

        // 2. Socios
        if (!query.isEmpty() || mergedResults.size() < 100) {
            List<Socio> socios;
            if (!query.isEmpty()) {
                // Agregar búsqueda por numeroSocio también aquí si no lo hace ya
                List<Socio> exactos = socioRepository.buscarExacto(query);
                socios = !exactos.isEmpty() ? exactos : socioRepository.buscarParcial(query);
            } else {
                socios = socioRepository.findAll().stream().limit(100).collect(Collectors.toList());
            }

            for (Socio s : socios) {
                String cedulaKey = s.getCedula().replaceAll("[^0-9]", "");

                // ¿Existe ya este socio como usuario en la lista?
                if (mergedResults.containsKey(cedulaKey)) {
                    // FUSIÓN: Enriquecer el resultado existente
                    Map<String, Object> existingMap = mergedResults.get(cedulaKey);
                    existingMap.put("idSocio", s.getId()); // Vincular ID Socio
                    existingMap.put("nroSocio", s.getNumeroSocio()); // Agregar Nro Socio visual
                    existingMap.put("cedula", s.getCedula());
                    existingMap.put("vozVoto", s.isEstadoVozVoto());
                    existingMap.put("rolNombre", existingMap.get("rolNombre") + " / Socio"); // Mostrar ambos roles
                                                                                             // visualmente

                    // Agregar estados
                    existingMap.put("aporteAlDia", s.isAporteAlDia());
                    existingMap.put("solidaridadAlDia", s.isSolidaridadAlDia());
                    existingMap.put("fondoAlDia", s.isFondoAlDia());
                    existingMap.put("incoopAlDia", s.isIncoopAlDia());
                    existingMap.put("creditoAlDia", s.isCreditoAlDia());

                } else {
                    // NUEVO: No estaba como usuario, agregarlo como socio puro
                    // Verificar si ya fue agregado por socio linkeado (edge case)
                    boolean alreadyLinked = mergedResults.values().stream()
                            .anyMatch(m -> m.get("idSocio") != null
                                    && m.get("idSocio").toString().equals(s.getId().toString()));

                    if (alreadyLinked)
                        continue;

                    Map<String, Object> map = new HashMap<>();
                    map.put("id", null);
                    map.put("username", null);
                    map.put("nombreCompleto", s.getNombreCompleto());
                    map.put("rol", "USUARIO_SOCIO");
                    map.put("rolNombre", "Socio");
                    map.put("activo", false);
                    map.put("idSocio", s.getId());
                    map.put("nroSocio", s.getNumeroSocio());
                    map.put("cedula", s.getCedula());
                    map.put("tipo", "SOCIO");
                    map.put("vozVoto", s.isEstadoVozVoto());
                    map.put("sucursal", s.getSucursal() != null ? s.getSucursal().getNombre() : null);

                    // Agregar estados
                    map.put("aporteAlDia", s.isAporteAlDia());
                    map.put("solidaridadAlDia", s.isSolidaridadAlDia());
                    map.put("fondoAlDia", s.isFondoAlDia());
                    map.put("incoopAlDia", s.isIncoopAlDia());
                    map.put("creditoAlDia", s.isCreditoAlDia());

                    mergedResults.put("SOCIO_" + s.getId(), map);
                }
            }
        }

        // 3. FILTRO FINAL: SUPREMACÍA EXACTA
        // Si hay algún resultado EXACTO (por username, nroSocio o cedula), eliminamos
        // el ruido parcial.
        // IMPORTANTE: Normalizamos quitando puntos y espacios para comparar '56015' con
        // '56.015'
        if (!query.isEmpty()) {
            final String qClean = query.replaceAll("[^0-9]", "");

            // Solo aplicamos esto si el query es numérico
            if (!qClean.isEmpty()) {
                List<Map<String, Object>> exactMatches = new ArrayList<>();

                for (Map<String, Object> result : mergedResults.values()) {
                    boolean isExact = false;

                    // Helper para limpiar valores del mapa
                    String username = result.get("username") != null
                            ? String.valueOf(result.get("username")).replaceAll("[^0-9]", "")
                            : "";
                    String cedula = result.get("cedula") != null
                            ? String.valueOf(result.get("cedula")).replaceAll("[^0-9]", "")
                            : "";
                    String nroSocio = result.get("nroSocio") != null
                            ? String.valueOf(result.get("nroSocio")).replaceAll("[^0-9]", "")
                            : "";

                    if (username.equals(qClean) || cedula.equals(qClean) || nroSocio.equals(qClean)) {
                        isExact = true;
                    }

                    if (isExact) {
                        exactMatches.add(result);
                    }
                }

                // Si encontramos exactos, SOLO devolvemos esos. Si no, devolvemos todo
                // (parciales).
                if (!exactMatches.isEmpty()) {
                    return ResponseEntity.ok(exactMatches);
                }
            }
        }

        return ResponseEntity.ok(new ArrayList<>(mergedResults.values()));
    }

    private final com.asamblea.repository.FuncionarioDirectivoRepository funcionarioRepository;

    // Listar todos los usuarios + Funcionarios importados
    // Listar todos los usuarios + Funcionarios importados (Punto de entrada
    // principal)
    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> listar(@RequestParam(required = false) String term) {
        // Si hay término de búsqueda, delegamos a la búsqueda unificada
        if (term != null && !term.trim().isEmpty()) {
            return buscarUnificado(term);
        }
        return listarTodos();
    }

    private ResponseEntity<List<Map<String, Object>>> listarTodos() {
        List<Map<String, Object>> result = new ArrayList<>();

        // 1. Obtener usuarios registrados
        List<Usuario> usuarios = usuarioRepository.findAll();
        Set<String> procesados = new HashSet<>(); // Para evitar duplicados (username/cedula)

        for (Usuario u : usuarios) {
            Map<String, Object> map = new HashMap<>();
            map.put("id", u.getId());
            map.put("username", u.getUsername());
            map.put("nombreCompleto", u.getNombreCompleto());
            map.put("email", u.getEmail());
            map.put("telefono", u.getTelefono());
            map.put("rol", u.getRol().name());
            map.put("rolNombre", u.getRol().getNombre());
            map.put("activo", u.isActivo());
            map.put("permisosEspeciales", u.getPermisosEspeciales());
            map.put("idSocio", u.getIdSocio());
            map.put("sucursalId", u.getSucursal() != null ? u.getSucursal().getId() : (u.getSocio() != null && u.getSocio().getSucursal() != null ? u.getSocio().getSucursal().getId() : null));
            
            String sNameAll = u.getSucursal() != null ? u.getSucursal().getNombre() : (u.getSocio() != null && u.getSocio().getSucursal() != null ? u.getSocio().getSucursal().getNombre() : "CASA CENTRAL");
            if (sNameAll == null || sNameAll.equalsIgnoreCase("Sucursal 5") || sNameAll.equalsIgnoreCase("Central")) sNameAll = "CASA CENTRAL";
            map.put("sucursal", sNameAll);

            map.put("passwordVisible", u.getPasswordVisible()); // Contraseña visible para super admins
            map.put("tipo", "USUARIO");
            map.put("cargo", u.getCargo());
            map.put("meta", u.getMeta());
            map.put("isDirigente", Boolean.TRUE.equals(u.getIsDirigente()));
            map.put("dirigenteId", u.getDirigente() != null ? u.getDirigente().getId() : null);
            map.put("dirigenteNombre", u.getDirigente() != null ? u.getDirigente().getNombreCompleto() : null);

            if (u.getSocio() != null) {
                map.put("cedula", u.getSocio().getCedula());
                map.put("numeroSocio", u.getSocio().getNumeroSocio());
            } else {
                // Intentar recuperar cédula del username si es numérico
                if (u.getUsername().matches("\\d+")) {
                    map.put("cedula", u.getUsername());
                }
            }

            result.add(map);
            procesados.add(u.getUsername()); // Asumimos username como identificador clave
        }

        // 2. Obtener funcionarios importados que NO son usuarios aún
        List<com.asamblea.model.FuncionarioDirectivo> funcionarios = funcionarioRepository.findAll();
        for (com.asamblea.model.FuncionarioDirectivo f : funcionarios) {
            // Verificar si ya está procesado como usuario (por Cédula o NroSocio)
            // Normalizamos cédula quitando puntos
            String cedulaLimpia = f.getCedula() != null ? f.getCedula().replaceAll("[^0-9]", "") : "";

            if (procesados.contains(cedulaLimpia) || procesados.contains(f.getNumeroSocio())) {
                continue; // Ya está listado como Usuario
            }

            Map<String, Object> map = new HashMap<>();
            map.put("id", null); // No tiene ID de Usuario
            map.put("idFuncionario", f.getId());
            map.put("username", f.getCedula()); // Mostramos cédula como "usuario" sugerido
            map.put("nombreCompleto", f.getNombreCompleto());
            map.put("email", ""); // No tiene email aún
            map.put("telefono", "");
            map.put("rol", f.getRol().name());
            map.put("rolNombre", "Funcionario / " + f.getRol().name());
            map.put("activo", false); // Inactivo porque no tiene usuario creado
            map.put("sucursal", null);
            map.put("cedula", f.getCedula());
            map.put("numeroSocio", f.getNumeroSocio());
            map.put("tipo", "FUNCIONARIO"); // Flag para UI

            result.add(map);
        }

        return ResponseEntity.ok(result);
    }

    // Obtener roles disponibles
    @GetMapping("/roles")
    public ResponseEntity<List<Map<String, String>>> obtenerRoles() {
        List<Map<String, String>> roles = Arrays.stream(Usuario.Rol.values())
                .map(r -> Map.of(
                        "value", r.name(),
                        "nombre", r.getNombre(),
                        "descripcion", r.getDescripcion()))
                .collect(Collectors.toList());
        return ResponseEntity.ok(roles);
    }

    // Buscar usuarios registrados y activos (para chat - NO incluye socios del
    // padrón)
    @GetMapping("/buscar")
    public ResponseEntity<List<Map<String, Object>>> buscarUsuariosActivos(
            @RequestParam(required = false) String term) {
        String query = (term != null) ? term.trim().toLowerCase() : "";

        List<Usuario> usuarios = usuarioRepository.findAll().stream()
                .filter(Usuario::isActivo) // Solo usuarios activos
                .filter(u -> {
                    if (query.isEmpty())
                        return true;
                    // Buscar por nombre, username (cédula), o cualquier campo relevante
                    return u.getNombreCompleto().toLowerCase().contains(query) ||
                            u.getUsername().contains(query) ||
                            (u.getEmail() != null && u.getEmail().toLowerCase().contains(query)) ||
                            (u.getTelefono() != null && u.getTelefono().contains(query)) ||
                            (u.getCargo() != null && u.getCargo().toLowerCase().contains(query));
                })
                .limit(20) // Limitar resultados para rendimiento
                .collect(Collectors.toList());

        List<Map<String, Object>> result = new ArrayList<>();
        for (Usuario u : usuarios) {
            Map<String, Object> map = new HashMap<>();
            map.put("id", u.getId());
            map.put("username", u.getUsername());
            map.put("nombreCompleto", u.getNombreCompleto());
            map.put("rol", u.getRol().name());
            map.put("rolNombre", u.getRol().getNombre());
            map.put("cargo", u.getCargo());
            map.put("sucursal", u.getSucursal() != null ? u.getSucursal().getNombre() : null);
            result.add(map);
        }

        return ResponseEntity.ok(result);
    }

    // Crear nuevo usuario
    @PostMapping
    public ResponseEntity<?> crear(@RequestBody Map<String, Object> data, Authentication auth,
            HttpServletRequest request) {
        try {
            String username = (String) data.get("username");
            String password = (String) data.get("password");
            String nombreCompleto = (String) data.get("nombreCompleto");
            String email = (String) data.get("email");
            String telefono = (String) data.get("telefono");
            String rol = (String) data.get("rol");
            Long sucursalId = data.get("sucursalId") != null ? Long.parseLong(data.get("sucursalId").toString()) : null;

            // Validar username único
            if (usuarioRepository.findByUsername(username).isPresent()) {
                return ResponseEntity.badRequest().body(Map.of("error", "El nombre de usuario ya existe"));
            }

            Usuario usuario = new Usuario();
            usuario.setUsername(username);
            usuario.setPassword(passwordEncoder.encode(password));
            usuario.setPasswordVisible(password); // Guardar contraseña visible para admins
            usuario.setNombreCompleto(nombreCompleto);
            usuario.setEmail(email);
            usuario.setTelefono(telefono);
            usuario.setRol(Usuario.Rol.valueOf(rol));
            usuario.setActivo(true);
            usuario.setPermisosEspeciales((String) data.get("permisosEspeciales"));

            // Nuevos campos
            String cargoValue = (String) data.get("cargo");
            usuario.setCargo(cargoValue);
            usuario.setMeta(data.get("meta") != null ? ((Number) data.get("meta")).intValue() : 50);

            // SYNC: Si cargo es "Dirigente", activar isDirigente automáticamente
            if ("Dirigente".equalsIgnoreCase(cargoValue)) {
                usuario.setIsDirigente(true);
                if (usuario.getMeta() == null || usuario.getMeta() < 100) {
                    usuario.setMeta(100);
                }
            }

            if (data.containsKey("idSocio") && data.get("idSocio") != null) {
                Long idSocio = Long.parseLong(data.get("idSocio").toString());
                socioRepository.findById(idSocio).ifPresent(usuario::setSocio);
            }

            if (sucursalId != null) {
                sucursalRepository.findById(sucursalId).ifPresent(usuario::setSucursal);
            }

            usuarioRepository.save(usuario);

            // SYNC SOCIO: Si tiene socio vinculado, actualizar teléfono también
            if (usuario.getSocio() != null && usuario.getTelefono() != null && !usuario.getTelefono().isEmpty()) {
                Socio s = usuario.getSocio();
                s.setTelefono(usuario.getTelefono());
                socioRepository.save(s);
            }

            auditService.registrar(
                    "USUARIOS",
                    "CREAR_USUARIO",
                    String.format("Creó al usuario '%s' con rol %s", username, rol),
                    auth != null ? auth.getName() : "SISTEMA",
                    request.getRemoteAddr());

            return ResponseEntity.ok(Map.of("message", "Usuario creado exitosamente", "id", usuario.getId()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // Actualizar usuario
    @PutMapping("/{id:[0-9]+}")
    public ResponseEntity<?> actualizar(@PathVariable Long id, @RequestBody Map<String, Object> data,
            Authentication auth, HttpServletRequest request) {
        try {
            Optional<Usuario> opt = usuarioRepository.findById(id);
            if (opt.isEmpty()) {
                return ResponseEntity.notFound().build();
            }

            Usuario usuario = opt.get();

            if (data.containsKey("nombreCompleto")) {
                usuario.setNombreCompleto((String) data.get("nombreCompleto"));
            }
            if (data.containsKey("email")) {
                usuario.setEmail((String) data.get("email"));
            }
            if (data.containsKey("telefono")) {
                String nuevoTelefono = (String) data.get("telefono");
                String oldTelefono = usuario.getTelefono();
                usuario.setTelefono(nuevoTelefono);

                // Trigger Arizar si es un teléfono nuevo o cambió
                if (nuevoTelefono != null && !nuevoTelefono.isEmpty() && !nuevoTelefono.equals(oldTelefono)) {
                    // Guardamos primero para asegurar persistencia antes del async
                    usuarioRepository.save(usuario);
                    arizarService.notificarRegistro(usuario);

                    // SYNC SOCIO: Actualizar teléfono en el socio vinculado
                    if (usuario.getSocio() != null) {
                        Socio s = usuario.getSocio();
                        s.setTelefono(nuevoTelefono);
                        socioRepository.save(s);
                    }
                }

            }
            if (data.containsKey("rol")) {
                usuario.setRol(Usuario.Rol.valueOf((String) data.get("rol")));
            }
            if (data.containsKey("fotoPerfil")) {
                usuario.setFotoPerfil((String) data.get("fotoPerfil"));
            }
            if (data.containsKey("activo")) {
                usuario.setActivo((Boolean) data.get("activo"));
            }
            if (data.containsKey("password") && data.get("password") != null
                    && !((String) data.get("password")).isEmpty()) {
                String newPassword = (String) data.get("password");
                usuario.setPassword(passwordEncoder.encode(newPassword));
                usuario.setPasswordVisible(newPassword); // Actualizar contraseña visible
            }
            if (data.containsKey("permisosEspeciales")) {
                usuario.setPermisosEspeciales((String) data.get("permisosEspeciales"));
            }
            if (data.containsKey("idSocio")) {
                Long idSocio = data.get("idSocio") != null ? Long.parseLong(data.get("idSocio").toString()) : null;
                if (idSocio != null) {
                    socioRepository.findById(idSocio).ifPresent(usuario::setSocio);
                } else {
                    usuario.setSocio(null);
                }
            }

            if (data.containsKey("cargo")) {
                String cargoValue = (String) data.get("cargo");
                usuario.setCargo(cargoValue);

                // SYNC: Si cargo es "Dirigente", activar isDirigente automáticamente
                if ("Dirigente".equalsIgnoreCase(cargoValue)) {
                    usuario.setIsDirigente(true);
                    if (usuario.getMeta() == null || usuario.getMeta() < 100) {
                        usuario.setMeta(100);
                    }
                } else if (cargoValue != null) {
                    // Si cambió a otro cargo, desactivar isDirigente
                    usuario.setIsDirigente(false);
                }
            }
            if (data.containsKey("meta")) {
                usuario.setMeta(data.get("meta") != null ? ((Number) data.get("meta")).intValue() : 50);
            }
            if (data.containsKey("sucursalId")) {
                Long sucursalId = data.get("sucursalId") != null ? Long.parseLong(data.get("sucursalId").toString())
                        : null;
                if (sucursalId != null) {
                    sucursalRepository.findById(sucursalId).ifPresent(usuario::setSucursal);
                } else {
                    usuario.setSucursal(null);
                }
            }

            // Soporte para campo isDirigente (toggle manual desde UI)
            if (data.containsKey("isDirigente")) {
                boolean isDirValue = data.get("isDirigente") != null && (Boolean) data.get("isDirigente");
                usuario.setIsDirigente(isDirValue);
                if (isDirValue && (usuario.getMeta() == null || usuario.getMeta() < 100)) {
                    usuario.setMeta(100);
                }
                // Sync cargo si se activa isDirigente manualmente
                if (isDirValue && (usuario.getCargo() == null || !"Dirigente".equalsIgnoreCase(usuario.getCargo()))) {
                    usuario.setCargo("Dirigente");
                }
            }

            usuarioRepository.save(usuario);

            auditService.registrar(
                    "USUARIOS",
                    "ACTUALIZAR_USUARIO",
                    String.format("Actualizó datos del usuario '%s'", usuario.getUsername()),
                    auth.getName(),
                    request.getRemoteAddr());

            return ResponseEntity.ok(Map.of("message", "Usuario actualizado exitosamente"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // Desactivar usuario
    @DeleteMapping("/{id:[0-9]+}")
    public ResponseEntity<?> desactivar(@PathVariable Long id, Authentication auth, HttpServletRequest request) {
        Optional<Usuario> opt = usuarioRepository.findById(id);
        if (opt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Usuario usuario = opt.get();
        usuario.setActivo(false);
        usuarioRepository.save(usuario);

        auditService.registrar(
                "USUARIOS",
                "DESACTIVAR_USUARIO",
                String.format("Desactivó al usuario '%s'", usuario.getUsername()),
                auth.getName(),
                request.getRemoteAddr());

        return ResponseEntity.ok(Map.of("message", "Usuario desactivado"));
    }

    // Obtener usuario por ID
    @GetMapping("/{id:[0-9]+}")
    public ResponseEntity<?> obtenerPorId(@PathVariable Long id) {
        return usuarioRepository.findById(id)
                .map(u -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("id", u.getId());
                    map.put("username", u.getUsername());
                    map.put("nombreCompleto", u.getNombreCompleto());
                    map.put("email", u.getEmail());
                    map.put("telefono", u.getTelefono());
                    map.put("rol", u.getRol().name());
                    map.put("rolNombre", u.getRol().getNombre());
                    map.put("activo", u.isActivo());
                    map.put("sucursalId", u.getSucursal() != null ? u.getSucursal().getId() : null);
                    return ResponseEntity.ok(map);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // Listar operadores/funcionarios con CRUCE DE PADRÓN DE SOCIOS
    @GetMapping("/operadores")
    public ResponseEntity<List<Map<String, Object>>> listarOperadores() {
        // Obtenemos solo usuarios que pueden ser operadores (excluimos socios puros)
        List<Usuario> usuarios = usuarioRepository.findAll().stream()
                .filter(u -> u.getRol() != Usuario.Rol.USUARIO_SOCIO)
                .collect(Collectors.toList());

        List<Map<String, Object>> result = new ArrayList<>();
        for (Usuario u : usuarios) {
            Map<String, Object> map = new HashMap<>();
            map.put("id", u.getId());
            map.put("username", u.getUsername());
            map.put("nombreCompleto", u.getNombreCompleto());
            map.put("rol", u.getRol().name());

            // LÓGICA DE CRUCE: Consultar el padrón de socios por cédula (username)
            Optional<Socio> socioOpt = socioRepository.findByCedula(u.getUsername());
            if (socioOpt.isPresent()) {
                Socio s = socioOpt.get();
                // Si es socio, la sucursal del padrón manda
                map.put("sucursal", s.getSucursal() != null ? s.getSucursal().getNombre() : "Sin Sucursal");
                map.put("sucursalId", s.getSucursal() != null ? s.getSucursal().getId() : null);
                map.put("cedula", s.getCedula());
                map.put("numeroSocio", s.getNumeroSocio());
            } else {
                // Fallback: Si no es socio, usamos su configuración de usuario
                map.put("sucursal", u.getSucursal() != null ? u.getSucursal().getNombre() : "Sin Sucursal");
                map.put("sucursalId", u.getSucursal() != null ? u.getSucursal().getId() : null);
                map.put("cedula", u.getUsername());
            }
            result.add(map);
        }
        return ResponseEntity.ok(result);
    }

    // Cambiar contraseña del usuario actual (requiere contraseña actual)
    @PostMapping("/cambiar-password-actual")
    public ResponseEntity<?> cambiarPasswordActual(@RequestBody Map<String, String> data, Authentication auth,
            HttpServletRequest request) {
        try {
            String currentPassword = data.get("currentPassword");
            String newPassword = data.get("newPassword");

            if (currentPassword == null || currentPassword.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Debe proporcionar la contraseña actual"));
            }
            if (newPassword == null || newPassword.length() < 4) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "La nueva contraseña debe tener al menos 4 caracteres"));
            }

            String username = auth.getName();
            Usuario usuario = usuarioRepository.findByUsername(username)
                    .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

            // Verificar contraseña actual
            if (!passwordEncoder.matches(currentPassword, usuario.getPassword())) {
                return ResponseEntity.badRequest().body(Map.of("error", "La contraseña actual es incorrecta"));
            }

            // Actualizar contraseña
            usuario.setPassword(passwordEncoder.encode(newPassword));
            usuario.setPasswordVisible(newPassword);
            usuario.setRequiresPasswordChange(false);
            usuarioRepository.save(usuario);

            auditService.registrar(
                    "USUARIOS",
                    "CAMBIAR_PASSWORD_PROPIO",
                    "El usuario cambió su propia contraseña exitosamente.",
                    usuario.getUsername(),
                    request.getRemoteAddr());

            return ResponseEntity.ok(Map.of("message", "Contraseña actualizada correctamente"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Endpoint para notificar que el usuario está saliendo (cierra pestaña).
     * Usa sendBeacon del navegador - no requiere auth header tradicional.
     */
    @PostMapping("/leaving")
    public ResponseEntity<?> leaving(@RequestBody(required = false) Map<String, String> body) {
        if (body == null || body.get("token") == null) {
            return ResponseEntity.ok(Map.of("status", "no-token"));
        }

        try {
            // String token = body.get("token"); // Token recibido pero no procesado
            // explícitamente (TTL se encarga)
            // Intentar extraer el usuario del token (simplificado)
            // En producción deberías decodificar el JWT
            // Por ahora, simplemente dejamos que expire naturalmente en 12 segundos
            return ResponseEntity.ok(Map.of("status", "noted"));
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of("status", "error"));
        }
    }

    /**
     * Endpoint para obtener estadísticas de usuarios en tiempo real.
     * - total: Todos los usuarios creados en el sistema
     * - usuales: Usuarios que han iniciado sesión al menos una vez (tienen
     * lastLogin)
     * - activos: Usuarios actualmente conectados (heartbeat en últimos 60 segundos)
     */
    @GetMapping("/estadisticas")
    public ResponseEntity<?> getEstadisticas(Authentication auth) {
        if (auth == null) {
            return ResponseEntity.status(401).body(Map.of("error", "No autenticado"));
        }

        List<Usuario> allUsers = usuarioRepository.findAll();

        // Total de usuarios en el sistema
        long total = allUsers.size();

        // Usuarios "usuales" - que tienen lastLogin (han iniciado sesión alguna vez)
        long usuales = allUsers.stream()
                .filter(u -> u.getLastLogin() != null)
                .count();

        // Usuarios activos en tiempo real
        int activos = presenciaService.getActiveUsersCount();

        // Usuarios sin registros - que han entrado pero no han hecho nada
        long sinRegistros = allUsers.stream()
                .filter(u -> u.getLastLogin() != null)
                .filter(u -> u.getTotalOnlineSeconds() != null && u.getTotalOnlineSeconds() > 0)
                // Aquí la lógica real sería contar asignaciones, pero por ahora usamos tiempo
                // online como proxy o 0 asignaciones
                .count();

        return ResponseEntity.ok(Map.of(
                "total", total,
                "usuales", usuales,
                "activos", activos,
                "sinRegistros", sinRegistros));

    }

    /**
     * Obtiene la lista detallada de usuarios activos actualmente.
     */
    @GetMapping("/activos-lista")
    public ResponseEntity<List<Map<String, Object>>> getActivosLista(Authentication auth) {
        // Solo para admins/directivos
        if (auth == null)
            return ResponseEntity.status(401).build();

        Map<Long, java.time.Instant> activeMap = presenciaService.getActiveUsersMap();
        List<Usuario> usuarios = usuarioRepository.findAllById(activeMap.keySet());

        List<Map<String, Object>> result = usuarios.stream().map(u -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", u.getId());
            map.put("nombre", u.getNombreCompleto());
            map.put("username", u.getUsername());
            map.put("foto", u.getFotoPerfil());
            map.put("rol", u.getRol());
            map.put("sucursal", u.getSucursal() != null ? u.getSucursal().getNombre() : "N/A");
            map.put("ultimoHeartbeat", activeMap.get(u.getId()));
            return map;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    // ====== ENDPOINTS DE DIRIGENTES Y PUNTEROS ======

    /**
     * Toggle estado dirigente de un usuario.
     * Solo admins pueden cambiar esto.
     */
    @PutMapping("/{id}/toggle-dirigente")
    public ResponseEntity<?> toggleDirigente(@PathVariable Long id, Authentication auth, HttpServletRequest request) {
        try {
            Optional<Usuario> opt = usuarioRepository.findById(id);
            if (opt.isEmpty()) return ResponseEntity.notFound().build();

            Usuario usuario = opt.get();
            boolean newValue = !Boolean.TRUE.equals(usuario.getIsDirigente());
            usuario.setIsDirigente(newValue);

            // Si se activa como dirigente, meta mínima 100
            if (newValue && (usuario.getMeta() == null || usuario.getMeta() < 100)) {
                usuario.setMeta(100);
            }

            usuarioRepository.save(usuario);

            auditService.registrar(
                    "USUARIOS",
                    newValue ? "ACTIVAR_DIRIGENTE" : "DESACTIVAR_DIRIGENTE",
                    String.format("%s dirigente para '%s'", newValue ? "Activó" : "Desactivó", usuario.getUsername()),
                    auth.getName(),
                    request.getRemoteAddr());

            return ResponseEntity.ok(Map.of(
                    "message", newValue ? "Dirigente activado" : "Dirigente desactivado",
                    "isDirigente", newValue,
                    "meta", usuario.getMeta()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Crear puntero desde un socio de la lista del dirigente.
     * El dirigente selecciona un socio de su lista y lo habilita como puntero.
     */
    @PostMapping("/crear-puntero")
    public ResponseEntity<?> crearPuntero(@RequestBody Map<String, Object> data, Authentication auth,
            HttpServletRequest request) {
        try {
            Long socioId = Long.parseLong(data.get("socioId").toString());
            Long dirigenteId = Long.parseLong(data.get("dirigenteId").toString());

            // Verificar que el dirigente existe y es dirigente o SUPER_ADMIN
            Optional<Usuario> dirOpt = usuarioRepository.findById(dirigenteId);
            if (dirOpt.isEmpty() || (!Boolean.TRUE.equals(dirOpt.get().getIsDirigente()) && dirOpt.get().getRol() != Usuario.Rol.SUPER_ADMIN)) {
                return ResponseEntity.badRequest().body(Map.of("error", "El usuario no es un dirigente válido"));
            }

            // Verificar que el socio existe
            Optional<Socio> socioOpt = socioRepository.findById(socioId);
            if (socioOpt.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Socio no encontrado"));
            }

            Socio socio = socioOpt.get();

            // Verificar que no tenga ya un usuario creado
        Optional<Usuario> existingUser = usuarioRepository.findBySocioId(socioId);
        if (existingUser.isPresent()) {
            Usuario existente = existingUser.get();
            // Si es un puntero inactivo, reactivarlo automáticamente
            if (existente.getRol() == Usuario.Rol.PUNTERO && !existente.isActivo()) {
                existente.setActivo(true);
                existente.setDirigente(dirOpt.get());
                existente.setLoginHabilitado(false);
                usuarioRepository.save(existente);

                auditService.registrar(
                        "USUARIOS",
                        "REACTIVAR_PUNTERO",
                        String.format("Dirigente '%s' reactivó puntero '%s' (CI: %s)",
                                dirOpt.get().getUsername(), existente.getNombreCompleto(), existente.getUsername()),
                        auth.getName(),
                        request.getRemoteAddr());

                return ResponseEntity.ok(Map.of(
                        "message", "Puntero reactivado exitosamente. Debe habilitar su inicio de sesión desde Gestión de Punteros.",
                        "username", existente.getUsername(),
                        "password", existente.getUsername(),
                        "punteroId", existente.getId(),
                        "nombreCompleto", existente.getNombreCompleto(),
                        "loginHabilitado", false,
                        "reactivado", true));
            }
            return ResponseEntity.badRequest().body(Map.of("error",
                    "Este socio ya tiene acceso al sistema como: " + existente.getUsername()));
        }

            // Crear el usuario puntero
            String cedula = socio.getCedula() != null ? socio.getCedula().replaceAll("\\D", "") : "";
            if (cedula.isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "El socio no tiene cédula registrada. No se puede crear el acceso."));
            }

            // Verificar username único
            if (usuarioRepository.findByUsername(cedula).isPresent()) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Ya existe un usuario con ese número de cédula como username"));
            }

            Usuario puntero = new Usuario();
            puntero.setUsername(cedula);
            puntero.setPassword(passwordEncoder.encode(cedula));
            puntero.setPasswordVisible(cedula);
            puntero.setNombreCompleto(socio.getNombreCompleto());
            puntero.setRol(Usuario.Rol.PUNTERO);
            puntero.setActivo(true);
            puntero.setLoginHabilitado(false); // No puede iniciar sesión hasta que el dirigente lo habilite
            puntero.setMeta(50); // Meta de puntero: 50
            puntero.setSocio(socio);
            puntero.setDirigente(dirOpt.get());
            puntero.setPermisosEspeciales("dashboard,asignaciones,asignacion-rapida,mi-reporte,configuracion");
            puntero.setRequiresPasswordChange(true);

            // Heredar sucursal del dirigente o del socio
            if (dirOpt.get().getSucursal() != null) {
                puntero.setSucursal(dirOpt.get().getSucursal());
            } else if (socio.getSucursal() != null) {
                puntero.setSucursal(socio.getSucursal());
            }

            usuarioRepository.save(puntero);

            auditService.registrar(
                    "USUARIOS",
                    "CREAR_PUNTERO",
                    String.format("Dirigente '%s' creó puntero '%s' (CI: %s) - Login pendiente de habilitación",
                            dirOpt.get().getUsername(), socio.getNombreCompleto(), cedula),
                    auth.getName(),
                    request.getRemoteAddr());

            return ResponseEntity.ok(Map.of(
                    "message", "Puntero registrado exitosamente. Debe habilitar su inicio de sesión desde Gestión de Punteros.",
                    "username", cedula,
                    "password", cedula,
                    "punteroId", puntero.getId(),
                    "nombreCompleto", socio.getNombreCompleto(),
                    "loginHabilitado", false));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Eliminar (desactivar) un puntero.
     * Reasigna las listas del puntero al dirigente padre y desactiva la cuenta.
     */
    @DeleteMapping("/eliminar-puntero/{punteroId}")
    public ResponseEntity<?> eliminarPuntero(@PathVariable Long punteroId, Authentication auth,
            HttpServletRequest request) {
        try {
            Optional<Usuario> punteroOpt = usuarioRepository.findById(punteroId);
            if (punteroOpt.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Puntero no encontrado"));
            }

            Usuario puntero = punteroOpt.get();

            // Verificar que sea un puntero
            if (puntero.getRol() != Usuario.Rol.PUNTERO) {
                return ResponseEntity.badRequest().body(Map.of("error", "El usuario no es un puntero"));
            }

            String nombrePuntero = puntero.getNombreCompleto();
            Long dirigenteId = puntero.getDirigente() != null ? puntero.getDirigente().getId() : null;

            // Reasignar las listas del puntero al dirigente padre
            if (dirigenteId != null) {
                List<com.asamblea.model.ListaAsignacion> listasDelPuntero = listaAsignacionRepository.findByUsuarioId(punteroId);
                Usuario dirigente = puntero.getDirigente();
                for (com.asamblea.model.ListaAsignacion lista : listasDelPuntero) {
                    lista.setUsuario(dirigente);
                    listaAsignacionRepository.save(lista);
                }
            }

            // Desactivar el puntero (no eliminamos para preservar historial)
            puntero.setActivo(false);
            usuarioRepository.save(puntero);

            auditService.registrar(
                    "USUARIOS",
                    "ELIMINAR_PUNTERO",
                    String.format("Se eliminó (desactivó) al puntero '%s' (ID: %d)", nombrePuntero, punteroId),
                    auth.getName(),
                    request.getRemoteAddr());

            return ResponseEntity.ok(Map.of(
                    "message", "Puntero eliminado exitosamente",
                    "punteroId", punteroId,
                    "nombrePuntero", nombrePuntero));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Reactivar un puntero previamente eliminado (desactivado).
     */
    @PutMapping("/reactivar-puntero/{punteroId}")
    public ResponseEntity<?> reactivarPuntero(@PathVariable Long punteroId, Authentication auth,
            HttpServletRequest request) {
        try {
            Optional<Usuario> punteroOpt = usuarioRepository.findById(punteroId);
            if (punteroOpt.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Puntero no encontrado"));
            }

            Usuario puntero = punteroOpt.get();
            if (puntero.getRol() != Usuario.Rol.PUNTERO) {
                return ResponseEntity.badRequest().body(Map.of("error", "El usuario no es un puntero"));
            }

            puntero.setActivo(true);
            usuarioRepository.save(puntero);

            auditService.registrar(
                    "USUARIOS",
                    "REACTIVAR_PUNTERO",
                    String.format("Se reactivó al puntero '%s' (ID: %d)", puntero.getNombreCompleto(), punteroId),
                    auth.getName(),
                    request.getRemoteAddr());

            return ResponseEntity.ok(Map.of(
                    "message", "Puntero reactivado exitosamente",
                    "punteroId", punteroId,
                    "nombrePuntero", puntero.getNombreCompleto()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Obtener los punteros de un dirigente con sus estadísticas.
     */
    @GetMapping("/{dirigenteId}/punteros")
    public ResponseEntity<?> getPunteros(@PathVariable Long dirigenteId) {
        try {
            List<Usuario> punteros = usuarioRepository.findByDirigenteId(dirigenteId);

            List<Map<String, Object>> result = punteros.stream().map(p -> {
                Map<String, Object> map = new HashMap<>();
                map.put("id", p.getId());
                map.put("username", p.getUsername());
                map.put("nombreCompleto", p.getNombreCompleto());
                map.put("meta", p.getMeta());
                map.put("activo", p.isActivo());
                map.put("fotoPerfil", p.getFotoPerfil());
                map.put("lastLogin", p.getLastLogin());
                map.put("loginHabilitado", Boolean.TRUE.equals(p.getLoginHabilitado()));

                // Contar asignaciones del puntero
                long totalAsignados = listaAsignacionRepository.findByUsuarioId(p.getId())
                        .stream()
                        .mapToLong(lista -> asignacionRepository.countByListaAsignacionId(lista.getId()))
                        .sum();

                map.put("totalAsignados", totalAsignados);
                map.put("cumplioMeta", totalAsignados >= (p.getMeta() != null ? p.getMeta() : 50));
                double porcentaje = p.getMeta() != null && p.getMeta() > 0
                        ? (totalAsignados * 100.0 / p.getMeta())
                        : 0;
                map.put("porcentajeMeta", Math.round(porcentaje * 10.0) / 10.0);

                return map;
            }).collect(Collectors.toList());

            // Calcular totales de punteros
            long totalPunterosActivos = punteros.stream().filter(Usuario::isActivo).count();
            long totalTraidosPorPunteros = result.stream().mapToLong(m -> (Long) m.get("totalAsignados")).sum();
            long punterosQueCumplieron = result.stream().filter(m -> (Boolean) m.get("cumplioMeta")).count();

            // Calcular total propio del dirigente (sus propias listas)
            long totalPropiosDirigente = listaAsignacionRepository.findByUsuarioId(dirigenteId)
                    .stream()
                    .mapToLong(lista -> asignacionRepository.countByListaAsignacionId(lista.getId()))
                    .sum();

            // Total combinado = propios del dirigente + traídos por punteros
            long totalCombinado = totalPropiosDirigente + totalTraidosPorPunteros;

            Map<String, Object> response = new HashMap<>();
            response.put("punteros", result);
            response.put("totalPunteros", totalPunterosActivos);
            response.put("totalTraidosPorPunteros", totalTraidosPorPunteros);
            response.put("punterosQueCumplieron", punterosQueCumplieron);
            response.put("totalPropiosDirigente", totalPropiosDirigente);
            response.put("totalCombinado", totalCombinado);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Habilitar/Deshabilitar inicio de sesión de un puntero.
     * Solo el dirigente dueño del puntero puede cambiar esto.
     */
    @PutMapping("/{punteroId}/toggle-login")
    public ResponseEntity<?> toggleLoginPuntero(@PathVariable Long punteroId, Authentication auth,
            HttpServletRequest request) {
        try {
            Optional<Usuario> punteroOpt = usuarioRepository.findById(punteroId);
            if (punteroOpt.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Puntero no encontrado"));
            }

            Usuario puntero = punteroOpt.get();
            if (puntero.getRol() != Usuario.Rol.PUNTERO) {
                return ResponseEntity.badRequest().body(Map.of("error", "El usuario no es un puntero"));
            }

            boolean newValue = !Boolean.TRUE.equals(puntero.getLoginHabilitado());
            puntero.setLoginHabilitado(newValue);
            usuarioRepository.save(puntero);

            auditService.registrar(
                    "USUARIOS",
                    newValue ? "HABILITAR_LOGIN_PUNTERO" : "DESHABILITAR_LOGIN_PUNTERO",
                    String.format("%s inicio de sesión para puntero '%s' (CI: %s)",
                            newValue ? "Habilitó" : "Deshabilitó", puntero.getNombreCompleto(), puntero.getUsername()),
                    auth.getName(),
                    request.getRemoteAddr());

            return ResponseEntity.ok(Map.of(
                    "message", newValue ? "Inicio de sesión habilitado" : "Inicio de sesión deshabilitado",
                    "loginHabilitado", newValue,
                    "punteroId", punteroId,
                    "nombreCompleto", puntero.getNombreCompleto()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Obtener socios asignados a un puntero con estado de asistencia
     */
    @GetMapping("/{punteroId}/puntero-socios")
    public ResponseEntity<?> getPunteroSocios(@PathVariable Long punteroId) {
        try {
            List<com.asamblea.model.ListaAsignacion> listas = listaAsignacionRepository.findByUsuarioId(punteroId);
            
            List<Map<String, Object>> socios = new java.util.ArrayList<>();
            java.util.Set<Long> vistos = new java.util.HashSet<>();
            
            for (var lista : listas) {
                var asignaciones = asignacionRepository.findByListaAsignacionId(lista.getId());
                for (var asig : asignaciones) {
                    var socio = asig.getSocio();
                    if (socio != null && vistos.add(socio.getId())) {
                        Map<String, Object> map = new HashMap<>();
                        map.put("id", socio.getId());
                        map.put("nombreCompleto", socio.getNombreCompleto());
                        map.put("cedula", socio.getCedula());
                        map.put("numeroSocio", socio.getNumeroSocio());
                        map.put("telefono", socio.getTelefono());
                        // Verificar si tiene asistencia
                        boolean asistio = asistenciaRepository.existsBySocioId(socio.getId());
                        map.put("asistio", asistio);
                        map.put("listaOrigen", lista.getNombre());
                        socios.add(map);
                    }
                }
            }
            
            long totalSocios = socios.size();
            long totalAsistieron = socios.stream().filter(s -> (Boolean) s.get("asistio")).count();
            double porcentaje = totalSocios > 0 ? Math.round(totalAsistieron * 1000.0 / totalSocios) / 10.0 : 0;
            
            return ResponseEntity.ok(Map.of(
                "socios", socios,
                "totalSocios", totalSocios,
                "totalAsistieron", totalAsistieron,
                "porcentajeAsistencia", porcentaje
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Obtener socios de la lista del dirigente que NO están aún asignados al puntero.
     * Permite al dirigente ver qué socios puede delegar a su puntero.
     */
    @GetMapping("/{punteroId}/socios-disponibles")
    public ResponseEntity<?> getSociosDisponiblesParaPuntero(@PathVariable Long punteroId) {
        try {
            // Verificar que el puntero existe
            Usuario puntero = usuarioRepository.findById(punteroId)
                    .orElseThrow(() -> new RuntimeException("Puntero no encontrado"));

            if (puntero.getRol() != Usuario.Rol.PUNTERO || puntero.getDirigente() == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "El usuario no es un puntero válido con dirigente asignado"));
            }

            Long dirigenteId = puntero.getDirigente().getId();

            // Obtener todos los socios asignados al DIRIGENTE
            List<com.asamblea.model.ListaAsignacion> listasDirigente = listaAsignacionRepository.findByUsuarioId(dirigenteId);
            java.util.Set<Long> sociosDelDirigente = new java.util.LinkedHashSet<>();
            java.util.Map<Long, Socio> socioMap = new java.util.HashMap<>();

            for (var lista : listasDirigente) {
                var asignaciones = asignacionRepository.findByListaAsignacionId(lista.getId());
                for (var asig : asignaciones) {
                    if (asig.getSocio() != null) {
                        sociosDelDirigente.add(asig.getSocio().getId());
                        socioMap.put(asig.getSocio().getId(), asig.getSocio());
                    }
                }
            }

            // Obtener socios ya asignados al PUNTERO
            List<com.asamblea.model.ListaAsignacion> listasPuntero = listaAsignacionRepository.findByUsuarioId(punteroId);
            java.util.Set<Long> sociosDelPuntero = new java.util.HashSet<>();
            for (var lista : listasPuntero) {
                var asignaciones = asignacionRepository.findByListaAsignacionId(lista.getId());
                for (var asig : asignaciones) {
                    if (asig.getSocio() != null) {
                        sociosDelPuntero.add(asig.getSocio().getId());
                    }
                }
            }

            // Filtrar: socios del dirigente que NO están en la lista del puntero
            List<Map<String, Object>> disponibles = new java.util.ArrayList<>();
            for (Long socioId : sociosDelDirigente) {
                if (!sociosDelPuntero.contains(socioId)) {
                    Socio s = socioMap.get(socioId);
                    Map<String, Object> map = new HashMap<>();
                    map.put("id", s.getId());
                    map.put("nombreCompleto", s.getNombreCompleto());
                    map.put("cedula", s.getCedula());
                    map.put("numeroSocio", s.getNumeroSocio());
                    map.put("telefono", s.getTelefono());
                    disponibles.add(map);
                }
            }

            return ResponseEntity.ok(Map.of(
                    "disponibles", disponibles,
                    "totalDisponibles", disponibles.size(),
                    "totalEnPuntero", sociosDelPuntero.size(),
                    "totalDelDirigente", sociosDelDirigente.size()
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Asignar socios de la lista del dirigente a un puntero.
     * El dirigente delega socios de su lista para que el puntero los gestione.
     */
    @PostMapping("/{punteroId}/asignar-socios-puntero")
    public ResponseEntity<?> asignarSociosAPuntero(
            @PathVariable Long punteroId,
            @RequestBody Map<String, Object> data,
            Authentication auth,
            HttpServletRequest request) {
        try {
            // Verificar puntero
            Usuario puntero = usuarioRepository.findById(punteroId)
                    .orElseThrow(() -> new RuntimeException("Puntero no encontrado"));

            if (puntero.getRol() != Usuario.Rol.PUNTERO) {
                return ResponseEntity.badRequest().body(Map.of("error", "El usuario no es un puntero"));
            }

            // Obtener la lista de socioIds a asignar
            @SuppressWarnings("unchecked")
            List<Number> socioIds = (List<Number>) data.get("socioIds");
            if (socioIds == null || socioIds.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Debe seleccionar al menos un socio"));
            }

            // Obtener o crear la lista de asignación del puntero
            List<com.asamblea.model.ListaAsignacion> listasPuntero = listaAsignacionRepository.findByUsuarioId(punteroId);
            com.asamblea.model.ListaAsignacion listaPuntero;

            if (listasPuntero.isEmpty()) {
                // Crear una lista para el puntero
                listaPuntero = new com.asamblea.model.ListaAsignacion();
                listaPuntero.setNombre("Lista de " + puntero.getNombreCompleto());
                listaPuntero.setDescripcion("Socios asignados por el dirigente");
                listaPuntero.setActiva(true);
                listaPuntero.setUsuario(puntero);
                listaAsignacionRepository.save(listaPuntero);
            } else {
                listaPuntero = listasPuntero.get(0);
            }

            int asignados = 0;
            int yaExistentes = 0;
            int yaEnOtraLista = 0;
            List<String> sociosRechazados = new java.util.ArrayList<>();
            Usuario asignadoPor = usuarioRepository.findByUsername(auth.getName()).orElse(null);

            // Obtener las listas del dirigente que está asignando
            List<com.asamblea.model.ListaAsignacion> listasDirigente = asignadoPor != null
                ? listaAsignacionRepository.findByUsuarioId(asignadoPor.getId())
                : java.util.Collections.emptyList();
            java.util.Set<Long> idListasDirigente = listasDirigente.stream()
                .map(com.asamblea.model.ListaAsignacion::getId)
                .collect(java.util.stream.Collectors.toSet());
            // Incluir también la lista del puntero como válida
            idListasDirigente.add(listaPuntero.getId());

            for (Number socioIdNum : socioIds) {
                Long socioId = socioIdNum.longValue();

                // Verificar si ya está asignado al puntero
                if (asignacionRepository.existsByListaAsignacionIdAndSocioId(listaPuntero.getId(), socioId)) {
                    yaExistentes++;
                    continue;
                }

                // Verificar si ya está asignado a ALGUNA lista
                Optional<com.asamblea.model.Asignacion> asignacionExistente = asignacionRepository.findBySocioId(socioId);
                if (asignacionExistente.isPresent()) {
                    Long listaExistenteId = asignacionExistente.get().getListaAsignacion().getId();
                    // Si está en la lista del propio dirigente → OK, puede delegarlo al puntero
                    if (idListasDirigente.contains(listaExistenteId)) {
                        // Permitir: es su propio socio
                    } else {
                        // BLOQUEAR: está en la lista de OTRA persona
                        Socio socioRechazado = socioRepository.findById(socioId).orElse(null);
                        if (socioRechazado != null) {
                            sociosRechazados.add(socioRechazado.getNombreCompleto());
                        }
                        yaEnOtraLista++;
                        continue;
                    }
                }

                // Buscar el socio
                Socio socio = socioRepository.findById(socioId).orElse(null);
                if (socio == null) continue;

                // Crear la asignación
                com.asamblea.model.Asignacion asignacion = new com.asamblea.model.Asignacion();
                asignacion.setListaAsignacion(listaPuntero);
                asignacion.setSocio(socio);
                asignacion.setAsignadoPor(asignadoPor);
                asignacionRepository.save(asignacion);
                asignados++;
            }

            auditService.registrar(
                    "PUNTEROS",
                    "ASIGNAR_SOCIOS_PUNTERO",
                    String.format("Dirigente asignó %d socios al puntero '%s' (ID: %d). Rechazados por duplicado: %d",
                            asignados, puntero.getNombreCompleto(), punteroId, yaEnOtraLista),
                    auth.getName(),
                    request.getRemoteAddr());

            java.util.Map<String, Object> response = new java.util.HashMap<>();
            response.put("message", String.format("%d socio(s) asignado(s) al puntero exitosamente", asignados));
            response.put("asignados", asignados);
            response.put("yaExistentes", yaExistentes);
            response.put("yaEnOtraLista", yaEnOtraLista);
            response.put("sociosRechazados", sociosRechazados);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Desasignar un socio de un puntero.
     * El dirigente puede remover socios de la lista de un puntero.
     */
    @DeleteMapping("/{punteroId}/desasignar-socio/{socioId}")
    public ResponseEntity<?> desasignarSocioDePuntero(
            @PathVariable Long punteroId,
            @PathVariable Long socioId,
            Authentication auth,
            HttpServletRequest request) {
        try {
            List<com.asamblea.model.ListaAsignacion> listasPuntero = listaAsignacionRepository.findByUsuarioId(punteroId);

            boolean removed = false;
            for (var lista : listasPuntero) {
                var asigOpt = asignacionRepository.findByListaAsignacionIdAndSocioId(lista.getId(), socioId);
                if (asigOpt.isPresent()) {
                    asignacionRepository.delete(asigOpt.get());
                    removed = true;
                    break;
                }
            }

            if (!removed) {
                return ResponseEntity.badRequest().body(Map.of("error", "El socio no está asignado a este puntero"));
            }

            auditService.registrar(
                    "PUNTEROS",
                    "DESASIGNAR_SOCIO_PUNTERO",
                    String.format("Se removió socio ID %d del puntero ID %d", socioId, punteroId),
                    auth.getName(),
                    request.getRemoteAddr());

            return ResponseEntity.ok(Map.of("message", "Socio removido del puntero exitosamente"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

}
