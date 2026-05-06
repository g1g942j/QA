package org.example.config;

import java.util.Arrays;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.util.StringUtils;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class CorsConfig {

    
    @Bean
    public WebMvcConfigurer corsConfigurer(
            @Value("${recipebook.cors.allowed-origin-patterns:}") String configuredPatterns) {
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(CorsRegistry registry) {
                var reg =
                        registry.addMapping("/api/**")
                                .allowedMethods(
                                        "GET", "POST", "PUT", "DELETE", "OPTIONS")
                                .allowedHeaders("*")
                                .allowCredentials(false);

                String[] patterns;
                if (StringUtils.hasText(configuredPatterns)) {
                    patterns =
                            Arrays.stream(configuredPatterns.split(","))
                                    .map(String::trim)
                                    .filter(StringUtils::hasText)
                                    .toArray(String[]::new);
                } else {
                    patterns = new String[] {"*"};
                }
                if (patterns.length > 0) {
                    reg.allowedOriginPatterns(patterns);
                }
            }
        };
    }
}
