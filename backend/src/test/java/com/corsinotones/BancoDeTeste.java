package com.corsinotones;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.test.context.DynamicPropertyRegistrar;
import org.testcontainers.postgresql.PostgreSQLContainer;

/**
 * One PostgreSQL container for the whole test JVM, shared by every Spring context that imports this class.
 * Tests that write use unique names or e-mails and never assert totals.
 */
// SPEC_DEVIATION: design.md exposes this container through @ServiceConnection; it is wired with a DynamicPropertyRegistrar.
// Reason: Spring Boot closes a @ServiceConnection container bean together with its context, so the first closed
// context (@DirtiesContext, cache eviction) would stop the container that every other cached context still uses.
@TestConfiguration(proxyBeanMethods = false)
public class BancoDeTeste {

	static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:16-alpine");

	static {
		// Never stopped here: Testcontainers removes it when the JVM exits.
		POSTGRES.start();
	}

	@Bean
	DynamicPropertyRegistrar bancoCompartilhado() {
		return registro -> {
			registro.add("spring.datasource.url", POSTGRES::getJdbcUrl);
			registro.add("spring.datasource.username", POSTGRES::getUsername);
			registro.add("spring.datasource.password", POSTGRES::getPassword);
		};
	}
}
