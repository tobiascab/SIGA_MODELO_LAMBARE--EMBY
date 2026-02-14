package com.asamblea.service;

import com.asamblea.model.Mesa;
import com.asamblea.model.Socio;
import com.asamblea.model.Sucursal;
import com.asamblea.model.Usuario;
import com.asamblea.repository.MesaRepository;
import com.asamblea.repository.SucursalRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MesaService {

    private final MesaRepository mesaRepository;
    private final SucursalRepository sucursalRepository;

    /**
     * Calcula la mesa asignada para un socio según su número y sucursal.
     * Si el socio tiene SOLO VOZ (no tiene derecho a voto), va a la Mesa 11 (o la
     * configurada como SOLO_VOZ).
     * 
     * @param socio El socio para calcular la mesa
     * @return Información de la mesa (número, rango, ubicación)
     */
    public Map<String, Object> calcularMesa(Socio socio) {
        Map<String, Object> mesaInfo = new HashMap<>();

        if (socio == null) {
            mesaInfo.put("numero", 0);
            mesaInfo.put("mensaje", "Sin mesa asignada");
            return mesaInfo;
        }

        // Si no hay mesas configuradas en BD, usar lógica legacy
        if (mesaRepository.count() == 0) {
            return calcularMesaLegacy(socio);
        }

        // --- LÓGICA DINÁMICA DE BASE DE DATOS ---

        // 1. Verificar SOLO VOZ
        boolean tieneVozYVoto = socio.isEstadoVozVoto();

        if (!tieneVozYVoto) {
            Optional<Mesa> mesaSoloVoz = mesaRepository.findMesaSoloVoz();
            if (mesaSoloVoz.isPresent()) {
                return mapMesaToInfo(mesaSoloVoz.get());
            }
            // Si no hay mesa solo voz en DB pero hay otras mesas, quizás se olvidaron de
            // crearla.
            // Fallback partial? No, mejor devolvemos algo genérico o legacy solo voz
            return calcularMesaSoloVozLegacy();
        }

        // 2. Determinar Sucursal Objetivo (Agrupación)
        Sucursal sucursalSocio = socio.getSucursal();
        String codigoObjetivo = "1"; // Default Central

        if (sucursalSocio != null) {
            String nombre = sucursalSocio.getNombre().toLowerCase();
            String codigo = sucursalSocio.getCodigo();

            if (nombre.contains("ciudad del este") || "2".equals(codigo) || nombre.contains("cde")
                    || nombre.contains("hernandarias") || "6".equals(codigo)) {
                codigoObjetivo = "2"; // CDE
            } else if (nombre.contains("villarrica") || "3".equals(codigo) || nombre.contains("vca")) {
                codigoObjetivo = "3"; // Villarrica
            } else {
                codigoObjetivo = "1"; // Central y resto
            }
        }

        // 3. Buscar mesa por rango en esa sucursal
        // Necesitamos la entidad Sucursal objetivo para la query
        Optional<Sucursal> sucursalTarget = sucursalRepository.findByCodigo(codigoObjetivo); // Asume que existe
                                                                                             // findByCodigo
        // Si no existe findByCodigo, intentar buscar por nombre o ID conocido.
        // Dado que no estoy seguro si sucursalRepository tiene findByCodigo, usaré
        // lógica de búsqueda manual si falla

        // Mejor estrategia: Traer todas las mesas de esa "region" y filtrar en memoria
        // (son pocas)
        // Pero Mesa está linkeada a Sucursal. ¿A cuál sucursal asignamos la mesa en DB?
        // Asumimos que el usuario asignó la mesa a la sucursal "Cabecera" (1, 2 o 3).

        // Buscar todas las mesas de tipo RANGO activas
        // Filtrar aquellas cuya sucursal coincida con el codigoObjetivo

        try {
            int nroSocioInt = Integer.parseInt(socio.getNumeroSocio());
            final String finalCodigoObj = codigoObjetivo;

            List<Mesa> mesasCandidatas = mesaRepository.findAll().stream()
                    .filter(m -> m.isActiva() && "RANGO".equals(m.getTipo()))
                    .filter(m -> m.getSucursal() != null && finalCodigoObj.equals(m.getSucursal().getCodigo()))
                    .collect(Collectors.toList());

            for (Mesa mesa : mesasCandidatas) {
                if (mesa.getRangoDesde() != null && mesa.getRangoHasta() != null) {
                    if (nroSocioInt >= mesa.getRangoDesde() && nroSocioInt <= mesa.getRangoHasta()) {
                        return mapMesaToInfo(mesa);
                    }
                } else if (mesa.getRangoDesde() == null && mesa.getRangoHasta() != null) {
                    // Solo hasta
                    if (nroSocioInt <= mesa.getRangoHasta())
                        return mapMesaToInfo(mesa);
                } else if (mesa.getRangoDesde() != null && mesa.getRangoHasta() == null) {
                    // Desde en adelante
                    if (nroSocioInt >= mesa.getRangoDesde())
                        return mapMesaToInfo(mesa);
                }
            }

            // Si no encontró rango específico pero hay mesa "catch-all" (sin rangos
            // definidos pero activa y de la sucursal)???
            // No, mejor fallback a legacy si no encuentra mesa, para seguridad
            return calcularMesaLegacy(socio);

        } catch (NumberFormatException e) {
            Map<String, Object> err = new HashMap<>();
            err.put("numero", 0);
            err.put("mensaje", "Nro Socio Inválido");
            return err;
        }
    }

    private Map<String, Object> mapMesaToInfo(Mesa mesa) {
        Map<String, Object> info = new HashMap<>();
        info.put("numero", mesa.getNumero());

        String rangoStr = "Sin rango";
        if (mesa.getRangoDesde() != null && mesa.getRangoHasta() != null) {
            rangoStr = mesa.getRangoDesde() + " al " + mesa.getRangoHasta();
        } else if (mesa.getRangoDesde() != null) {
            rangoStr = mesa.getRangoDesde() + " en adelante";
        } else if (mesa.getRangoHasta() != null) {
            rangoStr = "Hasta " + mesa.getRangoHasta();
        } else if ("SOLO_VOZ".equals(mesa.getTipo())) {
            rangoStr = "Solo Voz";
        }

        info.put("rango", rangoStr);

        // Responsables
        List<String> nombres = mesa.getEncargados().stream()
                .map(Usuario::getNombreCompleto)
                .collect(Collectors.toList());
        info.put("responsables", nombres.toArray(new String[0]));

        String sucursalName = mesa.getSucursal() != null ? mesa.getSucursal().getNombre() : "";
        info.put("mensaje", "MESA " + mesa.getNumero() + " - " + sucursalName);
        info.put("ubicacion", mesa.getUbicacion() != null ? mesa.getUbicacion() : sucursalName);

        return info;
    }

    // ================= LEGACY CODE =================

    public Map<String, Object> calcularMesaLegacy(Socio socio) {
        Map<String, Object> mesaInfo = new HashMap<>();

        if (socio == null) {
            mesaInfo.put("numero", 0);
            mesaInfo.put("mensaje", "Sin mesa asignada");
            return mesaInfo;
        }

        // PRIMERO: Verificar si tiene SOLO VOZ (sin derecho a voto)
        // Si no tiene voz y voto, va a la Mesa 11 independientemente de la sucursal
        boolean tieneVozYVoto = socio.isEstadoVozVoto();

        if (!tieneVozYVoto) {
            return calcularMesaSoloVozLegacy();
        }

        Sucursal sucursal = socio.getSucursal();
        String numeroSocioStr = socio.getNumeroSocio();

        // Intentar convertir el número de socio a entero
        int numeroSocio;
        try {
            numeroSocio = Integer.parseInt(numeroSocioStr);
        } catch (NumberFormatException e) {
            mesaInfo.put("numero", 0);
            mesaInfo.put("mensaje", "Número de socio inválido");
            return mesaInfo;
        }

        // Verificar si pertenece a Casa Central, Suc 5, San Lorenzo Centro o Centro
        // Médico
        boolean esCentralOAsimilado = false;
        if (sucursal != null) {
            String nombreSucursal = sucursal.getNombre().toLowerCase();
            String codigoSucursal = sucursal.getCodigo();

            esCentralOAsimilado = nombreSucursal.contains("casa central") ||
                    nombreSucursal.contains("san lorenzo centro") ||
                    nombreSucursal.contains("centro médico") ||
                    nombreSucursal.contains("centro medico") ||
                    codigoSucursal.equals("5") ||
                    nombreSucursal.contains("suc 5");
        }

        if (esCentralOAsimilado) {
            return calcularMesaCentralLegacy(numeroSocio);
        } else if (sucursal != null && (sucursal.getNombre().toLowerCase().contains("ciudad del este") ||
                sucursal.getCodigo().equals("2") ||
                sucursal.getNombre().toUpperCase().contains("CDE") ||
                sucursal.getNombre().toLowerCase().contains("hernandarias") ||
                sucursal.getCodigo().equals("6"))) {
            return calcularMesaCDELegacy(numeroSocio);
        } else if (sucursal != null && (sucursal.getNombre().toLowerCase().contains("villarrica") ||
                sucursal.getNombre().toUpperCase().contains("VCA") ||
                sucursal.getCodigo().equals("3"))) {
            return calcularMesaVillarricaLegacy(numeroSocio);
        } else {
            // Por defecto, todas las demás sucursales van a Casa Central
            return calcularMesaCentralLegacy(numeroSocio);
        }
    }

    /**
     * Mesa 11 - Para todos los socios con SOLO VOZ (sin derecho a voto).
     * Independientemente de la sucursal.
     */
    private Map<String, Object> calcularMesaSoloVozLegacy() {
        Map<String, Object> info = new HashMap<>();
        info.put("numero", 11);
        info.put("rango", "Todos los usuarios con Solo Voz");
        info.put("responsables", new String[0]);
        info.put("mensaje", "MESA 11 - Solo Voz");
        info.put("ubicacion", "Check-in");
        return info;
    }

    /**
     * Calcula la mesa para socios de Casa Central y sucursales asimiladas.
     */
    private Map<String, Object> calcularMesaCentralLegacy(int numeroSocio) {
        Map<String, Object> info = new HashMap<>();

        // Mesas para Casa Central - RANGOS CONTINUOS SIN HUECOS
        // Cualquier número de socio obtiene una mesa (no hay mesa 0)

        if (numeroSocio <= 4756) {
            // Mesa 1: Hasta 4756 (incluye cualquier número menor)
            info.put("numero", 1);
            info.put("rango", "1 al 4.756");
            info.put("responsables", new String[0]);
        } else if (numeroSocio <= 12669) {
            // Mesa 2: 4757 al 12669
            info.put("numero", 2);
            info.put("rango", "4.757 al 12.669");
            info.put("responsables", new String[0]);
        } else if (numeroSocio <= 25054) {
            // Mesa 3: 12670 al 25054
            info.put("numero", 3);
            info.put("rango", "12.670 al 25.054");
            info.put("responsables", new String[0]);
        } else if (numeroSocio <= 32637) {
            // Mesa 4: 25055 al 32637
            info.put("numero", 4);
            info.put("rango", "25.055 al 32.637");
            info.put("responsables", new String[0]);
        } else if (numeroSocio <= 41377) {
            // Mesa 5: 32638 al 41377
            info.put("numero", 5);
            info.put("rango", "32.638 al 41.377");
            info.put("responsables", new String[0]);
        } else if (numeroSocio <= 46357) {
            // Mesa 6: 41378 al 46357
            info.put("numero", 6);
            info.put("rango", "41.378 al 46.357");
            info.put("responsables", new String[0]);
        } else if (numeroSocio <= 50897) {
            // Mesa 7: 46358 al 50897
            info.put("numero", 7);
            info.put("rango", "46.358 al 50.897");
            info.put("responsables", new String[0]);
        } else if (numeroSocio <= 53924) {
            // Mesa 8: 50898 al 53924
            info.put("numero", 8);
            info.put("rango", "50.898 al 53.924");
            info.put("responsables", new String[0]);
        } else if (numeroSocio <= 55993) {
            // Mesa 9: 53925 al 55993
            info.put("numero", 9);
            info.put("rango", "53.925 al 55.993");
            info.put("responsables", new String[0]);
        } else {
            // Mesa 10: 55994 en adelante (cubre cualquier número mayor)
            info.put("numero", 10);
            info.put("rango", "55.994 en adelante");
            info.put("responsables", new String[0]);
        }

        info.put("mensaje", String.format("MESA %d - Casa Central", info.get("numero")));
        info.put("ubicacion", "Casa Central / Auditorio Principal");
        return info;
    }

    /**
     * Calcula la mesa para socios de Ciudad del Este (CDE).
     */
    private Map<String, Object> calcularMesaCDELegacy(int numeroSocio) {
        Map<String, Object> info = new HashMap<>();

        // CDE - RANGOS CONTINUOS SIN HUECOS
        // Todo socio de CDE obtiene una mesa (no hay mesa 0)

        if (numeroSocio <= 34621) {
            // Mesa 1: Hasta 34621 (incluye cualquier número menor)
            info.put("numero", 1);
            info.put("rango", "Hasta 34.621");
            info.put("responsables", new String[0]);
        } else if (numeroSocio <= 50198) {
            // Mesa 2: 34622 al 50198
            info.put("numero", 2);
            info.put("rango", "34.622 al 50.198");
            info.put("responsables", new String[0]);
        } else {
            // Mesa 3: 50199 en adelante (cubre cualquier número mayor)
            info.put("numero", 3);
            info.put("rango", "50.199 en adelante");
            info.put("responsables", new String[0]);
        }

        info.put("mensaje", String.format("MESA %d - Ciudad del Este", info.get("numero")));
        info.put("ubicacion", "Sucursal Ciudad del Este");
        return info;
    }

    /**
     * Calcula la mesa para socios de Villarrica (VCA).
     */
    private Map<String, Object> calcularMesaVillarricaLegacy(int numeroSocio) {
        Map<String, Object> info = new HashMap<>();

        // Villarrica - TODOS los socios van a Mesa 4
        // No hay mesa 0 para Villarrica
        info.put("numero", 4);
        info.put("rango", "Todos los socios");
        info.put("responsables", new String[0]);
        info.put("mensaje", "MESA 4 - Villarrica");
        info.put("ubicacion", "Sucursal Villarrica (VCA)");
        return info;
    }
}
