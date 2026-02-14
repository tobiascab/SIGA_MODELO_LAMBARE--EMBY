package com.asamblea.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * Entidad que almacena los datos de configuración de la cooperativa.
 * Esta entidad es clave para hacer el sistema reutilizable (white-label).
 */
@Entity
@Table(name = "cooperativa")
public class Cooperativa {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String nombre; // Nombre completo: "Cooperativa Multiactiva Lambaré Ltda."

    @Column(name = "nombre_corto")
    private String nombreCorto; // Nombre corto: "Lambaré"

    private String logo; // URL o path del logo

    private String eslogan; // "Tu cooperativa de confianza"

    private String direccion;

    private String ciudad;

    private String pais;

    private String telefono;

    @Column(name = "telefono_secundario")
    private String telefonoSecundario;

    private String email;

    @Column(name = "email_soporte")
    private String emailSoporte;

    @Column(name = "sitio_web")
    private String sitioWeb;

    private String ruc; // RUC o identificación fiscal

    @Column(name = "color_primario")
    private String colorPrimario; // Color principal en hex: "#A8252C"

    @Column(name = "color_secundario")
    private String colorSecundario; // Color secundario: "#600000"

    @Column(name = "color_acento")
    private String colorAcento; // Color de acento: "#D4AF37"

    @Column(name = "anio_fundacion")
    private Integer anioFundacion;

    @Column(name = "numero_resolucion")
    private String numeroResolucion; // Resolución de constitución

    @Column(name = "facebook_url")
    private String facebookUrl;

    @Column(name = "instagram_url")
    private String instagramUrl;

    @Column(name = "twitter_url")
    private String twitterUrl;

    @Column(name = "whatsapp_numero")
    private String whatsappNumero;

    @Column(name = "horario_atencion")
    private String horarioAtencion;

    @Column(name = "texto_footer")
    private String textoFooter; // Texto para pie de página en reportes

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "updated_by")
    private String updatedBy;

    // Constructor por defecto
    public Cooperativa() {
    }

    // Getters y Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getNombre() {
        return nombre;
    }

    public void setNombre(String nombre) {
        this.nombre = nombre;
    }

    public String getNombreCorto() {
        return nombreCorto;
    }

    public void setNombreCorto(String nombreCorto) {
        this.nombreCorto = nombreCorto;
    }

    public String getLogo() {
        return logo;
    }

    public void setLogo(String logo) {
        this.logo = logo;
    }

    public String getEslogan() {
        return eslogan;
    }

    public void setEslogan(String eslogan) {
        this.eslogan = eslogan;
    }

    public String getDireccion() {
        return direccion;
    }

    public void setDireccion(String direccion) {
        this.direccion = direccion;
    }

    public String getCiudad() {
        return ciudad;
    }

    public void setCiudad(String ciudad) {
        this.ciudad = ciudad;
    }

    public String getPais() {
        return pais;
    }

    public void setPais(String pais) {
        this.pais = pais;
    }

    public String getTelefono() {
        return telefono;
    }

    public void setTelefono(String telefono) {
        this.telefono = telefono;
    }

    public String getTelefonoSecundario() {
        return telefonoSecundario;
    }

    public void setTelefonoSecundario(String telefonoSecundario) {
        this.telefonoSecundario = telefonoSecundario;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getEmailSoporte() {
        return emailSoporte;
    }

    public void setEmailSoporte(String emailSoporte) {
        this.emailSoporte = emailSoporte;
    }

    public String getSitioWeb() {
        return sitioWeb;
    }

    public void setSitioWeb(String sitioWeb) {
        this.sitioWeb = sitioWeb;
    }

    public String getRuc() {
        return ruc;
    }

    public void setRuc(String ruc) {
        this.ruc = ruc;
    }

    public String getColorPrimario() {
        return colorPrimario;
    }

    public void setColorPrimario(String colorPrimario) {
        this.colorPrimario = colorPrimario;
    }

    public String getColorSecundario() {
        return colorSecundario;
    }

    public void setColorSecundario(String colorSecundario) {
        this.colorSecundario = colorSecundario;
    }

    public String getColorAcento() {
        return colorAcento;
    }

    public void setColorAcento(String colorAcento) {
        this.colorAcento = colorAcento;
    }

    public Integer getAnioFundacion() {
        return anioFundacion;
    }

    public void setAnioFundacion(Integer anioFundacion) {
        this.anioFundacion = anioFundacion;
    }

    public String getNumeroResolucion() {
        return numeroResolucion;
    }

    public void setNumeroResolucion(String numeroResolucion) {
        this.numeroResolucion = numeroResolucion;
    }

    public String getFacebookUrl() {
        return facebookUrl;
    }

    public void setFacebookUrl(String facebookUrl) {
        this.facebookUrl = facebookUrl;
    }

    public String getInstagramUrl() {
        return instagramUrl;
    }

    public void setInstagramUrl(String instagramUrl) {
        this.instagramUrl = instagramUrl;
    }

    public String getTwitterUrl() {
        return twitterUrl;
    }

    public void setTwitterUrl(String twitterUrl) {
        this.twitterUrl = twitterUrl;
    }

    public String getWhatsappNumero() {
        return whatsappNumero;
    }

    public void setWhatsappNumero(String whatsappNumero) {
        this.whatsappNumero = whatsappNumero;
    }

    public String getHorarioAtencion() {
        return horarioAtencion;
    }

    public void setHorarioAtencion(String horarioAtencion) {
        this.horarioAtencion = horarioAtencion;
    }

    public String getTextoFooter() {
        return textoFooter;
    }

    public void setTextoFooter(String textoFooter) {
        this.textoFooter = textoFooter;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    public String getUpdatedBy() {
        return updatedBy;
    }

    public void setUpdatedBy(String updatedBy) {
        this.updatedBy = updatedBy;
    }

    @PreUpdate
    @PrePersist
    public void updateTimestamp() {
        this.updatedAt = LocalDateTime.now();
    }
}
