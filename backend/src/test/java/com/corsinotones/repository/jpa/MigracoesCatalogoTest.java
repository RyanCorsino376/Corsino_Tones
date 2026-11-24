package com.corsinotones.repository.jpa;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

// DB-01, DB-04, DB-05, DB-07: V2 loads exactly the catalogue of mock/db.seed.json, once.
@Testcontainers
class MigracoesCatalogoTest {

	@Container
	static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:16-alpine");

	private static Flyway flyway;
	private static JsonNode semente;

	@BeforeAll
	static void migrar() throws IOException {
		flyway = Flyway.configure()
				.dataSource(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword())
				.load();
		flyway.migrate();
		semente = JsonMapper.builder().build().readTree(Files.readAllBytes(Path.of("../mock/db.seed.json")));
	}

	/** Each row of the query as a map column -> value (text), in query order. */
	private static List<Map<String, String>> linhas(String sql) throws SQLException {
		List<Map<String, String>> resultado = new ArrayList<>();
		try (Connection c = DriverManager.getConnection(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(),
				POSTGRES.getPassword()); Statement s = c.createStatement(); ResultSet r = s.executeQuery(sql)) {
			while (r.next()) {
				Map<String, String> linha = new LinkedHashMap<>();
				for (int i = 1; i <= r.getMetaData().getColumnCount(); i++) {
					linha.put(r.getMetaData().getColumnLabel(i), r.getString(i));
				}
				resultado.add(linha);
			}
		}
		return resultado;
	}

	private static long contar(String tabela) throws SQLException {
		return Long.parseLong(linhas("SELECT count(*) AS n FROM " + tabela).get(0).get("n"));
	}

	@Test
	void temQuatroEquipamentosNovePacksEVinteEUmPresets() throws SQLException {
		assertThat(contar("equipamento")).isEqualTo(4);
		assertThat(contar("pack")).isEqualTo(9);
		assertThat(contar("preset")).isEqualTo(21);
	}

	@Test
	void equipamentosSaoOsDaSemente() throws SQLException {
		assertThat(linhas("SELECT marca, modelo FROM equipamento")).containsExactlyInAnyOrder(
				Map.of("marca", "boss", "modelo", "GT-1000"), Map.of("marca", "zoom", "modelo", "G6"),
				Map.of("marca", "nux", "modelo", "MG-30"), Map.of("marca", "line6", "modelo", "HX Stomp"));
	}

	@Test
	void cadaPackTemOsValoresDaSemente() throws SQLException {
		List<Map<String, String>> esperados = new ArrayList<>();
		for (JsonNode p : semente.path("packs")) {
			Map<String, String> pack = new LinkedHashMap<>();
			pack.put("id", p.path("id").asString());
			pack.put("nome", p.path("nome").asString());
			pack.put("estilo", p.path("estilo").asString());
			pack.put("marca", p.path("marca").asString());
			pack.put("equipamento", p.path("equipamento").asString());
			pack.put("descricao", p.path("descricao").asString());
			pack.put("preco_centavos", String.valueOf(p.path("precoCentavos").asInt()));
			esperados.add(pack);
		}

		assertThat(esperados).hasSize(9);
		assertThat(linhas("SELECT p.id, p.nome, p.estilo, e.marca, e.modelo AS equipamento, p.descricao,"
				+ " p.preco_centavos FROM pack p JOIN equipamento e ON e.id = p.equipamento_id"))
				.containsExactlyInAnyOrderElementsOf(esperados);
	}

	@Test
	void cadaPresetTemOsValoresDaSementeEAsChavesOriginais() throws SQLException {
		List<Map<String, String>> esperados = new ArrayList<>();
		for (JsonNode p : semente.path("presets")) {
			Map<String, String> preset = new LinkedHashMap<>();
			preset.put("id", String.valueOf(p.path("id").asLong()));
			preset.put("nome", p.path("nome").asString());
			preset.put("estilo", p.path("estilo").asString());
			preset.put("marca", p.path("marca").asString());
			preset.put("equipamento", p.path("equipamento").asString());
			preset.put("data", p.path("data").asString());
			preset.put("descricao", p.path("descricao").asString());
			preset.put("pack_id", p.path("packId").asString());
			preset.put("arquivo_chave", null);
			esperados.add(preset);
		}

		assertThat(esperados).hasSize(21);
		assertThat(linhas("SELECT s.id, s.nome, p.estilo, e.marca, e.modelo AS equipamento,"
				+ " to_char(s.data_publicacao, 'YYYY-MM-DD') AS data, s.descricao, s.pack_id, s.arquivo_chave"
				+ " FROM preset s JOIN pack p ON p.id = s.pack_id JOIN equipamento e ON e.id = p.equipamento_id"))
				.containsExactlyInAnyOrderElementsOf(esperados);
	}

	@Test
	void historicoTemV1EV2() throws SQLException {
		assertThat(linhas("SELECT version, success FROM flyway_schema_history ORDER BY installed_rank"))
				.containsExactly(Map.of("version", "1", "success", "t"), Map.of("version", "2", "success", "t"));
	}

	@Test
	// Rolled back so the other tests still see exactly the 21 seeded presets (the identity stays used).
	void presetCriadoDepoisDaV2RecebeId22() throws SQLException {
		try (Connection c = DriverManager.getConnection(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(),
				POSTGRES.getPassword()); Statement s = c.createStatement()) {
			c.setAutoCommit(false);
			try (ResultSet r = s.executeQuery("INSERT INTO preset (nome, descricao, data_publicacao, pack_id)"
					+ " VALUES ('Novo', '', DATE '2026-11-24', 'rock-zoom-g6') RETURNING id")) {
				r.next();
				assertThat(r.getLong(1)).isEqualTo(22L);
			} finally {
				c.rollback();
			}
		}
	}

	@Test
	void segundaMigracaoNaoDuplicaOCatalogo() throws SQLException {
		assertThat(flyway.migrate().migrationsExecuted).isZero();
		assertThat(contar("pack")).isEqualTo(9);
	}
}
