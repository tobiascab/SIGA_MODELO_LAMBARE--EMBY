package com.asamblea.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Servicio para exportar datos de socios para mensajería.
 * Limpia y formatea los teléfonos en formato internacional +595.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class MensajeriaExportService {

    private final JdbcTemplate jdbcTemplate;
    
    // Patrón para extraer números de celular paraguayos
    private static final Pattern MOBILE_PATTERN = Pattern.compile("(?:(?:\\+?595|0)?\\s?)?(9[0-9]{2})\\s?([0-9]{3})\\s?([0-9]{3})");
    
    /**
     * Exporta socios con Voz y Voto a formato CSV.
     */
    public String exportarVyVtoCSV() {
        List<Map<String, Object>> socios = obtenerSociosVyV();
        
        StringBuilder csv = new StringBuilder();
        // Encabezados
        csv.append("NRO_SOCIO,CEDULA,NOMBRE_COMPLETO,TELEFONO_1,TELEFONO_2,TELEFONO_3\n");
        
        for (Map<String, Object> socio : socios) {
            String numeroSocio = (String) socio.get("numero_socio");
            String cedula = (String) socio.get("cedula");
            String nombre = limpiarTexto((String) socio.get("nombre_completo"));
            String telefonoRaw = (String) socio.get("telefono");
            
            List<String> telefonos = limpiarYSepararTelefonos(telefonoRaw);
            
            csv.append(escaparCSV(numeroSocio)).append(",");
            csv.append(escaparCSV(cedula)).append(",");
            csv.append(escaparCSV(nombre)).append(",");
            csv.append(telefonos.size() > 0 ? telefonos.get(0) : "").append(",");
            csv.append(telefonos.size() > 1 ? telefonos.get(1) : "").append(",");
            csv.append(telefonos.size() > 2 ? telefonos.get(2) : "");
            csv.append("\n");
        }
        
        return csv.toString();
    }
    
    /**
     * Exporta socios con Voz y Voto a formato Excel.
     */
    public byte[] exportarVyVtoExcel() throws Exception {
        List<Map<String, Object>> socios = obtenerSociosVyV();
        
        try (Workbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("Socios VyV");
            
            // Estilo para encabezados
            CellStyle headerStyle = workbook.createCellStyle();
            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerFont.setFontHeightInPoints((short) 12);
            headerStyle.setFont(headerFont);
            headerStyle.setFillForegroundColor(IndexedColors.LIGHT_GREEN.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            headerStyle.setBorderBottom(BorderStyle.THIN);
            headerStyle.setBorderTop(BorderStyle.THIN);
            headerStyle.setBorderLeft(BorderStyle.THIN);
            headerStyle.setBorderRight(BorderStyle.THIN);
            
            // Crear encabezados
            Row headerRow = sheet.createRow(0);
            String[] headers = {"NRO_SOCIO", "CEDULA", "NOMBRE_COMPLETO", "TELEFONO_1", "TELEFONO_2", "TELEFONO_3"};
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }
            
            // Llenar datos
            int rowNum = 1;
            for (Map<String, Object> socio : socios) {
                Row row = sheet.createRow(rowNum++);
                
                String numeroSocio = (String) socio.get("numero_socio");
                String cedula = (String) socio.get("cedula");
                String nombre = limpiarTexto((String) socio.get("nombre_completo"));
                String telefonoRaw = (String) socio.get("telefono");
                
                List<String> telefonos = limpiarYSepararTelefonos(telefonoRaw);
                
                row.createCell(0).setCellValue(numeroSocio != null ? numeroSocio : "");
                row.createCell(1).setCellValue(cedula != null ? cedula : "");
                row.createCell(2).setCellValue(nombre != null ? nombre : "");
                row.createCell(3).setCellValue(telefonos.size() > 0 ? telefonos.get(0) : "");
                row.createCell(4).setCellValue(telefonos.size() > 1 ? telefonos.get(1) : "");
                row.createCell(5).setCellValue(telefonos.size() > 2 ? telefonos.get(2) : "");
            }
            
            // Auto-ajustar columnas
            for (int i = 0; i < headers.length; i++) {
                sheet.autoSizeColumn(i);
            }
            
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            workbook.write(out);
            return out.toByteArray();
        }
    }
    
    /**
     * Obtiene todos los socios con Voz y Voto.
     */
    private List<Map<String, Object>> obtenerSociosVyV() {
        String sql = """
            SELECT numero_socio, cedula, nombre_completo, telefono
            FROM socios
            WHERE en_padron_actual = true
              AND LOWER(habilitado_voz_voto) LIKE '%voto%'
            ORDER BY nombre_completo
        """;
        return jdbcTemplate.queryForList(sql);
    }
    
    /**
     * Limpia y separa múltiples teléfonos de un campo.
     * Devuelve lista de teléfonos en formato +595XXXXXXXXX (sin espacios).
     */
    private List<String> limpiarYSepararTelefonos(String telefonoRaw) {
        List<String> resultado = new ArrayList<>();
        
        if (telefonoRaw == null || telefonoRaw.trim().isEmpty() || 
            telefonoRaw.equalsIgnoreCase("Actualizar Nro")) {
            return resultado;
        }
        
        // Normalizar separadores
        String normalizado = telefonoRaw
            .replace("\n", " ")
            .replace(";", " ")
            .replace("/", " ")
            .replace("-", " ")
            .replace(",", " ")
            .replaceAll("\\s+", " ")
            .trim();
        
        // Buscar todos los números de celular válidos
        Set<String> encontrados = new LinkedHashSet<>(); // Preservar orden, evitar duplicados
        
        Matcher matcher = MOBILE_PATTERN.matcher(normalizado);
        while (matcher.find()) {
            String prefix = matcher.group(1); // 981, 982, etc.
            String mid = matcher.group(2);
            String end = matcher.group(3);
            
            // Validar que empiece con 9
            if (prefix != null && prefix.startsWith("9")) {
                String formatted = "+595" + prefix + mid + end;
                encontrados.add(formatted);
            }
        }
        
        // Si el campo ya está en formato +595 XXX XXX XXX
        if (encontrados.isEmpty() && telefonoRaw.startsWith("+595")) {
            String digits = telefonoRaw.replaceAll("[^0-9]", "");
            if (digits.length() >= 12) { // 595 + 9 dígitos
                String formatted = "+" + digits.substring(0, 3) + digits.substring(3, 6) + digits.substring(6, 9) + digits.substring(9, 12);
                encontrados.add(formatted);
            }
        }
        
        resultado.addAll(encontrados);
        return resultado;
    }
    
    /**
     * Limpia texto para evitar problemas con caracteres especiales.
     */
    private String limpiarTexto(String texto) {
        if (texto == null) return "";
        return texto.trim().replaceAll("\\s+", " ");
    }
    
    /**
     * Escapa valores para CSV.
     */
    private String escaparCSV(String valor) {
        if (valor == null) return "";
        if (valor.contains(",") || valor.contains("\"") || valor.contains("\n")) {
            return "\"" + valor.replace("\"", "\"\"") + "\"";
        }
        return valor;
    }
    
    /**
     * Estadísticas de exportación.
     */
    public Map<String, Object> obtenerEstadisticas() {
        Map<String, Object> stats = new HashMap<>();
        
        Integer totalVyV = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM socios WHERE en_padron_actual = true " +
            "AND LOWER(habilitado_voz_voto) LIKE '%voto%'", Integer.class);
        
        Integer conTelefono = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM socios WHERE en_padron_actual = true " +
            "AND LOWER(habilitado_voz_voto) LIKE '%voto%' " +
            "AND telefono IS NOT NULL AND telefono != '' AND telefono != 'Actualizar Nro' AND telefono LIKE '+595%'", 
            Integer.class);
        
        stats.put("totalVyV", totalVyV != null ? totalVyV : 0);
        stats.put("conTelefonoValido", conTelefono != null ? conTelefono : 0);
        stats.put("sinTelefono", (totalVyV != null ? totalVyV : 0) - (conTelefono != null ? conTelefono : 0));
        
        return stats;
    }
}
