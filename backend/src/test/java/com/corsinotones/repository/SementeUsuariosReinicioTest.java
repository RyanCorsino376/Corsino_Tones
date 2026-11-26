package com.corsinotones.repository;

import static org.assertj.core.api.Assertions.assertThat;

import com.corsinotones.BackendApplication;
import com.corsinotones.BancoIsolado;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.annotation.DirtiesContext;
import org.testcontainers.postgresql.PostgreSQLContainer;

// USR-05: a second start on a database that already has users seeds nothing and keeps what is stored.
@SpringBootTest
@Import(BancoIsolado.class)
@DirtiesContext
class SementeUsuariosReinicioTest {

	@Autowired
	private PostgreSQLContainer banco;
	@Autowired
	private JdbcTemplate jdbc;

	@Test
	void segundaInicializacaoNaoInsereNemSobrescreve() {
		jdbc.update("UPDATE usuario SET senha_hash = 'hash-mantido' WHERE email = 'ryan@exemplo.com'");
		long usuariosAntes = jdbc.queryForObject("SELECT count(*) FROM usuario", Long.class);

		try (ConfigurableApplicationContext segunda = new SpringApplicationBuilder(BackendApplication.class)
				.run("--server.port=0", "--spring.datasource.url=" + banco.getJdbcUrl(), "--spring.datasource.username=" + banco.getUsername(),
						"--spring.datasource.password=" + banco.getPassword())) {
			assertThat(segunda.isActive()).isTrue();
		}

		assertThat(jdbc.queryForObject("SELECT count(*) FROM usuario", Long.class)).isEqualTo(usuariosAntes);
		assertThat(jdbc.queryForObject("SELECT senha_hash FROM usuario WHERE email = 'ryan@exemplo.com'", String.class))
				.isEqualTo("hash-mantido");
	}
}
