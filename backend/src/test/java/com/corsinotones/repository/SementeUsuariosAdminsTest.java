package com.corsinotones.repository;

import static org.assertj.core.api.Assertions.assertThat;

import com.corsinotones.BancoIsolado;
import com.corsinotones.model.Perfil;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.annotation.DirtiesContext;

// USR-04: only the seeded e-mails listed in corsino.seed.admins become ADMIN; ryan is COMUM when he is not listed.
@SpringBootTest(properties = {"corsino.seed.arquivo=src/test/resources/seed/tres-usuarios.json",
		"corsino.seed.admins=davi@exemplo.com"})
@Import(BancoIsolado.class)
@DirtiesContext
class SementeUsuariosAdminsTest {

	@Autowired
	private UsuarioRepository repositorio;

	private Perfil perfilDe(String email) {
		return repositorio.buscarPorEmail(email).orElseThrow().perfil();
	}

	@Test
	void soOEmailListadoEAdmin() {
		assertThat(perfilDe("davi@exemplo.com")).isEqualTo(Perfil.ADMIN);
		assertThat(perfilDe("carla@exemplo.com")).isEqualTo(Perfil.COMUM);
		assertThat(perfilDe("ryan@exemplo.com")).isEqualTo(Perfil.COMUM);
	}
}
