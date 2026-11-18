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
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;

// LOG-01 to LOG-08 through the real endpoints, with a real token decoder.
@SpringBootTest
@AutoConfigureMockMvc
@ExtendWith(OutputCaptureExtension.class)
class AuthControllerLoginTest {

	@Autowired
	private MockMvc mvc;
	@Autowired
	private JwtDecoder decoder;

	private static String emailUnico() {
		return "l" + UUID.randomUUID().toString().replace("-", "") + "@exemplo.com";
	}

	private ResultActions enviar(String rota, String json) throws Exception {
		return mvc.perform(post(rota).contentType(MediaType.APPLICATION_JSON).content(json));
	}

	private ResultActions login(String email, String senha) throws Exception {
		return enviar("/auth/login", "{\"email\":\"" + email + "\",\"senha\":\"" + senha + "\"}");
	}

	private void cadastrar(String email, String senha) throws Exception {
		enviar("/auth/cadastro", "{\"nome\":\"Ana\",\"email\":\"" + email + "\",\"senha\":\"" + senha + "\"}")
				.andExpect(status().isCreated());
	}

	@Test
	void cadastroSeguidoDeLoginDevolveTokenDoMesmoUsuario() throws Exception {
		String email = emailUnico();
		cadastrar(email, "senha-longa-1");

		MvcResult resultado = login("  " + email.toUpperCase() + " ", "senha-longa-1")
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.token").isString())
				.andExpect(jsonPath("$.usuario.nome").value("Ana"))
				.andExpect(jsonPath("$.usuario.email").value(email))
				.andExpect(jsonPath("$.usuario.*", hasSize(3)))
				.andExpect(jsonPath("$.*", hasSize(2)))
				.andReturn();

		String corpo = resultado.getResponse().getContentAsString();
		String token = corpo.replaceAll(".*\"token\":\"([^\"]+)\".*", "$1");
		Jwt jwt = decoder.decode(token);
		assertThat(jwt.<String>getClaim("email")).isEqualTo(email);
		assertThat(jwt.getSubject()).matches("\\d+");
	}

	@Test
	void usuarioDoMockEntraComSenhaDoSeed() throws Exception {
		login("ryan@exemplo.com", "teste123")
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.usuario.id").value(1))
				.andExpect(jsonPath("$.usuario.nome").value("Ryan Corsino"));
	}

	@Test
	void senhaErradaEEmailDesconhecidoDevolvem401Identicos() throws Exception {
		String email = emailUnico();
		cadastrar(email, "senha-longa-1");

		String senhaErrada = login(email, "senha-errada-9").andExpect(status().isUnauthorized())
				.andReturn().getResponse().getContentAsString();
		String emailDesconhecido = login(emailUnico(), "senha-errada-9").andExpect(status().isUnauthorized())
				.andReturn().getResponse().getContentAsString();

		assertThat(senhaErrada).isEqualTo(emailDesconhecido);
		login(email, "senha-errada-9")
				.andExpect(jsonPath("$.status").value(401))
				.andExpect(jsonPath("$.mensagem").value("E-mail ou senha incorretos."))
				.andExpect(jsonPath("$.campos").isEmpty());
	}

	@Test
	void camposVaziosDevolvem400ComAsDuasMensagens() throws Exception {
		login("", "")
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.campos.email").value("Informe um e-mail válido, como nome@exemplo.com."))
				.andExpect(jsonPath("$.campos.senha").value("Informe sua senha."));
	}

	@Test
	void camposAusentesSeComportamComoVazios() throws Exception {
		enviar("/auth/login", "{}")
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.campos.email").value("Informe um e-mail válido, como nome@exemplo.com."))
				.andExpect(jsonPath("$.campos.senha").value("Informe sua senha."));
	}

	@Test
	void jsonQuebradoDevolve400() throws Exception {
		enviar("/auth/login", "{email:")
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.mensagem").value("Corpo da requisição inválido."))
				.andExpect(jsonPath("$.campos").isEmpty());
	}

	@Test
	void respostaELogsNaoContemSenhaNemHash(CapturedOutput saida) throws Exception {
		String email = emailUnico();
		cadastrar(email, "senha-secreta-654");

		login(email, "senha-secreta-654")
				.andExpect(status().isOk())
				.andExpect(content().string(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("senha-secreta-654"))))
				.andExpect(content().string(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("$2"))));
		login(email, "errada-errada").andExpect(status().isUnauthorized());

		assertThat(saida.getAll()).doesNotContain("senha-secreta-654").doesNotContain("errada-errada")
				.doesNotContain("$2a$").doesNotContain("$2b$");
	}
}
