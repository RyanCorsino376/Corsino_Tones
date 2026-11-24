package com.corsinotones.config;

import com.corsinotones.dto.ErroResposta;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import tools.jackson.databind.json.JsonMapper;

@Configuration
public class SegurancaConfig {

	// Legacy front end (8080) and the Vite dev server (5173), on localhost and on 127.0.0.1
	// (the browser treats them as different origins).
	private static final List<String> ORIGENS_PERMITIDAS = List.of("http://localhost:8080", "http://localhost:5173",
			"http://127.0.0.1:8080", "http://127.0.0.1:5173");

	private static final String[] CATALOGO = {"/equipamentos", "/equipamentos/**", "/packs", "/packs/**", "/presets",
			"/presets/**"};

	static final String MSG_SEM_LOGIN = "Faça login para continuar.";
	static final String MSG_SO_ADMIN = "Acesso restrito ao administrador.";

	// Stateless JSON API without cookies, so CSRF protection is off. Bearer tokens are validated by the
	// JwtDecoder of JwtConfig; catalogue reads are public, catalogue writes need ADMIN, orders need a token.
	// Anything else stays open so unknown routes still reach the 404 handler (SRV-05).
	@Bean
	SecurityFilterChain filtros(HttpSecurity http, JsonMapper json) throws Exception {
		AuthenticationEntryPoint semLogin = (pedido, resposta, erro) ->
				escrever(json, resposta, HttpStatus.UNAUTHORIZED, MSG_SEM_LOGIN);
		AccessDeniedHandler soAdmin = (pedido, resposta, erro) ->
				escrever(json, resposta, HttpStatus.FORBIDDEN, MSG_SO_ADMIN);
		http
				.csrf(AbstractHttpConfigurer::disable)
				.cors(cors -> { })
				.sessionManagement(sessao -> sessao.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
				.authorizeHttpRequests(autorizacao -> autorizacao
						.requestMatchers("/auth/**").permitAll()
						.requestMatchers(HttpMethod.GET, CATALOGO).permitAll()
						.requestMatchers(HttpMethod.POST, CATALOGO).hasRole("ADMIN")
						.requestMatchers(HttpMethod.PUT, CATALOGO).hasRole("ADMIN")
						.requestMatchers(HttpMethod.DELETE, CATALOGO).hasRole("ADMIN")
						.requestMatchers("/pedidos", "/pedidos/**").authenticated()
						.anyRequest().permitAll())
				.oauth2ResourceServer(servidor -> servidor
						.jwt(jwt -> jwt.jwtAuthenticationConverter(perfilComoPapel()))
						.authenticationEntryPoint(semLogin)
						.accessDeniedHandler(soAdmin))
				.exceptionHandling(excecoes -> excecoes
						.authenticationEntryPoint(semLogin)
						.accessDeniedHandler(soAdmin));
		return http.build();
	}

	// The perfil claim (COMUM or ADMIN) becomes ROLE_COMUM or ROLE_ADMIN.
	private static JwtAuthenticationConverter perfilComoPapel() {
		JwtGrantedAuthoritiesConverter papeis = new JwtGrantedAuthoritiesConverter();
		papeis.setAuthoritiesClaimName("perfil");
		papeis.setAuthorityPrefix("ROLE_");
		JwtAuthenticationConverter conversor = new JwtAuthenticationConverter();
		conversor.setJwtGrantedAuthoritiesConverter(papeis);
		return conversor;
	}

	private static void escrever(JsonMapper json, HttpServletResponse resposta, HttpStatus status, String mensagem)
			throws IOException {
		resposta.setStatus(status.value());
		resposta.setContentType(MediaType.APPLICATION_JSON_VALUE);
		resposta.setCharacterEncoding("UTF-8");
		json.writeValue(resposta.getOutputStream(), ErroResposta.semCampos(status.value(), mensagem));
	}

	@Bean
	CorsConfigurationSource corsConfigurationSource() {
		CorsConfiguration configuracao = new CorsConfiguration();
		configuracao.setAllowedOrigins(ORIGENS_PERMITIDAS);
		configuracao.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
		configuracao.setAllowedHeaders(List.of("Authorization", "Content-Type"));
		UrlBasedCorsConfigurationSource fonte = new UrlBasedCorsConfigurationSource();
		fonte.registerCorsConfiguration("/**", configuracao);
		return fonte;
	}

	@Bean
	PasswordEncoder passwordEncoder() {
		return new BCryptPasswordEncoder();
	}
}
