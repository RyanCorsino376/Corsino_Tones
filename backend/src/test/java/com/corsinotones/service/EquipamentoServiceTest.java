package com.corsinotones.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.corsinotones.model.Equipamento;
import com.corsinotones.repository.Duplicado;
import com.corsinotones.repository.EmUso;
import com.corsinotones.repository.EquipamentoRepositoryEmMemoria;
import org.junit.jupiter.api.Test;

// EQP-03, EQP-04, EQP-05, EQP-07, EQP-08, EQP-09, ERR-04, ERR-05: equipment rules over an in-memory fake.
class EquipamentoServiceTest {

	private final EquipamentoRepositoryEmMemoria repositorio = new EquipamentoRepositoryEmMemoria();
	private final EquipamentoService servico = new EquipamentoService(repositorio);

	@Test
	void criarGuardaMarcaAparadaEMinusculaEModeloAparado() {
		Equipamento criado = servico.criar("  BOSS ", "  GT-1000 ");

		assertThat(criado.marca()).isEqualTo("boss");
		assertThat(criado.modelo()).isEqualTo("GT-1000");
		assertThat(repositorio.buscar(criado.id())).contains(new Equipamento(criado.id(), "boss", "GT-1000"));
	}

	// Edge case of the spec: "  BOSS " collides with the stored boss GT-1000.
	@Test
	void criarParExistenteDepoisDeNormalizarDaConflito() {
		servico.criar("boss", "GT-1000");

		assertThatThrownBy(() -> servico.criar("  BOSS ", "GT-1000"))
				.isInstanceOf(Conflito.class).hasMessage("Este equipamento já está cadastrado.");
		assertThat(repositorio.listar()).hasSize(1);
	}

	@Test
	void duplicadoDoBancoNoCriarViraConflito() {
		repositorio.falharProximaEscritaCom(new Duplicado("uk_equipamento_marca_modelo"));

		assertThatThrownBy(() -> servico.criar("zoom", "G6"))
				.isInstanceOf(Conflito.class).hasMessage("Este equipamento já está cadastrado.");
	}

	@Test
	void atualizarAlteraMarcaEModelo() {
		Equipamento criado = servico.criar("zoom", "G5");

		Equipamento alterado = servico.atualizar(criado.id(), " ZOOM ", " G6 ");

		assertThat(alterado).isEqualTo(new Equipamento(criado.id(), "zoom", "G6"));
		assertThat(repositorio.buscar(criado.id())).contains(alterado);
	}

	@Test
	void atualizarParaOParDeOutroDaConflitoENaoAltera() {
		servico.criar("boss", "GT-1000");
		Equipamento outro = servico.criar("zoom", "G6");

		assertThatThrownBy(() -> servico.atualizar(outro.id(), "Boss", "GT-1000"))
				.isInstanceOf(Conflito.class).hasMessage("Este equipamento já está cadastrado.");
		assertThat(repositorio.buscar(outro.id())).contains(outro);
	}

	@Test
	void atualizarParaOProprioParNaoEDuplicado() {
		Equipamento criado = servico.criar("boss", "GT-1000");

		assertThat(servico.atualizar(criado.id(), "BOSS", "GT-1000")).isEqualTo(criado);
	}

	@Test
	void duplicadoDoBancoNoAtualizarViraConflito() {
		Equipamento criado = servico.criar("nux", "MG-30");
		repositorio.falharProximaEscritaCom(new Duplicado("uk_equipamento_marca_modelo"));

		assertThatThrownBy(() -> servico.atualizar(criado.id(), "nux", "MG-300"))
				.isInstanceOf(Conflito.class).hasMessage("Este equipamento já está cadastrado.");
	}

	@Test
	void excluirEquipamentoSemPacksRemove() {
		Equipamento criado = servico.criar("line6", "HX Stomp");

		servico.excluir(criado.id());

		assertThat(repositorio.buscar(criado.id())).isEmpty();
	}

	@Test
	void excluirEquipamentoComPacksDaConflitoENaoExclui() {
		Equipamento criado = servico.criar("boss", "GT-1000");
		repositorio.marcarComPacks(criado.id());

		assertThatThrownBy(() -> servico.excluir(criado.id()))
				.isInstanceOf(Conflito.class).hasMessage("Este equipamento tem packs e não pode ser excluído.");
		assertThat(repositorio.buscar(criado.id())).contains(criado);
	}

	@Test
	void emUsoDoBancoNoExcluirViraConflito() {
		Equipamento criado = servico.criar("boss", "GT-1000");
		repositorio.falharProximaEscritaCom(new EmUso("fk_pack_equipamento"));

		assertThatThrownBy(() -> servico.excluir(criado.id()))
				.isInstanceOf(Conflito.class).hasMessage("Este equipamento tem packs e não pode ser excluído.");
		assertThat(repositorio.buscar(criado.id())).contains(criado);
	}

	@Test
	void idDesconhecidoDaNaoEncontradoEmBuscarAtualizarEExcluir() {
		assertThatThrownBy(() -> servico.buscar(42))
				.isInstanceOf(NaoEncontrado.class).hasMessage("Equipamento não encontrado.");
		assertThatThrownBy(() -> servico.atualizar(42, "boss", "GT-1000"))
				.isInstanceOf(NaoEncontrado.class).hasMessage("Equipamento não encontrado.");
		assertThatThrownBy(() -> servico.excluir(42))
				.isInstanceOf(NaoEncontrado.class).hasMessage("Equipamento não encontrado.");
		assertThat(repositorio.listar()).isEmpty();
	}
}
