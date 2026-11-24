package com.corsinotones.repository.jpa;

import static org.assertj.core.api.Assertions.assertThat;

import com.corsinotones.BancoDeTeste;
import com.corsinotones.model.Equipamento;
import com.corsinotones.model.ItemPedido;
import com.corsinotones.model.Pack;
import com.corsinotones.model.Pedido;
import com.corsinotones.model.StatusPedido;
import com.corsinotones.repository.EquipamentoRepository;
import com.corsinotones.repository.PackRepository;
import com.corsinotones.repository.PedidoRepository;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;

// PED-02, PED-04, PED-05, PED-06 at the adapter. The database is shared: every test buys with users of its own,
// and the packs are fresh ones whose prices differ per pack (lesson L-014).
@SpringBootTest
@Import(BancoDeTeste.class)
class PedidoRepositoryJpaTest {

	private static final Instant T1 = Instant.parse("2026-03-01T10:00:00Z");
	private static final Instant T2 = Instant.parse("2026-03-02T10:00:00Z");
	private static final Instant T3 = Instant.parse("2026-03-03T10:00:00Z");

	@Autowired
	private PedidoRepository repositorio;
	@Autowired
	private PackRepository packs;
	@Autowired
	private EquipamentoRepository equipamentos;
	@Autowired
	private JdbcTemplate jdbc;

	private long usuarioNovo() {
		return jdbc.queryForObject("INSERT INTO usuario (nome, email, senha_hash) VALUES ('Comprador', ?, 'x')"
				+ " RETURNING id", Long.class, "c" + UUID.randomUUID() + "@exemplo.com");
	}

	private Pack packNovo(String estilo, int preco) {
		Equipamento equipamento = equipamentos.criar("m" + UUID.randomUUID().toString().replace("-", ""), "Teste");
		return packs.criar(new Pack(estilo + "-" + equipamento.marca(), "Pack " + estilo, estilo, "Descrição", preco,
				equipamento));
	}

	private Pedido comprar(long usuario, StatusPedido status, Instant quando, Pack... comprados) {
		List<ItemPedido> itens = Arrays.stream(comprados)
				.map(p -> new ItemPedido(p.id(), p.precoCentavos())).toList();
		int total = itens.stream().mapToInt(ItemPedido::precoCentavos).sum();
		return repositorio.criar(usuario, status, total, quando, itens);
	}

	// PED-02: the order row and one row per item, each with the price it was sold for.
	@Test
	void criarGuardaOPedidoEOsItensComSeusPrecos() {
		long usuario = usuarioNovo();
		Pack rock = packNovo("rock", 1990);
		Pack metal = packNovo("metal", 2990);

		Pedido criado = comprar(usuario, StatusPedido.PAGO, T1, rock, metal);

		assertThat(criado).isEqualTo(new Pedido(criado.id(), usuario, StatusPedido.PAGO, 4980, T1,
				List.of(new ItemPedido(rock.id(), 1990), new ItemPedido(metal.id(), 2990))));
		Map<String, Object> linha = jdbc.queryForMap("SELECT usuario_id, status, total_centavos, criado_em"
				+ " FROM pedido WHERE id = ?", criado.id());
		assertThat(linha.get("usuario_id")).isEqualTo(usuario);
		assertThat(linha.get("status")).isEqualTo("pago");
		assertThat(linha.get("total_centavos")).isEqualTo(4980);
		assertThat(((Timestamp) linha.get("criado_em")).toInstant()).isEqualTo(T1);
		assertThat(jdbc.queryForList("SELECT pack_id, preco_centavos FROM item_pedido WHERE pedido_id = ?",
				criado.id())).containsExactlyInAnyOrder(
						Map.of("pack_id", rock.id(), "preco_centavos", 1990),
						Map.of("pack_id", metal.id(), "preco_centavos", 2990));
	}

	@Test
	void statusPendenteEGuardadoEmMinusculas() {
		Pedido criado = comprar(usuarioNovo(), StatusPedido.PENDENTE, T1, packNovo("rock", 1990));

		assertThat(jdbc.queryForObject("SELECT status FROM pedido WHERE id = ?", String.class, criado.id()))
				.isEqualTo("pendente");
		assertThat(criado.status()).isEqualTo(StatusPedido.PENDENTE);
	}

	// PED-04: only the user's orders, newest first; with a status, only those.
	@Test
	void listarDoUsuarioDevolveSoOsDeleMaisNovosPrimeiroEFiltraPorStatus() {
		long usuario = usuarioNovo();
		long outro = usuarioNovo();
		Pack rock = packNovo("rock", 1990);
		Pack metal = packNovo("metal", 2990);
		Pedido antigo = comprar(usuario, StatusPedido.PAGO, T1, rock);
		Pedido recente = comprar(usuario, StatusPedido.PAGO, T3, metal, rock);
		Pedido pendente = comprar(usuario, StatusPedido.PENDENTE, T2, metal);
		comprar(outro, StatusPedido.PAGO, T2, rock);

		assertThat(repositorio.listarDoUsuario(usuario, Optional.empty())).containsExactly(recente, pendente, antigo);
		assertThat(repositorio.listarDoUsuario(usuario, Optional.of(StatusPedido.PAGO))).containsExactly(recente, antigo);
		assertThat(repositorio.listarDoUsuario(usuario, Optional.of(StatusPedido.PENDENTE))).containsExactly(pendente);
		assertThat(repositorio.listarDoUsuario(usuarioNovo(), Optional.empty())).isEmpty();
	}

	// PED-05, PED-06
	@Test
	void buscarDoUsuarioSoAchaOsPedidosDele() {
		long usuario = usuarioNovo();
		long outro = usuarioNovo();
		Pedido criado = comprar(usuario, StatusPedido.PAGO, T1, packNovo("rock", 1990), packNovo("metal", 2990));

		assertThat(repositorio.buscarDoUsuario(criado.id(), usuario)).contains(criado);
		assertThat(repositorio.buscarDoUsuario(criado.id(), outro)).isEmpty();
		assertThat(repositorio.buscarDoUsuario(Long.MAX_VALUE, usuario)).isEmpty();
	}

	// PED-05: a later read gives the order criar returned, even for a time finer than the column keeps.
	@Test
	void leituraDevolveOMesmoInstanteQueCriar() {
		long usuario = usuarioNovo();
		Pedido criado = comprar(usuario, StatusPedido.PAGO, Instant.parse("2026-03-01T10:00:00.123456789Z"),
				packNovo("rock", 1990));

		assertThat(repositorio.buscarDoUsuario(criado.id(), usuario)).contains(criado);
	}
}
