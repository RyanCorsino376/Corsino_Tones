package com.corsinotones.controller;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.containsStringIgnoringCase;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.corsinotones.BancoIsolado;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.postgresql.PostgreSQLContainer;

// ERR-06: the database goes down while the app runs; the API answers 503 without SQL or a stack trace.
// A short connection timeout keeps the pool from waiting 30 seconds for the stopped database.
@SpringBootTest(properties = "spring.datasource.hikari.connection-timeout=2000")
@Import(BancoIsolado.class)
@AutoConfigureMockMvc
@DirtiesContext
class ErroHandlerBancoForaTest {

	@Autowired
	private MockMvc mvc;
	@Autowired
	private PostgreSQLContainer banco;

	@Test
	void bancoParadoDevolve503SemDetalhes() throws Exception {
		mvc.perform(get("/teste/usuarios")).andExpect(status().isOk());

		banco.stop();

		mvc.perform(get("/teste/usuarios"))
				.andExpect(status().isServiceUnavailable())
				.andExpect(jsonPath("$.status").value(503))
				.andExpect(jsonPath("$.mensagem").value("Serviço temporariamente indisponível. Tente novamente."))
				.andExpect(jsonPath("$.campos").isEmpty())
				.andExpect(content().string(not(containsString("SQL"))))
				.andExpect(content().string(not(containsStringIgnoringCase("jdbc"))))
				.andExpect(content().string(not(containsString("Exception"))));
	}
}
