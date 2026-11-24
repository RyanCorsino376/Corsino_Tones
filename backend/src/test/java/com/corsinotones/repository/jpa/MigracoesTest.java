package com.corsinotones.repository.jpa;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

// DB-01, DB-02, DB-03, DB-07, PRS-12: the schema migration, run with Flyway's own API on an untouched database.
@Testcontainers
class MigracoesTest {

	@Container
	static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:16-alpine");

	private static Flyway flyway;

	@BeforeAll
	static void migrar() {
		flyway = Flyway.configure()
				.dataSource(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword())
				.load();
		flyway.migrate();
	}

	private static Connection conexao() throws SQLException {
		return DriverManager.getConnection(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword());
	}

	/** Every constraint of one kind ('f', 'u', 'c') as name -> "table: definition". */
	private static Map<String, String> restricoes(char tipo) throws SQLException {
		Map<String, String> encontradas = new HashMap<>();
		try (Connection c = conexao(); Statement s = c.createStatement();
				ResultSet r = s.executeQuery("SELECT con.conname, tab.relname, pg_get_constraintdef(con.oid)"
						+ " FROM pg_constraint con JOIN pg_class tab ON tab.oid = con.conrelid"
						+ " JOIN pg_namespace ns ON ns.oid = tab.relnamespace"
						+ " WHERE ns.nspname = 'public' AND con.contype = '" + tipo + "'")) {
			while (r.next()) {
				encontradas.put(r.getString(1), r.getString(2) + ": " + r.getString(3));
			}
		}
		return encontradas;
	}

	private static void executar(String sql) throws SQLException {
		try (Connection c = conexao(); Statement s = c.createStatement()) {
			s.execute(sql);
		}
	}

	@Test
	void criaAsSeisTabelas() throws SQLException {
		Set<String> tabelas = new HashSet<>();
		try (Connection c = conexao(); Statement s = c.createStatement();
				ResultSet r = s.executeQuery("SELECT table_name FROM information_schema.tables"
						+ " WHERE table_schema = 'public' AND table_type = 'BASE TABLE'")) {
			while (r.next()) {
				tabelas.add(r.getString(1));
			}
		}

		assertThat(tabelas).containsExactlyInAnyOrder("usuario", "equipamento", "pack", "preset", "pedido",
				"item_pedido", "flyway_schema_history");
	}

	@Test
	void declaraCadaChaveEstrangeiraComNomeEDestino() throws SQLException {
		Map<String, String> chaves = restricoes('f');

		assertThat(chaves).hasSize(5)
				.containsEntry("fk_pack_equipamento",
						"pack: FOREIGN KEY (equipamento_id) REFERENCES equipamento(id) ON DELETE RESTRICT")
				.containsEntry("fk_preset_pack", "preset: FOREIGN KEY (pack_id) REFERENCES pack(id) ON DELETE RESTRICT")
				.containsEntry("fk_pedido_usuario",
						"pedido: FOREIGN KEY (usuario_id) REFERENCES usuario(id) ON DELETE RESTRICT")
				.containsEntry("fk_item_pedido_pedido",
						"item_pedido: FOREIGN KEY (pedido_id) REFERENCES pedido(id) ON DELETE CASCADE")
				.containsEntry("fk_item_pedido_pack",
						"item_pedido: FOREIGN KEY (pack_id) REFERENCES pack(id) ON DELETE RESTRICT");
	}

	@Test
	void declaraAsRestricoesUnicas() throws SQLException {
		assertThat(restricoes('u')).hasSize(4)
				.containsEntry("uk_usuario_email", "usuario: UNIQUE (email)")
				.containsEntry("uk_equipamento_marca_modelo", "equipamento: UNIQUE (marca, modelo)")
				.containsEntry("uk_pack_estilo_equipamento", "pack: UNIQUE (estilo, equipamento_id)")
				.containsEntry("uk_item_pedido_pack", "item_pedido: UNIQUE (pedido_id, pack_id)");
	}

	@Test
	void declaraOsPrecosNaoNegativos() throws SQLException {
		Map<String, String> checagens = restricoes('c');

		assertThat(checagens).containsEntry("ck_pack_preco_centavos", "pack: CHECK ((preco_centavos >= 0))")
				.containsEntry("ck_item_pedido_preco_centavos", "item_pedido: CHECK ((preco_centavos >= 0))");
	}

	@Test
	void arquivoChaveDoPresetExisteEAceitaNulo() throws SQLException {
		try (Connection c = conexao(); Statement s = c.createStatement();
				ResultSet r = s.executeQuery("SELECT is_nullable FROM information_schema.columns"
						+ " WHERE table_name = 'preset' AND column_name = 'arquivo_chave'")) {
			assertThat(r.next()).as("column preset.arquivo_chave").isTrue();
			assertThat(r.getString(1)).isEqualTo("YES");
		}
	}

	@Test
	void precoNegativoERecusadoPeloBanco() throws SQLException {
		executar("INSERT INTO equipamento (marca, modelo) VALUES ('teste', 'Preco Negativo')");

		assertThatThrownBy(() -> executar("INSERT INTO pack (id, nome, estilo, descricao, preco_centavos, equipamento_id)"
				+ " SELECT 'teste-negativo', 'Teste', 'teste', '', -1, id FROM equipamento WHERE modelo = 'Preco Negativo'"))
				.isInstanceOf(SQLException.class)
				.hasMessageContaining("ck_pack_preco_centavos")
				.extracting(erro -> ((SQLException) erro).getSQLState()).isEqualTo("23514");
	}

	@Test
	void emailRepetidoERecusadoPeloBanco() throws SQLException {
		executar("INSERT INTO usuario (nome, email, senha_hash, perfil) VALUES ('Ana', 'repetido@x.com', 'h', 'COMUM')");

		assertThatThrownBy(() -> executar(
				"INSERT INTO usuario (nome, email, senha_hash, perfil) VALUES ('Bia', 'repetido@x.com', 'h', 'COMUM')"))
				.isInstanceOf(SQLException.class)
				.hasMessageContaining("uk_usuario_email")
				.extracting(erro -> ((SQLException) erro).getSQLState()).isEqualTo("23505");
	}

	@Test
	void segundaMigracaoNaoAplicaNada() {
		assertThat(flyway.migrate().migrationsExecuted).isZero();
	}
}
