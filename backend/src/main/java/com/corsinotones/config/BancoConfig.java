package com.corsinotones.config;

import org.flywaydb.core.api.FlywayException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.flyway.autoconfigure.FlywayMigrationStrategy;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Startup checks of the database connection (DB-09). The errors name the JDBC URL, never the password.
 * The migration strategy is what Flyway runs first, so the password check happens before any connection.
 */
@Configuration
public class BancoConfig {

	private final String url;

	public BancoConfig(@Value("${spring.datasource.url:}") String url,
			@Value("${spring.datasource.password:}") String senha) {
		if (senha == null || senha.isBlank()) {
			throw new IllegalStateException("CORSINO_DB_PASSWORD must be set (database connection " + url + ").");
		}
		this.url = url;
	}

	// The driver's own message names only host and port; this one adds the full connection.
	@Bean
	FlywayMigrationStrategy migracaoNomeandoAConexao() {
		return flyway -> {
			try {
				flyway.migrate();
			} catch (FlywayException erro) {
				throw new IllegalStateException("Database migration failed (database connection " + url + ").", erro);
			}
		};
	}
}
