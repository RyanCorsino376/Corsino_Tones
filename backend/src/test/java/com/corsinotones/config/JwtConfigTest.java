package com.corsinotones.config;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.security.oauth2.jwt.JwtEncoder;

// LOG-09: the app refuses to start without a usable CORSINO_JWT_SECRET.
class JwtConfigTest {

	private final ApplicationContextRunner contexto = new ApplicationContextRunner().withUserConfiguration(JwtConfig.class);

	@Test
	// The Surefire process always defines CORSINO_JWT_SECRET, so "missing" is tested as the empty value
	// (the code treats an absent property as the empty default).
	void segredoVazioOContextoFalhaNomeandoAVariavel() {
		contexto.withPropertyValues("corsino.jwt.secret=").run(c -> {
			assertThat(c).hasFailed();
			assertThat(rootMessage(c.getStartupFailure())).contains("CORSINO_JWT_SECRET");
		});
	}

	@Test
	void segredoEmBrancoFalha() {
		contexto.withPropertyValues("corsino.jwt.secret=   ").run(c -> {
			assertThat(c).hasFailed();
			assertThat(rootMessage(c.getStartupFailure())).contains("CORSINO_JWT_SECRET");
		});
	}

	@Test
	void segredoDe31CaracteresFalha() {
		contexto.withPropertyValues("corsino.jwt.secret=" + "a".repeat(31)).run(c -> {
			assertThat(c).hasFailed();
			assertThat(rootMessage(c.getStartupFailure())).contains("CORSINO_JWT_SECRET");
		});
	}

	@Test
	void segredoDe32CaracteresIniciaEExpoeOEncoder() {
		contexto.withPropertyValues("corsino.jwt.secret=" + "a".repeat(32)).run(c -> {
			assertThat(c).hasNotFailed();
			assertThat(c).hasSingleBean(JwtEncoder.class);
		});
	}

	private static String rootMessage(Throwable erro) {
		Throwable atual = erro;
		StringBuilder todas = new StringBuilder();
		while (atual != null) {
			todas.append(atual.getMessage()).append(" | ");
			atual = atual.getCause();
		}
		return todas.toString();
	}
}
