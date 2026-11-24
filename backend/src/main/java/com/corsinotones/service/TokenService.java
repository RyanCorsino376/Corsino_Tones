package com.corsinotones.service;

import com.corsinotones.model.Usuario;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;

@Service
public class TokenService {

	static final Duration VALIDADE = Duration.ofHours(2);

	private final JwtEncoder encoder;
	private final Clock relogio;

	public TokenService(JwtEncoder encoder, Clock relogio) {
		this.encoder = encoder;
		this.relogio = relogio;
	}

	/** Signs an HS256 JWT for the user: sub = id, plus nome, email and perfil, valid for 2 hours. */
	public String gerar(Usuario usuario) {
		Instant agora = relogio.instant();
		JwtClaimsSet claims = JwtClaimsSet.builder()
				.subject(String.valueOf(usuario.id()))
				.claim("nome", usuario.nome())
				.claim("email", usuario.email())
				.claim("perfil", usuario.perfil().name())
				.issuedAt(agora)
				.expiresAt(agora.plus(VALIDADE))
				.build();
		JwsHeader cabecalho = JwsHeader.with(MacAlgorithm.HS256).build();
		return encoder.encode(JwtEncoderParameters.from(cabecalho, claims)).getTokenValue();
	}
}
