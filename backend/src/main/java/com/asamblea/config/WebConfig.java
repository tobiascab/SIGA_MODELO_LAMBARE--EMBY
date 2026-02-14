package com.asamblea.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // Servir archivos estáticos desde /uploads con optimizaciones
        registry.addResourceHandler("/uploads/**")
                .addResourceLocations("file:/app/uploads/")
                .setCachePeriod(31536000) // 1 año de caché (el navegador lo pedirá menos veces)
                .resourceChain(true);
    }
}
