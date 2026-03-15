package com.asamblea.config;

import com.asamblea.model.Socio;
import com.asamblea.model.Sucursal;
import com.asamblea.model.Usuario;
import com.asamblea.repository.SocioRepository;
import com.asamblea.repository.SucursalRepository;
import com.asamblea.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Component
@Slf4j
@RequiredArgsConstructor
@org.springframework.context.annotation.Profile("seed-asesores") // Solo ejecutar con --spring.profiles.active=seed-asesores
public class AsesoresDataSeeder implements CommandLineRunner {

    private final UsuarioRepository usuarioRepository;
    private final SocioRepository socioRepository;
    private final SucursalRepository sucursalRepository;
    private final PasswordEncoder passwordEncoder;

    // Datos proporcionados
    private static final String DATA = """
            29.595	Celeste Olmedo	Casa Central
            36.775	Fanny Avila	Casa Central
            52.308	Elias Irala	Casa Central
            55.487	Jorge Andrés Bernal	Casa Central
            53.629	BLAS ALCARAZ	Casa Central
            41.264	Marian Magali Galeano	Casa Central
            54.544	Maida Magaly Gómez	Casa Central
            28.718	Oliver Santiago Ortiz Leguizamon	Casa Central
            43.091	Oliver Matias Cabral Fretes	Casa Central
            7.993	Enestor Palmerola	Casa Central
            53.165	Araceli Argüello	CDE
            50.475	Carmen Paola Alvarenga	CDE
            56.055	Benjamin Davalos	CDE
            34.319	Roberto Oviedo Paredes	CDE
            42.936	Jorge Rafael Cuevas	CDE
            41.728	Ana Ester Rodriguez Mereles	Hernandarias
            49.634	Arnaldo Andres Zarate Rodriguez	Hernandarias
            51.480	Fredy Cardozo	Hernandarias
            51.425	Jeferson Meza	Hernandarias
            54.975	Pablo Manuel Acosta	Sucursal 5
            44.900	Cesar Ramón Ibarrola Fiegueredo	Sucursal 5
            20.300	Maria Elizabeth Villalba Arguello	Sucursal 5
            53.116	Carlos Barrios Matto	Sucursal 5
            7.921	Mario Augusto Gavilan Vega	Sucursal 5
            49.609	Johan Gonzalez	San Lorenzo
            51.638	Sabino Benítez Benítez	San Lorenzo
            46.622	Marcelo Daniel Pedrozo Rojas	San Lorenzo
            54.159	Raquel Riveros	San Lorenzo
            7.561	Ramon Guillermo Corvalan Gonzalez	San Lorenzo
            56.310	Victor Roa	Villarrica
            41.804	Roberto David Marecos Arzamendia	Villarrica
            52.295	Iván Moisés Saucedo	Villarrica
            24.237	Diego Armando Leite Chamorro	Villarrica
            34.555	Ernesto Techeira Loza	Villarrica
            """;

    @Override
    @Transactional
    public void run(String... args) throws Exception {
        log.info("Iniciando carga de Asesores y Verificación de Admin...");

        // 0. (Admin gestionado por DataInitializer)

        // 1. Resetear a todos a Meta 20 y limpiar cargo Asesor (para asegurar
        // integridad estricta)
        log.info("Reseteando metas a base 20...");
        java.util.List<Usuario> todos = usuarioRepository.findAll();
        for (Usuario u : todos) {
            boolean changed = false;
            // Default meta 20
            if (u.getMeta() == null || u.getMeta() != 20) {
                u.setMeta(20);
                changed = true;
            }
            // Si tenian cargo Asesor y NO estan en la lista (se validará despues, pero aqui
            // limpiamos preventivamente
            // o mejor: limpiamos todos y luego los de la lista se vuelven a poner)
            if (u.getCargo() != null && u.getCargo().toLowerCase().contains("asesor")) {
                u.setCargo("Funcionario");
                changed = true;
            }

            if (changed)
                usuarioRepository.save(u);
        }

        // Mapeo de nombres de sucursal
        Map<String, String> sucursalMap = new HashMap<>();
        sucursalMap.put("CDE", "Ciudad del Este");

        String[] lines = DATA.split("\n");
        int count = 0;

        for (String line : lines) {
            String[] parts = line.split("\t");
            if (parts.length < 3)
                continue;

            String nroSocioRaw = parts[0].trim();
            String nombre = parts[1].trim();
            String sucRaw = parts[2].trim();

            // Limpiar nro socio (quitar puntos)
            String nroSocio = nroSocioRaw.replace(".", "");

            // Mapear sucursal
            String nombreSucursal = sucursalMap.getOrDefault(sucRaw, sucRaw);
            Optional<Sucursal> sucursalOpt = sucursalRepository.findByNombre(nombreSucursal);
            if (sucursalOpt.isEmpty()) {
                // Fallback: buscar por codigo si aplica o loguear
                log.warn("Sucursal no encontrada: {} (Original: {})", nombreSucursal, sucRaw);
            }

            // Buscar Socio
            Optional<Socio> socioOpt = socioRepository.findByNumeroSocio(nroSocio);
            if (socioOpt.isEmpty()) {
                log.error("Socio no encontrado: {} - {}", nroSocio, nombre);
                continue;
            }
            Socio socio = socioOpt.get();

            // Buscar o Crear Usuario
            Usuario usuario = usuarioRepository.findByIdSocio(socio.getId())
                    .orElseGet(() -> {
                        // Buscar por username (cedula)
                        return usuarioRepository.findByUsername(socio.getCedula())
                                .orElseGet(() -> {
                                    Usuario u = new Usuario();
                                    u.setUsername(socio.getCedula());
                                    u.setPassword(passwordEncoder.encode(socio.getCedula())); // Default pass = cedula
                                    // CAMPO passwordVisible ELIMINADO POR SEGURIDAD
                                    u.setNombreCompleto(socio.getNombreCompleto()); // Usar nombre del socio o del
                                                                                    // archivo? Socio es mas fiable
                                    u.setRol(Usuario.Rol.ASESOR_DE_CREDITO);
                                    u.setActivo(true);
                                    u.setIdSocio(socio.getId());
                                    u.setPermisosEspeciales("dashboard,asignaciones,configuracion");
                                    return u;
                                });
                    });

            // Actualizar Datos de Asesor
            usuario.setCargo("Asesor de Credito"); // Sin acento para evitar lios de encoding
            usuario.setMeta(50);
            usuario.setRequiresPasswordChange(true); // Forzar cambio de password
            usuario.setActivo(true);
            sucursalOpt.ifPresent(usuario::setSucursal);

            // Asegurar integridad
            if (usuario.getIdSocio() == null)
                usuario.setIdSocio(socio.getId());
            if (usuario.getNombreCompleto() == null || usuario.getNombreCompleto().isEmpty()) {
                usuario.setNombreCompleto(socio.getNombreCompleto());
            }

            usuarioRepository.save(usuario);
            log.info("Usuario actualizado/creado: {} - Asesor de Crédito", usuario.getUsername());
            count++;
        }

        log.info("Procesamiento de Asesores finalizado. Total: {}", count);

        // FASE 2: SINCRONIZACIÓN GENERAL
        syncTodosLosUsuarios();
    }

    private void syncTodosLosUsuarios() {
        log.info("Iniciando Sincronización General de Usuarios con Socios...");
        List<Usuario> usuarios = usuarioRepository.findAll();

        for (Usuario u : usuarios) {
            boolean cambiado = false;
            String cedula = u.getUsername().trim();

            Optional<Socio> socioOpt = socioRepository.findByCedula(cedula);

            if (socioOpt.isPresent()) {
                Socio socio = socioOpt.get();

                if (u.getIdSocio() == null || !u.getIdSocio().equals(socio.getId())) {
                    u.setIdSocio(socio.getId());
                    cambiado = true;
                }

                if (u.getCargo() == null || u.getCargo().isEmpty()) {
                    u.setCargo("Usuario Socio");
                    cambiado = true;
                }

                if (cambiado) {
                    usuarioRepository.save(u);
                    log.info("Usuario {} vinculado con Socio {}", u.getUsername(), socio.getNumeroSocio());
                }
            }
        }
        log.info("Sincronización General finalizada.");
    }
}
