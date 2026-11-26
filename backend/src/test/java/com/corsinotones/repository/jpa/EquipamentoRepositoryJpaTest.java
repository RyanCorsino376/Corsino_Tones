package com.corsinotones.repository.jpa;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.corsinotones.BancoDeTeste;
import com.corsinotones.model.Equipamento;
import com.corsinotones.repository.Duplicado;
import com.corsinotones.repository.EmUso;
import com.corsinotones.repository.EquipamentoRepository;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;

// EQP-01, EQP-07, EQP-08, ERR-04, ERR-05 at the adapter: order, and the database errors it translates.
// The database is shared, so new rows use unique brands and no test counts every equipment.
@SpringBootTest
@Import(BancoDeTeste.class)
class EquipamentoRepositoryJpaTest {

	@Autowired
	private EquipamentoRepository repositorio;

	private static String marcaUnica() {
		return "m" + UUID.randomUUID().toString().replace("-", "");
	}

	@Test
	void listarOrdenaPorMarcaEDepoisModelo() {
		String base = marcaUnica();
		Equipamento bB = repositorio.criar(base + "-b", "a");
		Equipamento aB = repositorio.criar(base + "-a", "b");
		Equipamento aA = repositorio.criar(base + "-a", "a");

		List<Long> meus = repositorio.listar().stream().map(Equipamento::id)
				.filter(id -> List.of(aA.id(), aB.id(), bB.id()).contains(id)).toList();

		assertThat(meus).containsExactly(aA.id(), aB.id(), bB.id());
	}

	@Test
	void listarTrazOsEquipamentosDoSeedNaOrdemDaMarca() {
		List<String> seed = repositorio.listar().stream().filter(e -> e.id() <= 4)
				.map(e -> e.marca() + " " + e.modelo()).toList();

		assertThat(seed).containsExactly("boss GT-1000", "line6 HX Stomp", "nux MG-30", "zoom G6");
	}

	@Test
	void criarUmParExistenteLancaDuplicado() {
		assertThatThrownBy(() -> repositorio.criar("boss", "GT-1000"))
				.isInstanceOfSatisfying(Duplicado.class,
						erro -> assertThat(erro.restricao()).isEqualTo("uk_equipamento_marca_modelo"));
	}

	@Test
	void atualizarParaUmParExistenteLancaDuplicadoENaoAltera() {
		Equipamento novo = repositorio.criar(marcaUnica(), "X1");

		assertThatThrownBy(() -> repositorio.atualizar(new Equipamento(novo.id(), "boss", "GT-1000")))
				.isInstanceOfSatisfying(Duplicado.class,
						erro -> assertThat(erro.restricao()).isEqualTo("uk_equipamento_marca_modelo"));
		assertThat(repositorio.buscar(novo.id())).contains(novo);
	}

	@Test
	void excluirEquipamentoComPacksLancaEmUsoENaoExclui() {
		assertThatThrownBy(() -> repositorio.excluir(1))
				.isInstanceOfSatisfying(EmUso.class,
						erro -> assertThat(erro.restricao()).isEqualTo("fk_pack_equipamento"));
		assertThat(repositorio.buscar(1)).contains(new Equipamento(1, "boss", "GT-1000"));
	}

	@Test
	void temPacksDistingueEquipamentoComESemPacks() {
		Equipamento novo = repositorio.criar(marcaUnica(), "Sem Packs");

		assertThat(repositorio.temPacks(1)).isTrue();
		assertThat(repositorio.temPacks(novo.id())).isFalse();
	}

	@Test
	void criarBuscarAtualizarEExcluir() {
		String marca = marcaUnica();
		Equipamento criado = repositorio.criar(marca, "Modelo 1");
		assertThat(criado.id()).isPositive();
		assertThat(repositorio.buscar(criado.id())).contains(new Equipamento(criado.id(), marca, "Modelo 1"));

		Equipamento alterado = repositorio.atualizar(new Equipamento(criado.id(), marca, "Modelo 2"));
		assertThat(alterado).isEqualTo(new Equipamento(criado.id(), marca, "Modelo 2"));
		assertThat(repositorio.buscar(criado.id())).contains(alterado);

		repositorio.excluir(criado.id());
		assertThat(repositorio.buscar(criado.id())).isEmpty();
	}
}
