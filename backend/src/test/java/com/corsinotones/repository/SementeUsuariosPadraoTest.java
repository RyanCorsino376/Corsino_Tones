package com.corsinotones.repository;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.corsinotones.BancoDeTeste;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

// SEED-02: with the default seed (../mock/db.seed.json) the mock's user already exists and ids continue from it.
@SpringBootTest
@Import(BancoDeTeste.class)
@AutoConfigureMockMvc
@DirtiesContext(classMode = DirtiesContext.ClassMode.BEFORE_CLASS)
class SementeUsuariosPadraoTest {

	@Autowired
	private MockMvc mvc;

	private ResultActions cadastrar(String email) throws Exception {
		return mvc.perform(post("/auth/cadastro").contentType(MediaType.APPLICATION_JSON)
				.content("{\"nome\":\"Novo\",\"email\":\"" + email + "\",\"senha\":\"senha-longa-1\"}"));
	}

	@Test
	void emailDoMockJaExisteEOProximoIdE2() throws Exception {
		cadastrar("ryan@exemplo.com")
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.mensagem").value("Este e-mail já está cadastrado."));

		cadastrar("novo@exemplo.com")
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.id").value(2));
	}
}
