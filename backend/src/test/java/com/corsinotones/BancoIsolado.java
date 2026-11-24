package com.corsinotones;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Bean;
import org.testcontainers.postgresql.PostgreSQLContainer;

/**
 * A fresh PostgreSQL container for each Spring context that imports this class, stopped when the context closes.
 * For tests that need an empty or freshly migrated database (seed, ids, restart, database down).
 */
@TestConfiguration(proxyBeanMethods = false)
public class BancoIsolado {

	@Bean
	@ServiceConnection
	PostgreSQLContainer bancoIsolado() {
		return new PostgreSQLContainer("postgres:16-alpine");
	}
}
