package com.corsinotones;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.io.Reader;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import java.util.Properties;
import org.junit.jupiter.api.Test;
import org.yaml.snakeyaml.Yaml;

// DB-10: the development database is a committed compose file whose password comes from a git-ignored .env.
class ArquivosDeAmbienteTest {

	private static final Path RAIZ = Path.of("..");

	@SuppressWarnings("unchecked")
	private static Map<String, Object> servicoPostgres() throws IOException {
		try (Reader leitor = Files.newBufferedReader(RAIZ.resolve("docker-compose.yml"))) {
			Map<String, Object> compose = new Yaml().load(leitor);
			Map<String, Object> servicos = (Map<String, Object>) compose.get("services");
			return (Map<String, Object>) servicos.get("postgres");
		}
	}

	private static Properties env(String arquivo) throws IOException {
		Properties valores = new Properties();
		try (Reader leitor = Files.newBufferedReader(RAIZ.resolve(arquivo))) {
			valores.load(leitor);
		}
		return valores;
	}

	@Test
	@SuppressWarnings("unchecked")
	void composeTemUmPostgres16PublicadoNa5433() throws IOException {
		Map<String, Object> postgres = servicoPostgres();

		assertThat(postgres.get("image")).isEqualTo("postgres:16");
		assertThat((List<Object>) postgres.get("ports")).containsExactly("5433:5432");
	}

	@Test
	@SuppressWarnings("unchecked")
	void senhaDoComposeVemDoEnv() throws IOException {
		Map<String, Object> ambiente = (Map<String, Object>) servicoPostgres().get("environment");

		assertThat(ambiente.get("POSTGRES_PASSWORD")).isEqualTo("${POSTGRES_PASSWORD}");
	}

	@Test
	void envExampleExisteSoComUmaSenhaDeExemplo() throws IOException {
		Properties exemplo = env(".env.example");

		assertThat(exemplo.getProperty("POSTGRES_PASSWORD")).isEqualTo("troque-esta-senha");
		// A developer's real .env (if present) must not have been copied back into the example.
		if (Files.exists(RAIZ.resolve(".env"))) {
			assertThat(env(".env").getProperty("POSTGRES_PASSWORD")).isNotEqualTo(exemplo.getProperty("POSTGRES_PASSWORD"));
		}
	}

	@Test
	void envEstaNoGitignore() throws IOException {
		assertThat(Files.readAllLines(RAIZ.resolve(".gitignore"))).contains(".env");
	}
}
