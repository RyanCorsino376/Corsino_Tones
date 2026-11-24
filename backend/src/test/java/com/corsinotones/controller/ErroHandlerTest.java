package com.corsinotones.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.corsinotones.BancoDeTeste;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

// SRV-05, CAD-09, CAD-10, LOG-05, LOG-07: every error uses {status, mensagem, campos}.
@SpringBootTest
@Import(BancoDeTeste.class)
@AutoConfigureMockMvc
class ErroHandlerTest {

	@Autowired
	private MockMvc mvc;

	private org.springframework.test.web.servlet.ResultActions enviar(String rota, String corpo) throws Exception {
		return mvc.perform(post(rota).contentType(MediaType.APPLICATION_JSON).content(corpo));
	}

	@Test
	void validacaoDevolve400ComUmaEntradaPorCampo() throws Exception {
		enviar("/teste/validar", "{\"nome\":\"A\",\"senha\":null}")
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.status").value(400))
				.andExpect(jsonPath("$.campos.nome").value("nome curto"))
				.andExpect(jsonPath("$.campos.senha").value("senha ausente"));
	}

	@Test
	void jsonQuebradoDevolve400ComMensagemFixaECamposVazios() throws Exception {
		enviar("/teste/validar", "{nome:")
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.status").value(400))
				.andExpect(jsonPath("$.mensagem").value("Corpo da requisição inválido."))
				.andExpect(jsonPath("$.campos").isEmpty());
	}

	@Test
	void emailEmUsoDevolve409() throws Exception {
		enviar("/teste/email-em-uso", "{}")
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.status").value(409))
				.andExpect(jsonPath("$.mensagem").value("Este e-mail já está cadastrado."))
				.andExpect(jsonPath("$.campos").isEmpty());
	}

	@Test
	void credenciaisInvalidasDevolve401ComCamposVazios() throws Exception {
		enviar("/teste/credenciais", "{}")
				.andExpect(status().isUnauthorized())
				.andExpect(jsonPath("$.status").value(401))
				.andExpect(jsonPath("$.mensagem").value("E-mail ou senha incorretos."))
				.andExpect(jsonPath("$.campos").isEmpty());
	}

	@Test
	void erroInesperadoDevolve500SemVazarDetalhes() throws Exception {
		enviar("/teste/explode", "{}")
				.andExpect(status().isInternalServerError())
				.andExpect(jsonPath("$.status").value(500))
				.andExpect(jsonPath("$.mensagem").value("Erro interno do servidor."))
				.andExpect(jsonPath("$.campos").isEmpty())
				.andExpect(content().string(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("segredo"))))
				.andExpect(content().string(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("at com."))));
	}

	@Test
	void rotaDesconhecidaDevolve404() throws Exception {
		mvc.perform(get("/nao-existe"))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.status").value(404))
				.andExpect(jsonPath("$.mensagem").value("Rota não encontrada."))
				.andExpect(jsonPath("$.campos").isEmpty());
	}

	@Test
	void metodoErradoDevolve405() throws Exception {
		enviar("/teste/so-get", "{}")
				.andExpect(status().isMethodNotAllowed())
				.andExpect(jsonPath("$.status").value(405))
				.andExpect(jsonPath("$.mensagem").value("Método não permitido."))
				.andExpect(jsonPath("$.campos").isEmpty());
	}

	@Test
	void todoCorpoDeErroTemAsTresChaves() throws Exception {
		mvc.perform(get("/nao-existe"))
				.andExpect(jsonPath("$.status").exists())
				.andExpect(jsonPath("$.mensagem").exists())
				.andExpect(jsonPath("$.campos").exists());
	}
}
