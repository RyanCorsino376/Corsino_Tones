package com.corsinotones.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.corsinotones.model.Usuario;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import javax.crypto.spec.SecretKeySpec;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.BadJwtException;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;

// LOG-04 (fixed clock in 2099 so the decoder, which uses the real clock, sees it as valid): HS256 token with sub = id, nome, email and exp = iat + 2 hours.
class TokenServiceTest {

	private static final String SEGREDO = "a-secret-with-at-least-32-characters!!";
	private static final Instant AGORA = Instant.parse("2099-01-01T12:00:00Z");

	private static final SecretKeySpec CHAVE = new SecretKeySpec(SEGREDO.getBytes(StandardCharsets.UTF_8), "HmacSHA256");

	private final JwtDecoder decoder = NimbusJwtDecoder.withSecretKey(CHAVE).macAlgorithm(MacAlgorithm.HS256).build();
	private final TokenService servico = new TokenService(
			NimbusJwtEncoder.withSecretKey(CHAVE).algorithm(MacAlgorithm.HS256).build(), Clock.fixed(AGORA, ZoneOffset.UTC));
	private final Usuario usuario = new Usuario(7, "Davi", "davi@exemplo.com", "hash");

	@Test
	void tokenCarregaIdNomeEmailEExpiraEmDuasHoras() {
		Jwt jwt = decoder.decode(servico.gerar(usuario));

		assertThat(jwt.getSubject()).isEqualTo("7");
		assertThat(jwt.<String>getClaim("nome")).isEqualTo("Davi");
		assertThat(jwt.<String>getClaim("email")).isEqualTo("davi@exemplo.com");
		assertThat(jwt.getIssuedAt()).isEqualTo(AGORA);
		assertThat(jwt.getExpiresAt()).isEqualTo(AGORA.plusSeconds(7200));
	}

	@Test
	void algoritmoDoCabecalhoEHS256() {
		Jwt jwt = decoder.decode(servico.gerar(usuario));

		assertThat(jwt.getHeaders().get("alg")).isEqualTo("HS256");
	}

	@Test
	void tokenNaoEAceitoComOutroSegredo() {
		JwtDecoder outro = NimbusJwtDecoder
				.withSecretKey(new SecretKeySpec("another-secret-with-32-characters!!!!".getBytes(), "HmacSHA256"))
				.macAlgorithm(MacAlgorithm.HS256).build();

		assertThatThrownBy(() -> outro.decode(servico.gerar(usuario))).isInstanceOf(BadJwtException.class);
	}
}
