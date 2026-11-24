package com.corsinotones.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.corsinotones.BancoDeTeste;
import com.corsinotones.model.Perfil;
import com.corsinotones.model.Usuario;
import com.corsinotones.service.TokenService;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

// ERR-01, ERR-02, ERR-03, ERR-09: who may call which route, and the preflight for the new methods and header.
@SpringBootTest
@Import(BancoDeTeste.class)
@AutoConfigureMockMvc
class SegurancaRotasTest {

	@Autowired
	private MockMvc mvc;
	@Autowired
	private TokenService tokens;
	@Autowired
	private JwtEncoder encoder;

	// The users need not exist: the routes only read the token.
	private String tokenAdmin() {
		return tokens.gerar(new Usuario(1, "Ryan", "ryan@exemplo.com", "hash", Perfil.ADMIN));
	}

	private String tokenComum() {
		return tokens.gerar(new Usuario(999, "Ana", "ana@exemplo.com", "hash", Perfil.COMUM));
	}

	// Signed with the real key, but it expired an hour ago (well past the decoder's clock skew).
	private String tokenExpirado() {
		Instant agora = Instant.now();
		JwtClaimsSet claims = JwtClaimsSet.builder().subject("1").claim("perfil", "ADMIN")
				.issuedAt(agora.minusSeconds(3 * 3600)).expiresAt(agora.minusSeconds(3600)).build();
		return encoder.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims))
				.getTokenValue();
	}

	private static MockHttpServletRequestBuilder comToken(MockHttpServletRequestBuilder pedido, String token) {
		return pedido.header("Authorization", "Bearer " + token);
	}

	// One write route per catalogue resource, each with a JSON body.
	private static List<MockHttpServletRequestBuilder> escritasDoCatalogo() {
		return List.of(
				delete("/packs/x"),
				post("/equipamentos").contentType(MediaType.APPLICATION_JSON).content("{}"),
				put("/packs/rock-boss-gt-1000").contentType(MediaType.APPLICATION_JSON).content("{}"),
				delete("/presets/1"));
	}

	private static void esperarSemLogin(ResultActions resposta) throws Exception {
		resposta.andExpect(status().isUnauthorized())
				.andExpect(jsonPath("$.status").value(401))
				.andExpect(jsonPath("$.mensagem").value("Faça login para continuar."))
				.andExpect(jsonPath("$.campos").isEmpty());
	}

	private static void naoBarradoPelaSeguranca(MvcResult resultado) {
		assertThat(resultado.getResponse().getStatus()).isNotIn(401, 403);
	}

	@Test
	void escritaDoCatalogoSemTokenDevolve401() throws Exception {
		for (MockHttpServletRequestBuilder pedido : escritasDoCatalogo()) {
			esperarSemLogin(mvc.perform(pedido));
		}
	}

	@Test
	void tokenMalformadoDevolve401() throws Exception {
		esperarSemLogin(mvc.perform(comToken(delete("/packs/x"), "nao-e-um-token")));
	}

	@Test
	void tokenExpiradoDevolve401() throws Exception {
		esperarSemLogin(mvc.perform(comToken(delete("/packs/x"), tokenExpirado())));
	}

	@Test
	void pedidosSemTokenDevolvem401() throws Exception {
		esperarSemLogin(mvc.perform(get("/pedidos")));
		esperarSemLogin(mvc.perform(post("/pedidos").contentType(MediaType.APPLICATION_JSON).content("{}")));
	}

	@Test
	void usuarioComumNaEscritaDoCatalogoDevolve403() throws Exception {
		String token = tokenComum();
		for (MockHttpServletRequestBuilder pedido : escritasDoCatalogo()) {
			mvc.perform(comToken(pedido, token))
					.andExpect(status().isForbidden())
					.andExpect(jsonPath("$.status").value(403))
					.andExpect(jsonPath("$.mensagem").value("Acesso restrito ao administrador."))
					.andExpect(jsonPath("$.campos").isEmpty());
		}
	}

	// The pack does not exist, so once past security the request ends in 404.
	@Test
	void adminPassaPelaSegurancaNaEscritaDoCatalogo() throws Exception {
		mvc.perform(comToken(delete("/packs/x"), tokenAdmin())).andExpect(status().isNotFound());
	}

	@Test
	void leituraDoCatalogoNaoExigeLogin() throws Exception {
		String token = tokenComum();
		for (String rota : new String[] {"/equipamentos", "/equipamentos/1", "/packs", "/packs/rock-boss-gt-1000",
				"/presets", "/presets/1"}) {
			mvc.perform(get(rota)).andDo(SegurancaRotasTest::naoBarradoPelaSeguranca);
			mvc.perform(comToken(get(rota), token)).andDo(SegurancaRotasTest::naoBarradoPelaSeguranca);
		}
	}

	@Test
	void autenticacaoContinuaPublica() throws Exception {
		mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON)
				.content("{\"email\":\"ryan@exemplo.com\",\"senha\":\"teste123\"}"))
				.andExpect(status().isOk());
	}

	private ResultActions preflight(String metodo, String origem) throws Exception {
		return mvc.perform(options("/packs/rock-boss-gt-1000")
				.header("Origin", origem)
				.header("Access-Control-Request-Method", metodo)
				.header("Access-Control-Request-Headers", "authorization,content-type"));
	}

	@Test
	void viteFazPreflightDeEscritaComAuthorization() throws Exception {
		for (String metodo : new String[] {"GET", "POST", "PUT", "DELETE"}) {
			preflight(metodo, "http://localhost:5173")
					.andExpect(status().isOk())
					.andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:5173"))
					.andExpect(header().string("Access-Control-Allow-Methods",
							org.hamcrest.Matchers.containsString(metodo)))
					.andExpect(header().string("Access-Control-Allow-Headers",
							org.hamcrest.Matchers.containsStringIgnoringCase("authorization")));
		}
	}

	@Test
	void legadoFazPreflightDePut() throws Exception {
		preflight("PUT", "http://localhost:8080")
				.andExpect(status().isOk())
				.andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:8080"));
	}

	@Test
	void origemDesconhecidaNaoFazPreflightDePut() throws Exception {
		preflight("PUT", "http://evil.example")
				.andExpect(status().isForbidden())
				.andExpect(header().doesNotExist("Access-Control-Allow-Origin"));
	}
}
