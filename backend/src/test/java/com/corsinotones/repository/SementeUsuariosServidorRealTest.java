package com.corsinotones.repository;

import static org.assertj.core.api.Assertions.assertThat;

import com.corsinotones.BancoIsolado;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.annotation.DirtiesContext;

// SEED-01, SRV-02: with a real embedded server (as in `spring-boot:run`) the default seed still loads. The mock web
// environment of the other tests once hid a conversion failure of the old relative path into a Path; the default is now
// the classpath file semente/usuarios.json (etapa06-front-spring-loja, when mock/ was deleted).
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(BancoIsolado.class)
@DirtiesContext
class SementeUsuariosServidorRealTest {

	@Autowired
	private UsuarioRepository repositorio;

	@Test
	void caminhoRelativoPadraoCarregaOUsuarioDoMock() {
		assertThat(repositorio.buscarPorEmail("ryan@exemplo.com")).isPresent();
	}
}
