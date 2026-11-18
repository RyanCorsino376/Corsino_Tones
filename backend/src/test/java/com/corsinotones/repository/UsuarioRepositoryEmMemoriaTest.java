package com.corsinotones.repository;

import static org.assertj.core.api.Assertions.assertThat;

import com.corsinotones.model.Usuario;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.stream.IntStream;
import org.junit.jupiter.api.Test;

class UsuarioRepositoryEmMemoriaTest {

	private final UsuarioRepositoryEmMemoria repositorio = new UsuarioRepositoryEmMemoria();

	// CAD-11: the first user of an empty repository gets id 1.
	@Test
	void primeiroUsuarioRecebeId1() {
		Usuario criado = repositorio.criar("Ana", "ana@x.com", "hash").orElseThrow();

		assertThat(criado.id()).isEqualTo(1L);
		assertThat(criado.email()).isEqualTo("ana@x.com");
	}

	// CAD-11: id = largest existing id + 1, not a count (ids 1 and 5 loaded -> next is 6).
	@Test
	void novoIdEMaiorIdMaisUm() {
		repositorio.carregar(new Usuario(1, "A", "a@x.com", "h"));
		repositorio.carregar(new Usuario(5, "B", "b@x.com", "h"));

		Usuario criado = repositorio.criar("C", "c@x.com", "h").orElseThrow();

		assertThat(criado.id()).isEqualTo(6L);
	}

	// CAD-10: a repeated e-mail is refused and the stored user stays as it was.
	@Test
	void emailRepetidoNaoCriaEMantemOOriginal() {
		repositorio.criar("Ana", "ana@x.com", "hash1").orElseThrow();

		assertThat(repositorio.criar("Outra", "ana@x.com", "hash2")).isEmpty();

		Usuario guardado = repositorio.buscarPorEmail("ana@x.com").orElseThrow();
		assertThat(guardado.nome()).isEqualTo("Ana");
		assertThat(guardado.senhaHash()).isEqualTo("hash1");
	}

	@Test
	void buscarPorEmailDesconhecidoDevolveVazio() {
		assertThat(repositorio.buscarPorEmail("ninguem@x.com")).isEmpty();
	}

	// CAD-12: 20 simultaneous creations of the same e-mail produce exactly one user.
	@Test
	void criacoesSimultaneasDoMesmoEmailGeramUmSoUsuario() throws Exception {
		int tentativas = 20;
		ExecutorService pool = Executors.newFixedThreadPool(tentativas);
		CountDownLatch largada = new CountDownLatch(1);
		try {
			List<Future<Boolean>> resultados = IntStream.range(0, tentativas)
					.mapToObj(i -> pool.submit(() -> {
						largada.await();
						return repositorio.criar("Ana " + i, "ana@x.com", "h").isPresent();
					}))
					.toList();
			largada.countDown();

			long sucessos = 0;
			for (Future<Boolean> resultado : resultados) {
				if (resultado.get()) {
					sucessos++;
				}
			}
			assertThat(sucessos).isEqualTo(1L);
		} finally {
			pool.shutdownNow();
		}
	}
}
