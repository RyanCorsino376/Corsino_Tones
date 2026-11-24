package com.corsinotones.repository.jpa;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.corsinotones.BancoDeTeste;
import com.corsinotones.repository.UsuarioRepository;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.ApplicationContext;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

// USR-03, USR-08: users are stored by the JPA adapter, and registration always stores the COMUM profile.
@SpringBootTest
@Import(BancoDeTeste.class)
@AutoConfigureMockMvc
class UsuarioRepositoryJpaTest {

	@Autowired
	private MockMvc mvc;
	@Autowired
	private JdbcTemplate jdbc;
	@Autowired
	private ApplicationContext contexto;

	@Test
	void cadastroGuardaPerfilComum() throws Exception {
		String email = "p" + UUID.randomUUID().toString().replace("-", "") + "@exemplo.com";
		mvc.perform(post("/auth/cadastro").contentType(MediaType.APPLICATION_JSON)
				.content("{\"nome\":\"Ana\",\"email\":\"" + email + "\",\"senha\":\"senha-longa-1\"}"))
				.andExpect(status().isCreated());

		assertThat(jdbc.queryForObject("SELECT perfil FROM usuario WHERE email = ?", String.class, email))
				.isEqualTo("COMUM");
	}

	@Test
	void oUnicoRepositorioDeUsuariosEODoBanco() {
		assertThat(contexto.getBeansOfType(UsuarioRepository.class).values())
				.singleElement()
				.isInstanceOf(UsuarioRepositoryJpa.class);
	}
}
