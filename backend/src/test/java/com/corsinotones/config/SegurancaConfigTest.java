package com.corsinotones.config;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.corsinotones.BancoDeTeste;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

// SRV-04: preflight answers for the two front-end origins and for no other.
@SpringBootTest
@Import(BancoDeTeste.class)
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
		preflight("/auth/login", "http://localhost:4200")
				.andExpect(status().isForbidden())
				.andExpect(header().doesNotExist("Access-Control-Allow-Origin"));
	}

	// WEB-13: the front end also runs on 127.0.0.1 (Playwright and the dev server), a different origin from localhost.
	@Test
	void legadoEm127PodeFazerPreflightDosDoisEndpoints() throws Exception {
		for (String rota : new String[] {"/auth/cadastro", "/auth/login"}) {
			preflight(rota, "http://127.0.0.1:8080")
					.andExpect(status().isOk())
					.andExpect(header().string("Access-Control-Allow-Origin", "http://127.0.0.1:8080"));
		}
	}

	@Test
	void viteEm127PodeFazerPreflightDosDoisEndpoints() throws Exception {
		for (String rota : new String[] {"/auth/cadastro", "/auth/login"}) {
			preflight(rota, "http://127.0.0.1:5173")
					.andExpect(status().isOk())
					.andExpect(header().string("Access-Control-Allow-Origin", "http://127.0.0.1:5173"));
		}
	}

	@Test
	void outraPortaEm127ERejeitada() throws Exception {
		preflight("/auth/login", "http://127.0.0.1:4200")
				.andExpect(status().isForbidden())
				.andExpect(header().doesNotExist("Access-Control-Allow-Origin"));
	}

	// MOCK-05 (etapa06-front-spring-loja): with Spring as the only API, the site's two origins still reach the order
	// routes with the Authorization header the session token travels in.
	@Test
	void site8080FazPreflightDePedidosComAuthorization() throws Exception {
		for (String origem : new String[] {"http://127.0.0.1:8080", "http://localhost:8080"}) {
			mvc.perform(options("/pedidos")
					.header("Origin", origem)
					.header("Access-Control-Request-Method", "POST")
					.header("Access-Control-Request-Headers", "authorization, content-type"))
					.andExpect(status().isOk())
					.andExpect(header().string("Access-Control-Allow-Origin", origem))
					.andExpect(header().string("Access-Control-Allow-Headers",
							org.hamcrest.Matchers.containsStringIgnoringCase("authorization")));
		}
	}
}
