package com.asamblea.security;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

@Configuration
@EnableWebSecurity(debug = false)
@org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfiguration {

        private final JwtAuthenticationFilter jwtAuthFilter;
        private final AuthenticationProvider authenticationProvider;

        @Bean
        public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
                http
                                // CSRF deshabilitado para API REST stateless con JWT
                                // Esto es seguro porque usamos JWT en Authorization header
                                .csrf(AbstractHttpConfigurer::disable)
                                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                                .headers(headers -> headers
                                                .frameOptions(frame -> frame.disable())) // Permitir iframes para PDFs
                                .authorizeHttpRequests(auth -> auth
                                                .requestMatchers("/public/**", "/api/auth/login", "/error").permitAll()
                                                .requestMatchers("/api/public/**").permitAll() // Endpoints públicos
                                                                                               // para pantalla
                                                .requestMatchers("/api/candidatos/publico").permitAll() // Candidatos
                                                                                                        // público
                                                .requestMatchers("/api/memoria-balance/**").permitAll() // Módulo
                                                                                                        // Memoria y
                                                                                                        // Balance
                                                .requestMatchers("/uploads/**").permitAll() // Archivos estáticos (PDFs,
                                                                                            // imágenes)
                                                .requestMatchers("/api/cooperativa/publica").permitAll() // Datos públicos de la cooperativa (logo, nombre)
                                                .requestMatchers("/api/configuracion").permitAll()
                                                .requestMatchers("/v3/api-docs/**", "/swagger-ui/**").permitAll()
                                                .requestMatchers("/api/socios/reset-padron").permitAll()
                                                .requestMatchers("/actuator/**").permitAll()
                                                .anyRequest().authenticated())
                                .sessionManagement(session -> session
                                                .sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                                .authenticationProvider(authenticationProvider)
                                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

                return http.build();
        }

        @Bean
        public CorsConfigurationSource corsConfigurationSource() {
                CorsConfiguration configuration = new CorsConfiguration();

                // CONFIGURACIÓN SEGURA DE CORS: Dominios específicos desde variable de entorno
                String allowedOriginsEnv = System.getenv("CORS_ALLOWED_ORIGINS");
                List<String> allowedOrigins;

                if (allowedOriginsEnv != null && !allowedOriginsEnv.isEmpty()) {
                        // Usar dominios desde variable de entorno
                        allowedOrigins = Arrays.asList(allowedOriginsEnv.split(","));
                } else {
                        // Valores por defecto (CAMBIAR SEGÚN TU DOMINIO DE PRODUCCIÓN)
                        allowedOrigins = Arrays.asList(
                                "https://asamblea.cloud",
                                "https://www.asamblea.cloud",
                                "http://localhost:6001" // Solo para desarrollo
                        );
                }

                configuration.setAllowedOrigins(allowedOrigins);
                configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
                configuration.setAllowedHeaders(List.of("*"));
                configuration.setAllowCredentials(true);
                configuration.setMaxAge(3600L); // Cache preflight por 1 hora

                UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
                source.registerCorsConfiguration("/**", configuration);
                return source;
        }
}
