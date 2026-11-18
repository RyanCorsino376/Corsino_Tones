package com.corsinotones.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.corsinotones.dto.CadastroRequest;
import com.corsinotones.dto.LoginRequest;
import com.corsinotones.model.Usuario;
import com.corsinotones.repository.UsuarioRepositoryEmMemoria;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import javax.crypto.spec.SecretKeySpec;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

class AuthServiceTest {

	private final PasswordEncoder encoder = new BCryptPasswordEncoder();
	private final UsuarioRepositoryEmMemoria repositorio = new UsuarioRepositoryEmMemoria();
	private final AuthService servico = new AuthService(repositorio, encoder, new TokenService(
			NimbusJwtEncoder.withSecretKey(new SecretKeySpec("a-secret-with-at-least-32-characters!!".getBytes(StandardCharsets.UTF_8), "HmacSHA256"))
					.algorithm(MacAlgorithm.HS256).build(),
			Clock.systemUTC()));

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

	// ---- entrar (LOG-02, LOG-03, LOG-05) ----

	// LOG-03: a user registered through cadastrar signs in with the password given there.
	@Test
	void usuarioCadastradoEntraComASenhaDoCadastro() {
		Usuario criado = servico.cadastrar(new CadastroRequest("Ana", "ana@x.com", "senha-longa-1"));

		AuthService.Sessao sessao = servico.entrar(new LoginRequest("ana@x.com", "senha-longa-1"));

		assertThat(sessao.usuario()).isEqualTo(criado);
		assertThat(sessao.token().split("\\.")).hasSize(3);
	}

	// LOG-02, LOG-03: a seeded user (plain password hashed at load) signs in with mixed case and spaces in the e-mail.
	@Test
	void usuarioDaSementeEntraComEmailEmOutraCaixa() {
		repositorio.carregar(new Usuario(1, "Ryan Corsino", "ryan@exemplo.com", encoder.encode("teste123")));

		AuthService.Sessao sessao = servico.entrar(new LoginRequest("RYAN@exemplo.com", "teste123"));

		assertThat(sessao.usuario().id()).isEqualTo(1L);
	}

	// LOG-05: wrong password and unknown e-mail raise the same error.
	@Test
	void senhaErradaELancaCredenciaisInvalidas() {
		servico.cadastrar(new CadastroRequest("Ana", "ana@x.com", "senha-longa-1"));

		assertThatThrownBy(() -> servico.entrar(new LoginRequest("ana@x.com", "outra-senha")))
				.isInstanceOf(CredenciaisInvalidas.class)
				.hasMessage("E-mail ou senha incorretos.");
	}

	@Test
	void emailDesconhecidoLancaOMesmoErro() {
		assertThatThrownBy(() -> servico.entrar(new LoginRequest("ninguem@x.com", "qualquer-coisa")))
				.isInstanceOf(CredenciaisInvalidas.class)
				.hasMessage("E-mail ou senha incorretos.");
	}

	// Timing guard: the password is compared against a hash even when the e-mail is unknown.
	@Test
	void comparaASenhaTambemQuandoOEmailNaoExiste() {
		int[] chamadas = {0};
		PasswordEncoder contador = new PasswordEncoder() {
			@Override
			public String encode(CharSequence senha) {
				return encoder.encode(senha);
			}

			@Override
			public boolean matches(CharSequence senha, String hash) {
				chamadas[0]++;
				return encoder.matches(senha, hash);
			}
		};
		AuthService comContador = new AuthService(repositorio, contador, new TokenService(
				NimbusJwtEncoder.withSecretKey(new SecretKeySpec("a-secret-with-at-least-32-characters!!".getBytes(StandardCharsets.UTF_8), "HmacSHA256"))
						.algorithm(MacAlgorithm.HS256).build(),
				Clock.systemUTC()));
		repositorio.carregar(new Usuario(1, "Ana", "ana@x.com", encoder.encode("senha-longa-1")));

		assertThatThrownBy(() -> comContador.entrar(new LoginRequest("ana@x.com", "errada"))).isInstanceOf(CredenciaisInvalidas.class);
		int aposSenhaErrada = chamadas[0];
		assertThatThrownBy(() -> comContador.entrar(new LoginRequest("ninguem@x.com", "errada"))).isInstanceOf(CredenciaisInvalidas.class);

		assertThat(aposSenhaErrada).isEqualTo(1);
		assertThat(chamadas[0]).isEqualTo(2);
	}
}
