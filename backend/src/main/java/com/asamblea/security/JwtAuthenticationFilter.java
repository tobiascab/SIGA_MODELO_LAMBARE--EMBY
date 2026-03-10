package com.asamblea.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final UserDetailsService userDetailsService;
    private final com.asamblea.service.ConfiguracionService configuracionService;

    @Override
    protected boolean shouldNotFilter(@NonNull HttpServletRequest request) {
        String path = request.getRequestURI();
        // System.out.println(">>> JWT shouldNotFilter checking path: " + path);
        // No filtrar rutas públicas
        boolean skip = path.equals("/api/auth/login") ||
                path.equals("/api/auth/system-reset") ||
                path.equals("/api/socios/reset-padron") ||
                path.equals("/api/configuracion") || // Necesario para saber si hay mantenimiento
                path.startsWith("/public") ||
                path.startsWith("/v3/api-docs") ||
                path.startsWith("/swagger-ui");
        // System.out.println(">>> JWT shouldNotFilter result: " + skip);
        return skip;
    }

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain) throws ServletException, IOException {
        final String authHeader = request.getHeader("Authorization");
        // System.out.println("DEBUG: Request URI: " + request.getRequestURI());

        final String jwt;
        final String username;
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        // Token Bearer está presente — si falla validación, DEBE ser 401 (no 403)
        try {
            jwt = authHeader.substring(7).trim();
            username = jwtService.extractUsername(jwt);

            if (username != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                UserDetails userDetails = this.userDetailsService.loadUserByUsername(username);

                // --- MAINTENANCE MODE CHECK ---
                boolean maintenanceMode = "true".equals(configuracionService.obtener("MODO_MANTENIMIENTO", "false"));
                if (maintenanceMode) {
                    boolean isSuperAdmin = userDetails.getAuthorities().stream()
                            .anyMatch(a -> a.getAuthority().equals("ROLE_SUPER_ADMIN"));

                    if (!isSuperAdmin) {
                        response.setStatus(HttpServletResponse.SC_SERVICE_UNAVAILABLE);
                        response.setContentType("application/json");
                        response.getWriter().write("{\"error\": \"El sistema se encuentra en mantenimiento.\"}");
                        return; // Bloquear petición
                    }
                }
                // ------------------------------

                if (jwtService.isTokenValid(jwt, userDetails)) {
                    UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                            userDetails,
                            null,
                            userDetails.getAuthorities());
                    authToken.setDetails(
                            new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(authToken);
                } else {
                    // Token presente pero inválido (expirado o tokenVersion no coincide)
                    // → devolver 401 explícito para que el frontend distinga de 403 (permisos)
                    response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                    response.setContentType("application/json");
                    response.getWriter().write("{\"error\": \"Token expirado o inválido. Inicie sesión nuevamente.\"}");
                    return;
                }
            }
        } catch (Exception e) {
            // Error al parsear/verificar JWT (firma inválida, token corrupto, expirado)
            // → devolver 401 explícito
            System.err.println("JWT Authentication Error: " + e.getMessage());
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType("application/json");
            response.getWriter().write("{\"error\": \"Sesión expirada.\"}");
            return;
        }

        filterChain.doFilter(request, response);
    }
}
