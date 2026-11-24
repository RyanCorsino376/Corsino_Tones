package com.corsinotones.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.corsinotones.model.Equipamento;
import com.corsinotones.model.Pack;
import com.corsinotones.model.Preset;
import com.corsinotones.repository.PackRepositoryEmMemoria;
import com.corsinotones.repository.PresetRepositoryEmMemoria;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;

// PRS-04, PRS-05, PRS-06, PRS-10, PRS-11: preset rules over in-memory fakes.
class PresetServiceTest {

	private final PackRepositoryEmMemoria packs = new PackRepositoryEmMemoria();
	private final PresetRepositoryEmMemoria repositorio = new PresetRepositoryEmMemoria();
	private final PresetService servico = new PresetService(repositorio, packs);

	private final Equipamento gt1000 = new Equipamento(1, "boss", "GT-1000");
	private final Pack rock = packs.criar(new Pack("rock-boss-gt-1000", "Rock", "rock", "Rock.", 1990, gt1000));
	private final Pack metal = packs.criar(new Pack("metal-boss-gt-1000", "Metal", "metal", "Metal.", 2990, gt1000));

	private static PresetService.Dados dados(String nome, LocalDate data, String packId) {
		return new PresetService.Dados(nome, "Descrição de " + nome, data, packId);
	}

	// PRS-04
	@Test
	void criarGuardaOPresetNoPackInformado() {
		Preset criado = servico.criar(dados("Riff", LocalDate.of(2026, 5, 4), rock.id()));

		assertThat(criado).isEqualTo(new Preset(1, "Riff", "Descrição de Riff", LocalDate.of(2026, 5, 4), rock));
		assertThat(repositorio.buscar(1)).contains(criado);
	}

	// PRS-05: the preset moves to another pack.
	@Test
	void atualizarMoveOPresetParaOutroPack() {
		Preset criado = servico.criar(dados("Riff", LocalDate.of(2026, 5, 4), rock.id()));

		Preset alterado = servico.atualizar(criado.id(), dados("Solo", LocalDate.of(2026, 7, 8), metal.id()));

		assertThat(alterado).isEqualTo(new Preset(criado.id(), "Solo", "Descrição de Solo", LocalDate.of(2026, 7, 8),
				metal));
		assertThat(repositorio.buscar(criado.id())).contains(alterado);
		assertThat(repositorio.listarPorPack(rock.id())).isEmpty();
	}

	// PRS-06
	@Test
	void excluirRemoveOPreset() {
		Preset criado = servico.criar(dados("Riff", LocalDate.of(2026, 5, 4), rock.id()));

		servico.excluir(criado.id());

		assertThat(repositorio.buscar(criado.id())).isEmpty();
	}

	// PRS-10
	@Test
	void packDesconhecidoDaCampoInvalidoNoCriarENoAtualizar() {
		Preset criado = servico.criar(dados("Riff", LocalDate.of(2026, 5, 4), rock.id()));
		PresetService.Dados semPack = dados("Solo", LocalDate.of(2026, 7, 8), "nao-existe");

		assertThatThrownBy(() -> servico.criar(semPack))
				.isInstanceOfSatisfying(CampoInvalido.class, erro -> {
					assertThat(erro.campo()).isEqualTo("packId");
					assertThat(erro.getMessage()).isEqualTo("Pack não encontrado.");
				});
		assertThatThrownBy(() -> servico.atualizar(criado.id(), semPack))
				.isInstanceOfSatisfying(CampoInvalido.class, erro -> {
					assertThat(erro.campo()).isEqualTo("packId");
					assertThat(erro.getMessage()).isEqualTo("Pack não encontrado.");
				});
		assertThat(repositorio.listar()).containsExactly(criado);
	}

	// PRS-11
	@Test
	void idDesconhecidoDaNaoEncontradoEmBuscarAtualizarEExcluir() {
		assertThatThrownBy(() -> servico.buscar(99))
				.isInstanceOf(NaoEncontrado.class).hasMessage("Preset não encontrado.");
		assertThatThrownBy(() -> servico.atualizar(99, dados("Solo", LocalDate.of(2026, 7, 8), rock.id())))
				.isInstanceOf(NaoEncontrado.class).hasMessage("Preset não encontrado.");
		assertThatThrownBy(() -> servico.excluir(99))
				.isInstanceOf(NaoEncontrado.class).hasMessage("Preset não encontrado.");
		assertThat(repositorio.listar()).isEmpty();
	}
}
