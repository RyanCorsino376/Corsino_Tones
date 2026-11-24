package com.corsinotones;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.core.env.Environment;

// SRV-01, SRV-02: the context starts and the server is configured for port 8081.
@SpringBootTest
@Import(BancoDeTeste.class)
class BackendApplicationTest {

	@Autowired
	private Environment environment;

	@Test
	void contextLoadsOnPort8081() {
		assertThat(environment.getProperty("server.port")).isEqualTo("8081");
	}

	// DB-08: Hibernate only validates the schema that Flyway created; it never creates or alters tables.
	@Test
	void hibernateSoValidaOEsquema() {
		assertThat(environment.getProperty("spring.jpa.hibernate.ddl-auto")).isEqualTo("validate");
	}
}
