package com.corsinotones.repository.jpa;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

import com.corsinotones.BancoIsolado;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.web.servlet.MockMvc;

// USR-07: two registrations of one e-mail at the same time give one 201 and one 409, decided by the unique constraint.
@SpringBootTest
@Import(BancoIsolado.class)
@AutoConfigureMockMvc
@DirtiesContext
class UsuarioRepositoryJpaConcorrenciaTest {

	@Autowired
	private MockMvc mvc;
	@Autowired
	private JdbcTemplate jdbc;

	// Test-only trigger: every insert waits 1 s, so both requests pass the e-mail pre-check before either row exists.
	@BeforeEach
	void atrasarInsercoes() {
		jdbc.execute("CREATE FUNCTION atrasar_insercao() RETURNS trigger AS $$"
				+ " BEGIN PERFORM pg_sleep(1); RETURN NEW; END $$ LANGUAGE plpgsql");
		jdbc.execute("CREATE TRIGGER atrasar_insercao BEFORE INSERT ON usuario"
				+ " FOR EACH ROW EXECUTE FUNCTION atrasar_insercao()");
	}

	@AfterEach
	void removerAtraso() {
		jdbc.execute("DROP TRIGGER atrasar_insercao ON usuario");
		jdbc.execute("DROP FUNCTION atrasar_insercao()");
	}

	private long ultimoIdSorteado() {
		return jdbc.queryForObject("SELECT last_value FROM usuario_id_seq", Long.class);
	}

	@Test
	void doisCadastrosSimultaneosDoMesmoEmailDao201E409() throws Exception {
		long idAntes = ultimoIdSorteado();
		ExecutorService pool = Executors.newFixedThreadPool(2);
		CountDownLatch largada = new CountDownLatch(1);
		try {
			List<Future<MockHttpServletResponse>> respostas = new ArrayList<>();
			for (String nome : new String[] {"Ana", "Bia"}) {
				respostas.add(pool.submit(() -> {
					largada.await();
					return mvc.perform(post("/auth/cadastro").contentType(MediaType.APPLICATION_JSON)
							.content("{\"nome\":\"" + nome + "\",\"email\":\"corrida@exemplo.com\",\"senha\":\"senha-longa-1\"}"))
							.andReturn().getResponse();
				}));
			}
			largada.countDown();

			List<Integer> status = new ArrayList<>();
			String corpoDoConflito = null;
			for (Future<MockHttpServletResponse> r : respostas) {
				MockHttpServletResponse resposta = r.get();
				status.add(resposta.getStatus());
				if (resposta.getStatus() == 409) {
					corpoDoConflito = resposta.getContentAsString(java.nio.charset.StandardCharsets.UTF_8);
				}
			}

			assertThat(status).containsExactlyInAnyOrder(201, 409);
			assertThat(corpoDoConflito).contains("\"mensagem\":\"Este e-mail já está cadastrado.\"");
			assertThat(jdbc.queryForObject("SELECT count(*) FROM usuario WHERE email = 'corrida@exemplo.com'",
					Long.class)).isEqualTo(1L);
			// Both requests reached the INSERT (each drew an id): the pre-check did not stop the second one.
			assertThat(ultimoIdSorteado()).isEqualTo(idAntes + 2);
		} finally {
			pool.shutdownNow();
		}
	}
}
