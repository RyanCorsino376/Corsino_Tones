package com.corsinotones;

import static org.assertj.core.api.Assertions.assertThat;

import com.corsinotones.model.Perfil;
import com.corsinotones.model.Usuario;
import com.corsinotones.service.TokenService;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.boot.SpringApplication;
import org.springframework.context.ConfigurableApplicationContext;
import org.testcontainers.postgresql.PostgreSQLContainer;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

// DB-06 and DB-07: the application is started for real, stopped, and started again on the same database. Nothing is
// created through a repository: the data goes in and out over HTTP, as a user would.
class PersistenciaAposReinicioTest {

	private final HttpClient http = HttpClient.newHttpClient();
	private final JsonMapper json = JsonMapper.builder().build();

	@Test
	void dadosCriadosPelaApiSobrevivemAoReinicio() throws Exception {
		String sufixo = UUID.randomUUID().toString().replace("-", "").substring(0, 10);
		String email = "reinicio" + sufixo + "@exemplo.com";
		String senha = "senha-de-teste-123";

		try (PostgreSQLContainer banco = new PostgreSQLContainer("postgres:16-alpine")) {
			banco.start();

			String equipamentoCriado;
			long id;
			try (ConfigurableApplicationContext app = iniciar(banco)) {
				String base = base(app);
				String admin = "Bearer " + app.getBean(TokenService.class)
						.gerar(new Usuario(1, "Admin", "admin@exemplo.com", "hash", Perfil.ADMIN));

				HttpResponse<String> criado = enviar("POST", base + "/equipamentos", admin,
						"{\"marca\":\"Marca" + sufixo + "\",\"modelo\":\"Modelo\"}");
				assertThat(criado.statusCode()).isEqualTo(201);
				id = json.readTree(criado.body()).get("id").asLong();
				equipamentoCriado = enviar("GET", base + "/equipamentos/" + id, null, null).body();

				HttpResponse<String> cadastro = enviar("POST", base + "/auth/cadastro", null,
						"{\"nome\":\"Cliente\",\"email\":\"" + email + "\",\"senha\":\"" + senha + "\"}");
				assertThat(cadastro.statusCode()).isEqualTo(201);
			}

			try (ConfigurableApplicationContext app = iniciar(banco)) {
				String base = base(app);

				HttpResponse<String> equipamento = enviar("GET", base + "/equipamentos/" + id, null, null);
				assertThat(equipamento.statusCode()).isEqualTo(200);
				assertThat(equipamento.body()).isEqualTo(equipamentoCriado);

				HttpResponse<String> login = enviar("POST", base + "/auth/login", null,
						"{\"email\":\"" + email + "\",\"senha\":\"" + senha + "\"}");
				assertThat(login.statusCode()).isEqualTo(200);

				JsonNode packs = json.readTree(enviar("GET", base + "/packs", null, null).body());
				assertThat(packs.size()).isEqualTo(9);
			}
		}
	}

	private static ConfigurableApplicationContext iniciar(PostgreSQLContainer banco) {
		return SpringApplication.run(BackendApplication.class, "--server.port=0",
				"--spring.datasource.url=" + banco.getJdbcUrl(),
				"--spring.datasource.username=" + banco.getUsername(),
				"--spring.datasource.password=" + banco.getPassword(),
				"--spring.main.banner-mode=off");
	}

	private static String base(ConfigurableApplicationContext app) {
		return "http://127.0.0.1:" + app.getEnvironment().getProperty("local.server.port");
	}

	private HttpResponse<String> enviar(String metodo, String url, String autorizacao, String corpo) throws Exception {
		HttpRequest.Builder pedido = HttpRequest.newBuilder(URI.create(url))
				.method(metodo, corpo == null ? HttpRequest.BodyPublishers.noBody()
						: HttpRequest.BodyPublishers.ofString(corpo));
		if (corpo != null) {
			pedido.header("Content-Type", "application/json");
		}
		if (autorizacao != null) {
			pedido.header("Authorization", autorizacao);
		}
		return http.send(pedido.build(), HttpResponse.BodyHandlers.ofString());
	}
}
