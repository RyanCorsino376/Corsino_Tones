package com.corsinotones.repository;

import static org.assertj.core.api.Assertions.assertThat;

import com.corsinotones.BancoDeTeste;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;

// SEED-01, SRV-02: with a real embedded server (as in `spring-boot:run`) the default relative seed path still loads.
// The mock web environment of the other tests hid a conversion failure of "../mock/db.seed.json" into a Path.
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(BancoDeTeste.class)
class SementeUsuariosServidorRealTest {

	@Autowired
	private UsuarioRepository repositorio;

	@Test
	void caminhoRelativoPadraoCarregaOUsuarioDoMock() {
		assertThat(repositorio.buscarPorEmail("ryan@exemplo.com")).isPresent();
	}
}
