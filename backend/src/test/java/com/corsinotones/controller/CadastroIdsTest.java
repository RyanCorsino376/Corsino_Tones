package com.corsinotones.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.corsinotones.BancoIsolado;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

// USR-02 (replaces CAD-11): the database assigns ids; on the default seed (user 1) the next users get 2 and 3.
@SpringBootTest
@Import(BancoIsolado.class)
@AutoConfigureMockMvc
@DirtiesContext
class CadastroIdsTest {

	@Autowired
	private MockMvc mvc;

	private ResultActions cadastrar(String email) throws Exception {
		return mvc.perform(post("/auth/cadastro").contentType(MediaType.APPLICATION_JSON)
				.content("{\"nome\":\"Novo\",\"email\":\"" + email + "\",\"senha\":\"senha-longa-1\"}"));
	}

	@Test
	void primeiroCadastroRecebeId2EOSeguinte3() throws Exception {
		cadastrar("segundo@exemplo.com").andExpect(status().isCreated()).andExpect(jsonPath("$.id").value(2));
		cadastrar("terceiro@exemplo.com").andExpect(status().isCreated()).andExpect(jsonPath("$.id").value(3));
	}
}
