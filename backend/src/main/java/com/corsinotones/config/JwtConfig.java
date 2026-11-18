package com.corsinotones.config;

import java.nio.charset.StandardCharsets;
import java.time.Clock;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;

/** JWT signing with HS256. The secret comes from the environment and the app does not start without a strong one. */
@Configuration
public class JwtConfig {

	static final int TAMANHO_MINIMO_SEGREDO = 32;

	private final SecretKey chave;

	public JwtConfig(@Value("${corsino.jwt.secret:}") String segredo) {
		if (segredo == null || segredo.isBlank() || segredo.length() < TAMANHO_MINIMO_SEGREDO) {
			throw new IllegalStateException("CORSINO_JWT_SECRET must be set to at least "
					+ TAMANHO_MINIMO_SEGREDO + " characters.");
		}
		this.chave = new SecretKeySpec(segredo.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
	}

	@Bean
	JwtEncoder jwtEncoder() {
		return NimbusJwtEncoder.withSecretKey(chave).algorithm(MacAlgorithm.HS256).build();
	}

	@Bean
	JwtDecoder jwtDecoder() {
		return NimbusJwtDecoder.withSecretKey(chave).macAlgorithm(MacAlgorithm.HS256).build();
	}

	@Bean
	Clock relogio() {
		return Clock.systemUTC();
	}
}
