package com.corsinotones.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

// SRV-03, CAD-01, CAD-02, CAD-04 to CAD-10 through the real endpoint.
@SpringBootTest
@AutoConfigureMockMvc
@ExtendWith(OutputCaptureExtension.class)
class AuthControllerCadastroTest {

	private static final String MSG_NOME = "Informe um nome com 2 a 100 caracteres.";
	private static final String MSG_EMAIL = "Informe um e-mail válido, como nome@exemplo.com.";
	private static final String MSG_SENHA = "A senha precisa ter de 8 a 72 caracteres.";

	@Autowired
	private MockMvc mvc;

	private static String emailUnico() {
		return "u" + UUID.randomUUID().toString().replace("-", "") + "@exemplo.com";
	}

	private ResultActions cadastrar(String json) throws Exception {
		return mvc.perform(post("/auth/cadastro").contentType(MediaType.APPLICATION_JSON).content(json));
	}

	private static String corpo(String nome, String email, String senha) {
		return "{\"nome\":" + aspas(nome) + ",\"email\":" + aspas(email) + ",\"senha\":" + aspas(senha) + "}";
	}

	private static String aspas(String valor) {
		return valor == null ? "null" : "\"" + valor + "\"";
	}

	@Test
	void cadastroValidoDevolve201ComIdNomeEEmailApenas() throws Exception {
		String email = emailUnico();
		cadastrar(corpo("  Ana Souza ", "  " + email.toUpperCase() + " ", "senha-longa-1"))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.id").isNumber())
				.andExpect(jsonPath("$.nome").value("Ana Souza"))
				.andExpect(jsonPath("$.email").value(email))
				.andExpect(jsonPath("$.*", hasSize(3)))
				.andExpect(content().string(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("senha"))))
				.andExpect(content().string(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("$2"))));
	}

	@Test
	void nomeInvalidoDevolve400ComCampoNome() throws Exception {
		cadastrar(corpo("A", emailUnico(), "senha-longa-1"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.campos.nome").value(MSG_NOME))
				.andExpect(jsonPath("$.campos.email").doesNotExist());
	}

	@Test
	void emailInvalidoDevolve400ComCampoEmail() throws Exception {
		cadastrar(corpo("Ana", "a@b", "senha-longa-1"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.campos.email").value(MSG_EMAIL))
				.andExpect(jsonPath("$.campos.nome").doesNotExist());
	}

	@Test
	void senhaCurtaDevolve400ComCampoSenha() throws Exception {
		cadastrar(corpo("Ana", emailUnico(), "1234567"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.campos.senha").value(MSG_SENHA))
				.andExpect(jsonPath("$.campos.nome").doesNotExist());
	}

	@Test
	void todosInvalidosListamOsTresCamposNumaSoResposta() throws Exception {
		cadastrar(corpo("A", "ruim", "curta"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.campos.nome").value(MSG_NOME))
				.andExpect(jsonPath("$.campos.email").value(MSG_EMAIL))
				.andExpect(jsonPath("$.campos.senha").value(MSG_SENHA));
	}

	@Test
	void campoAusenteOuNuloEInvalidoComAMensagemDaRegra() throws Exception {
		cadastrar("{}")
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.campos.nome").value(MSG_NOME))
				.andExpect(jsonPath("$.campos.email").value(MSG_EMAIL))
				.andExpect(jsonPath("$.campos.senha").value(MSG_SENHA));
		cadastrar(corpo(null, null, null))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.campos.nome").value(MSG_NOME))
				.andExpect(jsonPath("$.campos.email").value(MSG_EMAIL))
				.andExpect(jsonPath("$.campos.senha").value(MSG_SENHA));
	}

	@Test
	void jsonQuebradoDevolve400() throws Exception {
		cadastrar("{nome:")
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.mensagem").value("Corpo da requisição inválido."))
				.andExpect(jsonPath("$.campos").isEmpty());
	}

	@Test
	void emailRepetidoEmOutraCaixaDevolve409() throws Exception {
		String email = emailUnico();
		cadastrar(corpo("Ana", email, "senha-longa-1")).andExpect(status().isCreated());

		cadastrar(corpo("Outra", " " + email.toUpperCase() + " ", "senha-longa-2"))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.mensagem").value("Este e-mail já está cadastrado."))
				.andExpect(jsonPath("$.campos").isEmpty());
	}

	@Test
	void logsNaoContemASenhaNemOHash(CapturedOutput saida) throws Exception {
		cadastrar(corpo("Ana", emailUnico(), "senha-secreta-987")).andExpect(status().isCreated());

		assertThat(saida.getAll()).doesNotContain("senha-secreta-987").doesNotContain("$2a$").doesNotContain("$2b$");
	}

	// SRV-03: the five layer packages exist and the controller never reaches the repository.
	@Test
	void controllerDependeSoDoServico() throws Exception {
		for (String camada : new String[] {"controller", "service", "repository", "model", "dto"}) {
			assertThat(Package.getPackage("com.corsinotones." + camada)).as(camada).isNotNull();
		}
		Class<?> controller = AuthController.class;
		for (Class<?> tipo : controller.getConstructors()[0].getParameterTypes()) {
			assertThat(tipo.getPackageName()).isNotEqualTo("com.corsinotones.repository");
		}
		for (var campo : controller.getDeclaredFields()) {
			assertThat(campo.getType().getPackageName()).isNotEqualTo("com.corsinotones.repository");
		}
	}
}
