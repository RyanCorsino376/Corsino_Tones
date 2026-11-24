package com.corsinotones.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.corsinotones.model.Equipamento;
import com.corsinotones.model.Pack;
import com.corsinotones.repository.Duplicado;
import com.corsinotones.repository.EmUso;
import com.corsinotones.repository.EquipamentoRepositoryEmMemoria;
import com.corsinotones.repository.PackRepositoryEmMemoria;
import org.junit.jupiter.api.Test;

// PCK-03, PCK-04, PCK-05, PCK-10, PCK-11, PCK-12, PCK-13: pack rules and the id slug over in-memory fakes.
class PackServiceTest {

	private final EquipamentoRepositoryEmMemoria equipamentos = new EquipamentoRepositoryEmMemoria();
	private final PackRepositoryEmMemoria repositorio = new PackRepositoryEmMemoria();
	private final PackService servico = new PackService(repositorio, equipamentos);

	private final Equipamento hxStomp = equipamentos.criar("line6", "HX Stomp");
	private final Equipamento gt1000 = equipamentos.criar("boss", "GT-1000");

	private static PackService.Dados dados(String estilo, int preco, Equipamento equipamento) {
		return new PackService.Dados("Pack " + estilo, estilo, "Descrição " + estilo, preco, equipamento.id());
	}

	// PCK-03: the spec's example.
	@Test
	void slugJuntaEstiloMarcaEModeloEmMinusculas() {
		assertThat(PackService.slug("clean", "line6", "HX Stomp")).isEqualTo("clean-line6-hx-stomp");
	}

	@Test
	void slugRemoveAcentos() {
		assertThat(PackService.slug("clássico", "boss", "GT-1000")).isEqualTo("classico-boss-gt-1000");
	}

	@Test
	void slugNaoComecaNemTerminaComHifen() {
		assertThat(PackService.slug("  Rock!! ", "boss", "GT-1000")).isEqualTo("rock-boss-gt-1000");
		assertThat(PackService.slug("rock", "boss", "  GT-1000!! ")).isEqualTo("rock-boss-gt-1000");
	}

	// Lesson L-002: a valid slug embedded in invalid text must come out whole, with only the inner runs collapsed
	// and only the outer hyphens dropped.
	@Test
	void slugDeTextoComUmSlugValidoNoMeioSaiInteiro() {
		assertThat(PackService.slug("--metal--", "#nux#", "--MG--30--")).isEqualTo("metal-nux-mg-30");
		assertThat(PackService.slug("hard   rock", "zoom", "G6 / B")).isEqualTo("hard-rock-zoom-g6-b");
	}

	@Test
	void criarUsaOSlugComoIdEGuardaOsCampos() {
		Pack criado = servico.criar(new PackService.Dados("  Clean · HX  ", "  CLEAN ", "  Limpos.  ", 2990, hxStomp.id()));

		assertThat(criado).isEqualTo(new Pack("clean-line6-hx-stomp", "Clean · HX", "clean", "Limpos.", 2990, hxStomp));
		assertThat(repositorio.buscar("clean-line6-hx-stomp")).contains(criado);
	}

	// PCK-04 and the spec's edge case: the id stays when estilo and equipment change.
	@Test
	void atualizarMantemOIdMesmoMudandoEstiloEEquipamento() {
		Pack criado = servico.criar(dados("rock", 1990, gt1000));

		Pack alterado = servico.atualizar(criado.id(), new PackService.Dados("Novo", "Blues", "Outra", 3990, hxStomp.id()));

		assertThat(alterado).isEqualTo(new Pack("rock-boss-gt-1000", "Novo", "blues", "Outra", 3990, hxStomp));
		assertThat(repositorio.buscar("rock-boss-gt-1000")).contains(alterado);
		assertThat(repositorio.buscar("blues-line6-hx-stomp")).isEmpty();
	}

	// PCK-10
	@Test
	void equipamentoDesconhecidoDaCampoInvalidoNoCriarENoAtualizar() {
		Pack criado = servico.criar(dados("rock", 1990, gt1000));
		PackService.Dados semEquipamento = new PackService.Dados("Pack", "metal", "Descrição", 1990, 999);

		assertThatThrownBy(() -> servico.criar(semEquipamento))
				.isInstanceOfSatisfying(CampoInvalido.class, erro -> {
					assertThat(erro.campo()).isEqualTo("equipamentoId");
					assertThat(erro.getMessage()).isEqualTo("Equipamento não encontrado.");
				});
		assertThatThrownBy(() -> servico.atualizar(criado.id(), semEquipamento))
				.isInstanceOfSatisfying(CampoInvalido.class, erro -> {
					assertThat(erro.campo()).isEqualTo("equipamentoId");
					assertThat(erro.getMessage()).isEqualTo("Equipamento não encontrado.");
				});
		assertThat(repositorio.listar()).containsExactly(criado);
	}

	// PCK-11: pre-check and the database's Duplicado (ERR-04).
	@Test
	void mesmoEstiloNoMesmoEquipamentoDaConflitoNoCriar() {
		servico.criar(dados("rock", 1990, gt1000));

		assertThatThrownBy(() -> servico.criar(dados(" ROCK ", 2990, gt1000)))
				.isInstanceOf(Conflito.class).hasMessage("Já existe um pack deste estilo para este equipamento.");
		assertThat(repositorio.listar()).hasSize(1);
	}

	@Test
	void mesmoEstiloEmOutroEquipamentoNaoEConflito() {
		servico.criar(dados("rock", 1990, gt1000));

		assertThat(servico.criar(dados("rock", 2990, hxStomp)).id()).isEqualTo("rock-line6-hx-stomp");
	}

	@Test
	void duplicadoDoBancoNoCriarViraConflito() {
		repositorio.falharProximaEscritaCom(new Duplicado("uk_pack_estilo_equipamento"));

		assertThatThrownBy(() -> servico.criar(dados("rock", 1990, gt1000)))
				.isInstanceOf(Conflito.class).hasMessage("Já existe um pack deste estilo para este equipamento.");
	}

	@Test
	void mudarParaUmEstiloJaUsadoNoEquipamentoDaConflitoENaoAltera() {
		servico.criar(dados("rock", 1990, gt1000));
		Pack metal = servico.criar(dados("metal", 2990, gt1000));

		assertThatThrownBy(() -> servico.atualizar(metal.id(), dados("rock", 2990, gt1000)))
				.isInstanceOf(Conflito.class).hasMessage("Já existe um pack deste estilo para este equipamento.");
		assertThat(repositorio.buscar(metal.id())).contains(metal);
	}

	@Test
	void atualizarMantendoOProprioEstiloNaoEConflito() {
		Pack rock = servico.criar(dados("rock", 1990, gt1000));

		assertThat(servico.atualizar(rock.id(), dados("rock", 3990, gt1000)).precoCentavos()).isEqualTo(3990);
	}

	@Test
	void duplicadoDoBancoNoAtualizarViraConflito() {
		Pack rock = servico.criar(dados("rock", 1990, gt1000));
		repositorio.falharProximaEscritaCom(new Duplicado("uk_pack_estilo_equipamento"));

		assertThatThrownBy(() -> servico.atualizar(rock.id(), dados("funk", 1990, gt1000)))
				.isInstanceOf(Conflito.class).hasMessage("Já existe um pack deste estilo para este equipamento.");
	}

	// PCK-05
	@Test
	void excluirPackLivreRemove() {
		Pack rock = servico.criar(dados("rock", 1990, gt1000));

		servico.excluir(rock.id());

		assertThat(repositorio.buscar(rock.id())).isEmpty();
	}

	// PCK-12: pre-check and the database's EmUso (ERR-05).
	@Test
	void excluirPackEmUsoDaConflitoENaoExclui() {
		Pack rock = servico.criar(dados("rock", 1990, gt1000));
		repositorio.marcarEmUso(rock.id());

		assertThatThrownBy(() -> servico.excluir(rock.id()))
				.isInstanceOf(Conflito.class).hasMessage("Este pack tem presets ou pedidos e não pode ser excluído.");
		assertThat(repositorio.buscar(rock.id())).contains(rock);
	}

	@Test
	void emUsoDoBancoNoExcluirViraConflito() {
		Pack rock = servico.criar(dados("rock", 1990, gt1000));
		repositorio.falharProximaEscritaCom(new EmUso("fk_preset_pack"));

		assertThatThrownBy(() -> servico.excluir(rock.id()))
				.isInstanceOf(Conflito.class).hasMessage("Este pack tem presets ou pedidos e não pode ser excluído.");
		assertThat(repositorio.buscar(rock.id())).contains(rock);
	}

	// PCK-13
	@Test
	void idDesconhecidoDaNaoEncontradoEmBuscarAtualizarEExcluir() {
		assertThatThrownBy(() -> servico.buscar("nao-existe"))
				.isInstanceOf(NaoEncontrado.class).hasMessage("Pack não encontrado.");
		assertThatThrownBy(() -> servico.atualizar("nao-existe", dados("rock", 1990, gt1000)))
				.isInstanceOf(NaoEncontrado.class).hasMessage("Pack não encontrado.");
		assertThatThrownBy(() -> servico.excluir("nao-existe"))
				.isInstanceOf(NaoEncontrado.class).hasMessage("Pack não encontrado.");
		assertThat(repositorio.listar()).isEmpty();
	}
}
