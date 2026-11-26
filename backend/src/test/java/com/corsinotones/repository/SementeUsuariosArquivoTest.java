package com.corsinotones.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.corsinotones.BancoIsolado;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;

// SEED-01, SEED-04: a seed file with ids 3 and 7 loads hashed and is never written to.
@SpringBootTest
@Import(BancoIsolado.class)
@DirtiesContext
@AutoConfigureMockMvc
class SementeUsuariosArquivoTest {

	private static final long DATA_FIXA = 1_000_000_000_000L;
	private static Path semente;
	private static byte[] bytesOriginais;

	@DynamicPropertySource
	static void propriedades(DynamicPropertyRegistry registro) throws IOException {
		semente = Files.createTempFile("semente", ".json");
		Files.copy(Path.of("src/test/resources/seed/dois-usuarios.json"), semente,
				java.nio.file.StandardCopyOption.REPLACE_EXISTING);
		semente.toFile().setLastModified(DATA_FIXA);
		bytesOriginais = Files.readAllBytes(semente);
		registro.add("corsino.seed.arquivo", semente::toString);
	}

	@Autowired
	private MockMvc mvc;
	@Autowired
	private UsuarioRepository repositorio;
	@Autowired
	private PasswordEncoder encoder;

	@Test
	void carregaOsDoisUsuariosComSenhaEmHash() {
		var carla = repositorio.buscarPorEmail("carla@exemplo.com").orElseThrow();
		var davi = repositorio.buscarPorEmail("davi@exemplo.com").orElseThrow();

		assertThat(carla.id()).isEqualTo(3L);
		assertThat(carla.nome()).isEqualTo("Carla");
		assertThat(davi.id()).isEqualTo(7L);
		assertThat(carla.senhaHash()).isNotEqualTo("senha-da-carla");
		assertThat(encoder.matches("senha-da-carla", carla.senhaHash())).isTrue();
		assertThat(encoder.matches("senha-do-davi", davi.senhaHash())).isTrue();
	}

	@Test
	void proximoCadastroRecebeId8ENadaEEscritoNoArquivo() throws Exception {
		mvc.perform(post("/auth/cadastro").contentType(MediaType.APPLICATION_JSON)
				.content("{\"nome\":\"Eva\",\"email\":\"eva@exemplo.com\",\"senha\":\"senha-longa-1\"}"))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.id").value(8));

		assertThat(Files.readAllBytes(semente)).isEqualTo(bytesOriginais);
		assertThat(semente.toFile().lastModified()).isEqualTo(DATA_FIXA);
	}
}
