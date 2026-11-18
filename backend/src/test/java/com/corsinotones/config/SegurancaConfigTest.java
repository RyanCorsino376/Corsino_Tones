package com.corsinotones.config;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

// SRV-04: preflight answers for the two front-end origins and for no other.
@SpringBootTest
@AutoConfigureMockMvc
class SegurancaConfigTest {

	@Autowired
	private MockMvc mvc;

	private ResultActions preflight(String rota, String origem) throws Exception {
		return mvc.perform(options(rota)
				.header("Origin", origem)
				.header("Access-Control-Request-Method", "POST")
				.header("Access-Control-Request-Headers", "content-type"));
	}

	@Test
	void legadoPodeFazerPreflightDoCadastro() throws Exception {
		preflight("/auth/cadastro", "http://localhost:8080")
				.andExpect(status().isOk())
				.andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:8080"));
	}

	@Test
	void viteConsegueFazerPreflightDoLogin() throws Exception {
		preflight("/auth/login", "http://localhost:5173")
				.andExpect(status().isOk())
				.andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:5173"));
	}

	@Test
	void origemDesconhecidaERejeitada() throws Exception {
		preflight("/auth/cadastro", "http://evil.example")
				.andExpect(status().isForbidden())
				.andExpect(header().doesNotExist("Access-Control-Allow-Origin"));
	}

	@Test
	void outraPortaLocalTambemERejeitada() throws Exception {
		preflight("/auth/login", "http://localhost:3000")
				.andExpect(status().isForbidden())
				.andExpect(header().doesNotExist("Access-Control-Allow-Origin"));
	}
}
