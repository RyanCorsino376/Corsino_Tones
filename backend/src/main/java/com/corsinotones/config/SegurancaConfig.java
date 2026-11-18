package com.corsinotones.config;

import java.util.List;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
public class SegurancaConfig {

	// Legacy front end (8080) and the Vite dev server (5173), on localhost and on 127.0.0.1
	// (the browser treats them as different origins).
	private static final List<String> ORIGENS_PERMITIDAS = List.of("http://localhost:8080", "http://localhost:5173",
			"http://127.0.0.1:8080", "http://127.0.0.1:5173");

	// Stateless JSON API without cookies, so CSRF protection is off. No route needs a token yet.
	@Bean
	SecurityFilterChain filtros(HttpSecurity http) throws Exception {
		http
				.csrf(AbstractHttpConfigurer::disable)
				.cors(cors -> { })
				.authorizeHttpRequests(autorizacao -> autorizacao.anyRequest().permitAll());
		return http.build();
	}

	@Bean
	CorsConfigurationSource corsConfigurationSource() {
		CorsConfiguration configuracao = new CorsConfiguration();
		configuracao.setAllowedOrigins(ORIGENS_PERMITIDAS);
		configuracao.setAllowedMethods(List.of("POST", "OPTIONS"));
		configuracao.setAllowedHeaders(List.of("Content-Type"));
		UrlBasedCorsConfigurationSource fonte = new UrlBasedCorsConfigurationSource();
		fonte.registerCorsConfiguration("/**", configuracao);
		return fonte;
	}

	@Bean
	PasswordEncoder passwordEncoder() {
		return new BCryptPasswordEncoder();
	}
}
