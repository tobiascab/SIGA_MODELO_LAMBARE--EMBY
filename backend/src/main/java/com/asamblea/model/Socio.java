package com.asamblea.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "socios")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Socio {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "numero_socio", unique = true, nullable = false)
    private String numeroSocio;

    @Column(unique = true, nullable = false)
    private String cedula;

    @Column(name = "nombre_completo", nullable = false)
    private String nombreCompleto;

    private String telefono;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "id_sucursal")
    private Sucursal sucursal;

    @Column(name = "aporte_al_dia")
    private boolean aporteAlDia;

    @Column(name = "solidaridad_al_dia")
    private boolean solidaridadAlDia;

    @Column(name = "fondo_al_dia")
    private boolean fondoAlDia;

    @Column(name = "incoop_al_dia")
    private boolean incoopAlDia;

    @Column(name = "credito_al_dia")
    private boolean creditoAlDia;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "en_padron_actual")
    private boolean enPadronActual = true;

    // Campos adicionales importados del Excel (Padrón 2024)
    private String clasificacion;
    private String direccion;
    private String barrio;

    @Column(name = "fecha_ingreso")
    private String fechaIngreso;

    @Column(name = "fecha_padron")
    private String fechaPadron;

    @Column(name = "deuda_aporte")
    private String deudaAporte;

    @Column(name = "aporte_cubierto")
    private String aporteCubierto;

    @Column(name = "deuda_solidaridad")
    private String deudaSolidaridad;

    @Column(name = "solidaridad_cubierto")
    private String solidaridadCubierto;

    @Column(name = "deuda_sede_social")
    private String deudaSedeSocial;

    @Column(name = "sede_social_cubierto")
    private String sedeSocialCubierto;

    @Column(name = "deuda_prestamo")
    private String deudaPrestamo;

    @Column(name = "mayor_dia_atraso_pmo")
    private String mayorDiaAtrasoPmo;

    @Column(name = "deuda_tarjeta_credito")
    private String deudaTarjetaCredito;

    @Column(name = "mayor_dia_atraso_tc")
    private String mayorDiaAtrasoTc;

    @Column(name = "habilitado_voz_voto")
    private String habilitadoVozVoto;

    private String mesa;

    @Column(name = "nro_orden_padron")
    private String nroOrdenPadron;

    // Nuevos campos para enriquecimiento de datos
    private String edad;
    private String ocupacion;
    private String profesion;

    @Column(name = "grado_instruccion")
    private String gradoInstruccion;

    private String ciudad;
    private String email;
    private String movil;

    // El estado de voz y voto se calcula en la lógica de negocio o mediante una
    // columna persistida/virtual
    @Transient
    public boolean isEstadoVozVoto() {
        // La lógica ahora es directa: si el campo 'Habilitado voz/voto' del Excel dice algo con "VOTO"
        if (habilitadoVozVoto != null) {
             return habilitadoVozVoto.toUpperCase().contains("VOTO");
        }
        // Fallback por si el campo está vacío (logica antigua opcional o default false)
        return false;
    }
}
