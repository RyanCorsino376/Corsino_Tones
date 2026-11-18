package com.corsinotones.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.corsinotones.dto.CadastroRequest;
import com.corsinotones.model.Usuario;
import com.corsinotones.repository.UsuarioRepositoryEmMemoria;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

class AuthServiceTest {

	private final PasswordEncoder encoder = new BCryptPasswordEncoder();
	private final UsuarioRepositoryEmMemoria repositorio = new UsuarioRepositoryEmMemoria();
	private final AuthService servico = new AuthService(repositorio, encoder);

	// CAD-01, CAD-03: e-mail is lower-cased and the password is stored only as a matching BCrypt hash.
	@Test
	void cadastrarNormalizaEmailEGuardaApenasOHash() {
		Usuario criado = servico.cadastrar(new CadastroRequest("Ana", "ANA@Exemplo.com", "senha-longa-1"));

		assertThat(criado.email()).isEqualTo("ana@exemplo.com");
		assertThat(criado.senhaHash()).isNotEqualTo("senha-longa-1");
		assertThat(encoder.matches("senha-longa-1", criado.senhaHash())).isTrue();
		assertThat(repositorio.buscarPorEmail("ana@exemplo.com")).contains(criado);
	}

	// CAD-10: same e-mail in another case and with spaces collides; nothing new is stored.
	@Test
	void emailRepetidoEmOutraCaixaLancaEmailEmUsoEMantemUmUsuario() {
		servico.cadastrar(new CadastroRequest("Ryan", "ryan@exemplo.com", "senha-longa-1"));

		assertThatThrownBy(() -> servico.cadastrar(new CadastroRequest("Outro", "  RYAN@exemplo.com ", "outra-senha-2")))
				.isInstanceOf(EmailEmUso.class)
				.hasMessage("Este e-mail já está cadastrado.");
		assertThat(repositorio.buscarPorEmail("ryan@exemplo.com").orElseThrow().nome()).isEqualTo("Ryan");
	}

	// CAD-11: consecutive registrations get consecutive ids.
	@Test
	void cadastrosSeguidosRecebemIdsConsecutivos() {
		Usuario primeiro = servico.cadastrar(new CadastroRequest("Ana", "ana@x.com", "senha-longa-1"));
		Usuario segundo = servico.cadastrar(new CadastroRequest("Bia", "bia@x.com", "senha-longa-1"));

		assertThat(segundo.id()).isEqualTo(primeiro.id() + 1);
	}

	// CAD-12: 20 simultaneous registrations of one e-mail -> one user, 19 EmailEmUso.
	@Test
	void vinteCadastrosSimultaneosDoMesmoEmailGeramUmSoUsuario() throws Exception {
		int tentativas = 20;
		ExecutorService pool = Executors.newFixedThreadPool(tentativas);
		CountDownLatch largada = new CountDownLatch(1);
		try {
			List<Future<Boolean>> resultados = new ArrayList<>();
			for (int i = 0; i < tentativas; i++) {
				int n = i;
				resultados.add(pool.submit(() -> {
					largada.await();
					try {
						servico.cadastrar(new CadastroRequest("Ana " + n, "ana@x.com", "senha-longa-1"));
						return true;
					} catch (EmailEmUso e) {
						return false;
					}
				}));
			}
			largada.countDown();
			long sucessos = 0;
			for (Future<Boolean> r : resultados) {
				if (r.get()) {
					sucessos++;
				}
			}
			assertThat(sucessos).isEqualTo(1L);
		} finally {
			pool.shutdownNow();
		}
	}
}
