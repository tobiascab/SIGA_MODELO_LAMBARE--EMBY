package com.asamblea.dto;

import com.asamblea.model.Socio;
import lombok.Data;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class SocioDTO {
    private Long id;
    private String numeroSocio;
    private String nombreCompleto;
    private String cedula;
    private String telefono;
    private SucursalDTO sucursal;
    private Boolean aporteAlDia;
    private Boolean solidaridadAlDia;
    private Boolean fondoAlDia;
    private Boolean incoopAlDia;
    private Boolean creditoAlDia;

    // Campos del padrón 2024/2026
    private String habilitadoVozVoto;
    private Boolean estadoVozVoto; // campo computado: true si habilitadoVozVoto contiene "VOTO"
    private String direccion;
    private String barrio;
    private String fechaIngreso;
    private String fechaPadron;
    private String edad;
    private String profesion;
    private String ocupacion;
    private String ciudad;
    private String email;
    private String movil;
    private String mesa;
    private String nroOrdenPadron;
    private Boolean enPadronActual;

    public static SocioDTO fromEntity(Socio socio) {
        SocioDTO dto = new SocioDTO();
        dto.setId(socio.getId());
        dto.setNumeroSocio(socio.getNumeroSocio());
        dto.setNombreCompleto(socio.getNombreCompleto());
        dto.setCedula(socio.getCedula());
        dto.setTelefono(socio.getTelefono());
        dto.setAporteAlDia(socio.isAporteAlDia());
        dto.setSolidaridadAlDia(socio.isSolidaridadAlDia());
        dto.setFondoAlDia(socio.isFondoAlDia());
        dto.setIncoopAlDia(socio.isIncoopAlDia());
        dto.setCreditoAlDia(socio.isCreditoAlDia());

        // Campos del padrón moderno
        dto.setHabilitadoVozVoto(socio.getHabilitadoVozVoto());
        dto.setEstadoVozVoto(socio.isEstadoVozVoto());
        dto.setDireccion(socio.getDireccion());
        dto.setBarrio(socio.getBarrio());
        dto.setFechaIngreso(socio.getFechaIngreso());
        dto.setFechaPadron(socio.getFechaPadron());
        dto.setEdad(socio.getEdad());
        dto.setProfesion(socio.getProfesion());
        dto.setOcupacion(socio.getOcupacion());
        dto.setCiudad(socio.getCiudad());
        dto.setEmail(socio.getEmail());
        dto.setMovil(socio.getMovil());
        dto.setMesa(socio.getMesa());
        dto.setNroOrdenPadron(socio.getNroOrdenPadron());
        dto.setEnPadronActual(socio.isEnPadronActual());

        // Sucursal como DTO
        if (socio.getSucursal() != null) {
            SucursalDTO sucursalDTO = new SucursalDTO();
            sucursalDTO.setId(socio.getSucursal().getId());
            sucursalDTO.setCodigo(socio.getSucursal().getCodigo());
            sucursalDTO.setNombre(socio.getSucursal().getNombre());
            sucursalDTO.setCiudad(socio.getSucursal().getCiudad());
            dto.setSucursal(sucursalDTO);
        }

        return dto;
    }
}
