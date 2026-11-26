package com.corsinotones.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.corsinotones.model.Equipamento;
import com.corsinotones.model.ItemPedido;
import com.corsinotones.model.Pack;
import com.corsinotones.model.Pedido;
import com.corsinotones.model.StatusPedido;
import com.corsinotones.repository.PackRepositoryEmMemoria;
import com.corsinotones.repository.PedidoRepositoryEmMemoria;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;

// PED-01, PED-02, PED-03, PED-07, PED-08, PED-09: order rules over in-memory fakes and a fixed clock. Every pack
// has its own price, so a wrong price per item or a wrong sum shows (lesson L-014).
class PedidoServiceTest {

	private static final Instant AGORA = Instant.parse("2026-11-24T15:30:00Z");
	private static final long USUARIO = 7;

	private final PackRepositoryEmMemoria packs = new PackRepositoryEmMemoria();
	private final PedidoRepositoryEmMemoria repositorio = new PedidoRepositoryEmMemoria();
	private final PedidoService servico = new PedidoService(repositorio, packs, Clock.fixed(AGORA, ZoneOffset.UTC));

	private final Equipamento gt1000 = new Equipamento(1, "boss", "GT-1000");
	private final Pack rock = packs.criar(new Pack("rock-boss-gt-1000", "Rock", "rock", "Rock.", 1990, gt1000));
	private final Pack metal = packs.criar(new Pack("metal-boss-gt-1000", "Metal", "metal", "Metal.", 2990, gt1000));
	private final Pack blues = packs.criar(new Pack("blues-boss-gt-1000", "Blues", "blues", "Blues.", 4500, gt1000));

	private void esperarCampo(List<String> packIds, String mensagem) {
		assertThatThrownBy(() -> servico.criar(USUARIO, packIds))
				.isInstanceOfSatisfying(CampoInvalido.class, erro -> {
					assertThat(erro.campo()).isEqualTo("packIds");
					assertThat(erro.getMessage()).isEqualTo(mensagem);
				});
		assertThat(repositorio.listarDoUsuario(USUARIO, Optional.empty())).isEmpty();
	}

	// PED-01, PED-02, PED-03: the user, total, status and time all come from the server.
	@Test
	void criarSomaOsPrecosDosPacksEGuardaComoPago() {
		Pedido criado = servico.criar(USUARIO, List.of(metal.id(), rock.id(), blues.id()));

		assertThat(criado).isEqualTo(new Pedido(1, USUARIO, StatusPedido.PAGO, 9480, AGORA, List.of(
				new ItemPedido(metal.id(), 2990), new ItemPedido(rock.id(), 1990), new ItemPedido(blues.id(), 4500))));
		assertThat(repositorio.listarDoUsuario(USUARIO, Optional.empty())).containsExactly(criado);
	}

	// PED-07
	@Test
	void listaVaziaOuAusenteDaCampoInvalido() {
		esperarCampo(List.of(), "Escolha pelo menos um pack.");
		esperarCampo(null, "Escolha pelo menos um pack.");
	}

	// PED-08
	@Test
	void packRepetidoDaCampoInvalido() {
		esperarCampo(List.of(rock.id(), metal.id(), rock.id()), "Um pack aparece mais de uma vez.");
	}

	// PED-09: the first unknown id in the order of the request, and nothing is stored.
	@Test
	void primeiroPackDesconhecidoNaOrdemDoPedidoDaCampoInvalido() {
		esperarCampo(List.of(rock.id(), "zeta-x", metal.id(), "alfa-x"), "Pack não encontrado: zeta-x.");
		esperarCampo(List.of("alfa-x", "zeta-x"), "Pack não encontrado: alfa-x.");
	}

	// PED-04
	@Test
	void listarDevolveOsPedidosDoUsuarioComOFiltro() {
		Pedido meu = servico.criar(USUARIO, List.of(rock.id()));
		servico.criar(USUARIO + 1, List.of(metal.id()));

		assertThat(servico.listar(USUARIO, Optional.empty())).containsExactly(meu);
		assertThat(servico.listar(USUARIO, Optional.of(StatusPedido.PAGO))).containsExactly(meu);
		assertThat(servico.listar(USUARIO, Optional.of(StatusPedido.PENDENTE))).isEmpty();
	}

	// PED-05, PED-06
	@Test
	void buscarSoAchaOsPedidosDoUsuario() {
		Pedido meu = servico.criar(USUARIO, List.of(rock.id()));

		assertThat(servico.buscar(meu.id(), USUARIO)).isEqualTo(meu);
		assertThatThrownBy(() -> servico.buscar(meu.id(), USUARIO + 1))
				.isInstanceOf(NaoEncontrado.class).hasMessage("Pedido não encontrado.");
		assertThatThrownBy(() -> servico.buscar(99, USUARIO))
				.isInstanceOf(NaoEncontrado.class).hasMessage("Pedido não encontrado.");
	}
}
