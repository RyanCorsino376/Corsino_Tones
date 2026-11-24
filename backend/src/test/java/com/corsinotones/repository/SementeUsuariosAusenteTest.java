package com.corsinotones.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.corsinotones.BancoDeTeste;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

// SEED-03: a missing seed file starts the app with no users and logs a warning.
@SpringBootTest(properties = "corsino.seed.arquivo=nao-existe/semente.json")
@Import(BancoDeTeste.class)
@AutoConfigureMockMvc
@ExtendWith(OutputCaptureExtension.class)
class SementeUsuariosAusenteTest {

	@Autowired
	private MockMvc mvc;

	@Test
	void semArquivoNaoHaUsuariosEOPrimeiroIdE1(CapturedOutput saida) throws Exception {
		mvc.perform(post("/auth/cadastro").contentType(MediaType.APPLICATION_JSON)
				.content("{\"nome\":\"Ana\",\"email\":\"ana@exemplo.com\",\"senha\":\"senha-longa-1\"}"))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.id").value(1));

		assertThat(saida.getAll()).contains("WARN").contains("nao-existe/semente.json");
	}
}
