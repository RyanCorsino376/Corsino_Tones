package com.corsinotones.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowable;

import com.corsinotones.BackendApplication;
import org.junit.jupiter.api.Test;
import org.springframework.boot.WebApplicationType;
import org.springframework.boot.builder.SpringApplicationBuilder;

// DB-09: the app does not start without a database password or a reachable database, and the error names the connection.
class BancoConfigTest {

	// Port 1 on the loopback: nothing listens there, so the connection is refused at once.
	private static final String URL_INACESSIVEL = "jdbc:postgresql://127.0.0.1:1/corsinotones";

	private static Throwable falhaAoIniciar(String... argumentos) {
		return catchThrowable(() -> new SpringApplicationBuilder(BackendApplication.class)
				.web(WebApplicationType.NONE)
				.run(argumentos)
				.close());
	}

	private static String mensagens(Throwable erro) {
		StringBuilder todas = new StringBuilder();
		for (Throwable atual = erro; atual != null; atual = atual.getCause()) {
			todas.append(atual.getMessage()).append(" | ");
		}
		return todas.toString();
	}

	@Test
	// Surefire defines CORSINO_DB_PASSWORD, so "missing" is tested as the empty value (an absent variable is the empty default).
	void senhaVaziaImpedeAInicializacaoNomeandoAVariavelEAUrl() {
		Throwable erro = falhaAoIniciar("--spring.datasource.url=" + URL_INACESSIVEL, "--spring.datasource.password=");

		assertThat(erro).isNotNull();
		assertThat(mensagens(erro)).contains("CORSINO_DB_PASSWORD").contains(URL_INACESSIVEL);
	}

	@Test
	void senhaEmBrancoTambemImpedeAInicializacao() {
		Throwable erro = falhaAoIniciar("--spring.datasource.url=" + URL_INACESSIVEL, "--spring.datasource.password=   ");

		assertThat(erro).isNotNull();
		assertThat(mensagens(erro)).contains("CORSINO_DB_PASSWORD").contains(URL_INACESSIVEL);
	}

	@Test
	void bancoInacessivelImpedeAInicializacaoNomeandoAUrlSemMostrarASenha() {
		Throwable erro = falhaAoIniciar("--spring.datasource.url=" + URL_INACESSIVEL,
				"--spring.datasource.password=senha-que-nao-aparece");

		assertThat(erro).isNotNull();
		assertThat(mensagens(erro)).contains(URL_INACESSIVEL).doesNotContain("senha-que-nao-aparece");
	}
}
