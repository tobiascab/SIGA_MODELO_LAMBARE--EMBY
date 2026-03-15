package com.asamblea.service;

import com.asamblea.model.FuncionarioDirectivo;
import com.asamblea.model.Usuario;
import com.asamblea.repository.FuncionarioDirectivoRepository;
import com.asamblea.repository.UsuarioRepository;
import com.asamblea.repository.ListaAsignacionRepository;
import com.asamblea.model.ListaAsignacion;
import com.github.pjfanning.xlsx.StreamingReader;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.util.*;

@Service
@RequiredArgsConstructor
public class FuncionarioDirectivoService {

    private final FuncionarioDirectivoRepository funcionarioRepository;
    private final UsuarioRepository usuarioRepository;
    private final ListaAsignacionRepository listaAsignacionRepository;
    private final PasswordEncoder passwordEncoder;
    private final JdbcTemplate jdbcTemplate;

    /**
     * Importa el Excel de funcionarios y directivos (GENÉRICO)
     */
    public Map<String, Object> importarFuncionarios(MultipartFile file) throws Exception {
        return importarFuncionariosConRol(file, FuncionarioDirectivo.RolFuncionario.OPERADOR);
    }

    /**
     * Importa el Excel de Asesores de Crédito
     */
    public Map<String, Object> importarAsesores(MultipartFile file) throws Exception {
        return importarFuncionariosConRol(file, FuncionarioDirectivo.RolFuncionario.ASESOR_DE_CREDITO);
    }

    private Map<String, Object> importarFuncionariosConRol(MultipartFile file,
            FuncionarioDirectivo.RolFuncionario rolPorDefecto) throws Exception {
        // Guardar archivo temporal
        File tempFile = File.createTempFile("funcionarios_", ".xlsx");
        try (FileOutputStream fos = new FileOutputStream(tempFile)) {
            fos.write(file.getBytes());
        }

        int importados = 0;
        int actualizados = 0;
        int errores = 0;
        List<String> mensajesError = new ArrayList<>();

        try (InputStream is = file.getInputStream();
                Workbook workbook = StreamingReader.builder()
                        .rowCacheSize(100)
                        .bufferSize(4096)
                        .open(is)) {

            Sheet sheet = workbook.getSheetAt(0);
            Iterator<Row> rowIterator = sheet.iterator();

            // Saltar encabezado
            if (rowIterator.hasNext()) {
                rowIterator.next();
            }

            while (rowIterator.hasNext()) {
                Row row = rowIterator.next();
                try {
                    String numeroSocio = getCellValue(row, 0); // NRO_SOCIO
                    String nombre = getCellValue(row, 1); // NOMBRE
                    String cedula = getCellValue(row, 2); // CI (Puede venir vacía o ser la sucursal en el caso de
                                                          // Asesores)

                    // AJUSTE: En formato Asesores, Col 2 es NOMBRE, Col 3 es SUCURSAL
                    // El Excel de Asesores tiene: A=NroSocio, B=Nombre, C=Sucursal
                    // El Excel de Funcionarios tiene: A=NroSocio, B=Nombre, C=CI (A veces)

                    // Si estamos importando ASESORES, la columna 2 (C) es SUCURSAL, no CI.
                    // Para simplificar, si es ASESOR, ignoramos CI del excel y ponemos PENDIENTE.
                    if (rolPorDefecto == FuncionarioDirectivo.RolFuncionario.ASESOR_DE_CREDITO) {
                        cedula = "PENDIENTE";
                    } else {
                        cedula = getCellValue(row, 2); // CI
                    }

                    if (numeroSocio == null || numeroSocio.trim().isEmpty()) {
                        continue; // Saltar filas vacías
                    }

                    // NORMALIZAR: Eliminar puntos, comas y caracteres no numéricos del número de
                    // socio
                    numeroSocio = numeroSocio.replaceAll("[^0-9]", "");

                    if (numeroSocio.isEmpty()) {
                        continue; // Si después de limpiar queda vacío, saltar
                    }

                    if (nombre == null || nombre.trim().isEmpty()) {
                        throw new IllegalArgumentException("Falta NOMBRE");
                    }

                    if (cedula == null || cedula.trim().isEmpty()) {
                        cedula = "PENDIENTE";
                    }

                    // Buscar si ya existe
                    Optional<FuncionarioDirectivo> existente = funcionarioRepository.findByNumeroSocio(numeroSocio);

                    if (existente.isPresent()) {
                        // Actualizar
                        FuncionarioDirectivo func = existente.get();
                        func.setNombreCompleto(nombre);
                        if (!"PENDIENTE".equals(cedula)) {
                            func.setCedula(cedula);
                        }
                        // SIEMPRE actualizamos al rol que estamos importando ahora
                        func.setRol(rolPorDefecto);
                        funcionarioRepository.save(func);
                        actualizados++;
                    } else {
                        // Crear nuevo
                        FuncionarioDirectivo func = new FuncionarioDirectivo();
                        func.setNumeroSocio(numeroSocio);
                        func.setNombreCompleto(nombre);
                        func.setCedula(cedula);
                        func.setRol(rolPorDefecto);
                        funcionarioRepository.save(func);
                        importados++;
                    }

                } catch (Exception e) {
                    errores++;
                    mensajesError.add("Fila " + (row.getRowNum() + 1) + ": " + e.getMessage());
                    System.err.println("Error importando fila: " + e.getMessage());
                }
            }

        } finally {
            tempFile.delete();
        }

        // ===== AUTO-CREACIÓN DE USUARIOS PARA FUNCIONARIOS =====
        int usuariosCreados = 0;
        try {
            System.out.println("Iniciando auto-creación de usuarios para funcionarios importados...");

            // Obtener todos los funcionarios de la base de datos
            List<FuncionarioDirectivo> todosFuncionarios = funcionarioRepository.findAll();

            for (FuncionarioDirectivo func : todosFuncionarios) {
                try {
                    String numeroSocio = func.getNumeroSocio();
                    String cedula = func.getCedula();
                    String nombre = func.getNombreCompleto();

                    // Si la cédula está pendiente o vacía, intentar obtenerla del padrón de socios
                    if (cedula == null || cedula.isEmpty() || "PENDIENTE".equals(cedula)) {
                        // Buscar en tabla socios por numero_socio
                        Optional<String> cedulaSocio = buscarCedulaEnPadron(numeroSocio);
                        if (cedulaSocio.isPresent()) {
                            cedula = cedulaSocio.get();
                            func.setCedula(cedula);
                            funcionarioRepository.save(func);
                        }
                    }

                    // Si aún no tenemos cédula válida, no podemos crear usuario
                    if (cedula == null || cedula.isEmpty() || "PENDIENTE".equals(cedula)) {
                        continue;
                    }

                    // Limpiar cédula
                    String cedulaSanitized = cedula.replaceAll("[^0-9]", "");
                    if (cedulaSanitized.isEmpty())
                        continue;

                    // Verificar si ya existe usuario con esta cédula
                    Optional<Usuario> existente = usuarioRepository.findByUsername(cedulaSanitized);

                    Usuario usuario;
                    if (existente.isPresent()) {
                        usuario = existente.get();
                        // Actualizar nombre si el usuario ya existe
                        usuario.setNombreCompleto(nombre);
                        // NO reactivar usuarios dados de baja manualmente
                        // El estado activo se preserva como estaba
                    } else {
                        // Crear nuevo usuario
                        usuario = new Usuario();
                        usuario.setUsername(cedulaSanitized);
                        usuario.setPassword(passwordEncoder.encode(cedulaSanitized));
                        usuario.setNombreCompleto(nombre);
                        usuario.setRol(Usuario.Rol.USUARIO_SOCIO); // Rol base por seguridad
                        usuario.setActivo(true); // Solo usuarios NUEVOS se activan
                        usuariosCreados++;
                    }

                    usuarioRepository.save(usuario);

                    // Crear lista por defecto si no existe
                    if (listaAsignacionRepository.findByUsuarioId(usuario.getId()).isEmpty()) {
                        ListaAsignacion lista = new ListaAsignacion();
                        lista.setNombre("Lista de " + usuario.getNombreCompleto());
                        lista.setUsuario(usuario);
                        lista.setActiva(true);
                        lista.setDescripcion("Lista generada automáticamente");
                        listaAsignacionRepository.save(lista);
                    }
                } catch (Exception e) {
                    System.err.println(
                            "Error creando usuario para funcionario " + func.getNumeroSocio() + ": " + e.getMessage());
                }
            }

            System.out.println("✓ Se crearon " + usuariosCreados + " usuarios automáticamente.");
        } catch (Exception e) {
            System.err.println("Error en auto-creación de usuarios: " + e.getMessage());
        }
        // ===== FIN AUTO-CREACIÓN =====

        Map<String, Object> resultado = new HashMap<>();
        resultado.put("importados", importados);
        resultado.put("actualizados", actualizados);
        resultado.put("errores", errores);
        resultado.put("total", importados + actualizados);
        resultado.put("usuariosCreados", usuariosCreados);
        if (!mensajesError.isEmpty()) {
            resultado.put("mensajesError", mensajesError);
        }

        return resultado;
    }

    /**
     * Busca la cédula de un socio en el padrón por su número de socio
     */
    private Optional<String> buscarCedulaEnPadron(String numeroSocio) {
        try {
            String sql = "SELECT cedula FROM socios WHERE numero_socio = ? LIMIT 1";
            List<String> results = jdbcTemplate.queryForList(sql, String.class, numeroSocio);
            if (!results.isEmpty() && results.get(0) != null) {
                return Optional.of(results.get(0));
            }
            return Optional.empty();
        } catch (Exception e) {
            return Optional.empty();
        }
    }

    /**
     * Verifica si un socio es funcionario/directivo y crea su usuario
     * automáticamente
     * Retorna true si se creó o actualizó el usuario
     * IMPORTANTE: Usa la cédula que viene del PADRÓN para asegurar que sea la
     * correcta.
     */
    @Transactional
    public boolean crearUsuarioSiFuncionario(String numeroSocio, String cedulaDelPadron, String nombreCompleto) {
        // Buscar en la tabla de funcionarios por Nro de Socio
        Optional<FuncionarioDirectivo> funcionarioOpt = funcionarioRepository.findByNumeroSocio(numeroSocio);

        if (funcionarioOpt.isEmpty()) {
            return false;
        }

        FuncionarioDirectivo funcionario = funcionarioOpt.get();

        // Limpiar cédula
        String cedulaSanitized = cedulaDelPadron.replaceAll("[^0-9]", "");
        if (cedulaSanitized.isEmpty())
            return false;

        // 1. NORMALIZAR DATOS EN TABLA FUNCIONARIOS
        // Actualizamos la cédula real obtenida del padrón
        if (!cedulaSanitized.equals(funcionario.getCedula().replaceAll("[^0-9]", ""))
                || "PENDIENTE".equals(funcionario.getCedula())) {
            funcionario.setCedula(cedulaDelPadron);
            // NO forzamos rol a OPERADOR si ya es ASESOR
            if (funcionario.getRol() != FuncionarioDirectivo.RolFuncionario.ASESOR_DE_CREDITO) {
                funcionario.setRol(FuncionarioDirectivo.RolFuncionario.OPERADOR);
            }
            funcionarioRepository.save(funcionario);
        }

        // 2. BUSCAR O CREAR USUARIO
        // Estrategia: Usuario = Cédula, Password = Cédula
        Usuario usuario = null;

        // A) Verificar si ya existe por Cédula (Login nuevo)
        Optional<Usuario> byCedula = usuarioRepository.findByUsername(cedulaSanitized);
        if (byCedula.isPresent()) {
            usuario = byCedula.get();
        }
        // B) Si no, verificar si existe por NroSocio (Login viejo) para migrarlo
        else {
            Optional<Usuario> bySocio = usuarioRepository.findByUsername(numeroSocio);
            if (bySocio.isPresent()) {
                usuario = bySocio.get();
            }
        }

        // Guardar si el usuario es nuevo para no reactivar usuarios dados de baja
        boolean esUsuarioNuevo = (usuario == null);

        if (usuario == null) {
            usuario = new Usuario();
            usuario.setActivo(true); // Solo usuarios NUEVOS se activan
        }

        // 3. ACTUALIZAR CREDENCIALES
        usuario.setUsername(cedulaSanitized); // Usuario es la Cédula

        // SOLO establecer contraseña si el usuario es NUEVO (id nulo)
        // Esto evita resetear la contraseña de usuarios que ya la cambiaron
        if (usuario.getId() == null) {
            usuario.setPassword(passwordEncoder.encode(cedulaSanitized)); // Password encriptada
            // CAMPO passwordVisible ELIMINADO POR SEGURIDAD
            usuario.setActivo(true);
        } else {
            // SAFEGUARD: Preservar lastLogin si el usuario ya existe
            // JPA debería manejar esto, pero el objeto 'usuario' puede venir con null si
            // fue
            // cargado parcialmente o si se perdió el estado.
            if (usuario.getLastLogin() != null) {
                System.out.println(
                        "DEBUG: Preservando lastLogin para " + usuario.getUsername() + ": " + usuario.getLastLogin());
            }
        }
        usuario.setNombreCompleto(nombreCompleto);

        // 4. ASIGNAR ROL según el tipo de funcionario
        // REGLA: Si es ASESOR_DE_CREDITO en la tabla funcionarios, SIEMPRE debe tener
        // ese rol
        // (excepto si ya es SUPER_ADMIN, DIRECTIVO u OPERADOR - roles más altos)

        Usuario.Rol rolActual = usuario.getRol();
        boolean esRolAlto = rolActual == Usuario.Rol.SUPER_ADMIN ||
                rolActual == Usuario.Rol.DIRECTIVO ||
                rolActual == Usuario.Rol.OPERADOR;

        if (funcionario.getRol() == FuncionarioDirectivo.RolFuncionario.ASESOR_DE_CREDITO) {
            // Es asesor de crédito - asignar ese rol (a menos que ya tenga rol alto)
            if (!esRolAlto) {
                usuario.setRol(Usuario.Rol.ASESOR_DE_CREDITO);
            }
        } else {
            // Es funcionario normal - asignar USUARIO_SOCIO si no tiene rol o es rol básico
            if (rolActual == null) {
                usuario.setRol(Usuario.Rol.USUARIO_SOCIO);
            }
            // Si ya tiene rol, lo dejamos como está (no bajamos de nivel)
        }

        // NO reactivar usuarios existentes que fueron dados de baja manualmente
        // Solo activamos si es usuario nuevo
        if (esUsuarioNuevo) {
            usuario.setActivo(true);
        }
        // Si el usuario ya existe, preservamos su estado de activo/inactivo

        usuarioRepository.save(usuario);

        // 5. CREAR LISTA POR DEFECTO AUTOMÁTICAMENTE
        // Si no tiene lista, le creamos una activa
        if (listaAsignacionRepository.findByUsuarioId(usuario.getId()).isEmpty()) {
            ListaAsignacion lista = new ListaAsignacion();
            lista.setNombre("Lista de " + usuario.getNombreCompleto());
            lista.setUsuario(usuario);
            lista.setActiva(true);
            lista.setDescripcion("Lista generada automáticamente");
            listaAsignacionRepository.save(lista);
        }

        return true;
    }

    /**
     * Obtiene todos los funcionarios registrados
     */
    public List<FuncionarioDirectivo> listarTodos() {
        return funcionarioRepository.findAll();
    }

    /**
     * Elimina un funcionario (esto NO elimina su usuario si ya fue creado)
     */
    @Transactional
    public void eliminar(Long id) {
        if (id != null) {
            funcionarioRepository.deleteById(id);
        }
    }

    public long contarTotal() {
        return funcionarioRepository.count();
    }

    public long contarFuncionarios() {
        return funcionarioRepository.countByRolNot(FuncionarioDirectivo.RolFuncionario.ASESOR_DE_CREDITO);
    }

    public long contarAsesores() {
        return funcionarioRepository.countByRol(FuncionarioDirectivo.RolFuncionario.ASESOR_DE_CREDITO);
    }

    private String getCellValue(Row row, int index) {
        Cell cell = row.getCell(index);
        if (cell == null)
            return null;

        switch (cell.getCellType()) {
            case STRING:
                return cell.getStringCellValue().trim();
            case NUMERIC:
                return String.valueOf((long) cell.getNumericCellValue());
            default:
                return null;
        }
    }
}
