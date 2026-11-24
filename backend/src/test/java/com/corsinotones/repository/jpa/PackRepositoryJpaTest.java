package com.corsinotones.repository.jpa;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.corsinotones.BancoDeTeste;
import com.corsinotones.model.Equipamento;
import com.corsinotones.model.Pack;
import com.corsinotones.repository.Duplicado;
import com.corsinotones.repository.EmUso;
import com.corsinotones.repository.EquipamentoRepository;
import com.corsinotones.repository.PackRepository;
import jakarta.persistence.EntityManagerFactory;
import java.time.Instant;
import java.sql.Timestamp;
import java.util.List;
import java.util.UUID;
import org.hibernate.SessionFactory;
import org.hibernate.stat.Statistics;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;

// PCK-01, PCK-02, PCK-11, PCK-12, ERR-04, ERR-05 at the adapter. The database is shared: new packs live on a
// fresh equipment with a unique brand, the seeded packs are only read, and no test counts every pack.
@SpringBootTest(properties = "spring.jpa.properties.hibernate.generate_statistics=true")
@Import(BancoDeTeste.class)
class PackRepositoryJpaTest {

	private static final List<String> IDS_DO_SEED = List.of("rock-boss-gt-1000", "metal-boss-gt-1000",
			"blues-boss-gt-1000", "rock-zoom-g6", "clean-zoom-g6", "metal-nux-mg-30", "clean-nux-mg-30",
			"blues-line6-hx-stomp", "rock-line6-hx-stomp");

	@Autowired
	private PackRepository repositorio;
	@Autowired
	private EquipamentoRepository equipamentos;
	@Autowired
	private EntityManagerFactory fabrica;
	@Autowired
	private JdbcTemplate jdbc;

	private Equipamento equipamentoNovo() {
		return equipamentos.criar("m" + UUID.randomUUID().toString().replace("-", ""), "Teste");
	}

	private static Pack pack(String estilo, int preco, Equipamento equipamento) {
		return new Pack(estilo + "-" + equipamento.marca(), "Pack " + estilo, estilo, "Descrição de " + estilo, preco,
				equipamento);
	}

	// PCK-02
	@Test
	void buscarDevolveOPackDoSeedComSeuEquipamento() {
		assertThat(repositorio.buscar("rock-boss-gt-1000")).contains(new Pack("rock-boss-gt-1000",
				"Rock · Boss GT-1000", "rock", "Do crunch britânico ao solo de arena, prontos para a sua GT-1000.", 4990,
				new Equipamento(1, "boss", "GT-1000")));
		assertThat(repositorio.buscar("nao-existe")).isEmpty();
	}

	// PCK-01: ordered by id. The seed ids sort the same way by code point and by any locale.
	@Test
	void listarOrdenaPorIdETrazOEquipamentoDeCadaPack() {
		List<Pack> doSeed = repositorio.listar().stream().filter(p -> IDS_DO_SEED.contains(p.id())).toList();

		assertThat(doSeed).extracting(Pack::id).containsExactly("blues-boss-gt-1000", "blues-line6-hx-stomp",
				"clean-nux-mg-30", "clean-zoom-g6", "metal-boss-gt-1000", "metal-nux-mg-30", "rock-boss-gt-1000",
				"rock-line6-hx-stomp", "rock-zoom-g6");
		assertThat(doSeed).filteredOn(p -> p.id().equals("clean-nux-mg-30")).singleElement()
				.extracting(Pack::equipamento).isEqualTo(new Equipamento(3, "nux", "MG-30"));
		assertThat(doSeed).filteredOn(p -> p.id().equals("blues-line6-hx-stomp")).singleElement()
				.extracting(Pack::equipamento).isEqualTo(new Equipamento(4, "line6", "HX Stomp"));
	}

	@Test
	void listarFazUmaUnicaConsulta() {
		Statistics estatisticas = fabrica.unwrap(SessionFactory.class).getStatistics();
		estatisticas.clear();

		List<Pack> packs = repositorio.listar();

		assertThat(packs).hasSizeGreaterThanOrEqualTo(9);
		assertThat(estatisticas.getPrepareStatementCount()).isEqualTo(1);
	}

	@Test
	void buscarVariosDevolveSoOsQueExistem() {
		assertThat(repositorio.buscarVarios(List.of("rock-boss-gt-1000", "nao-existe", "clean-zoom-g6")))
				.extracting(Pack::id).containsExactlyInAnyOrder("rock-boss-gt-1000", "clean-zoom-g6");
	}

	// Prices differ per pack, so a mix-up between rows would show (lesson L-014).
	@Test
	void criarEAtualizarGuardamCadaCampo() {
		Equipamento equipamento = equipamentoNovo();
		Equipamento outro = equipamentoNovo();
		Pack rock = repositorio.criar(pack("rock", 1990, equipamento));
		Pack jazz = repositorio.criar(pack("jazz", 2990, equipamento));

		assertThat(repositorio.buscar(rock.id())).contains(rock);
		assertThat(repositorio.buscar(jazz.id())).contains(jazz);
		assertThat(rock.precoCentavos()).isEqualTo(1990);

		Pack alterado = new Pack(rock.id(), "Outro nome", "funk", "Outra descrição", 3990, outro);
		assertThat(repositorio.atualizar(alterado)).isEqualTo(alterado);
		assertThat(repositorio.buscar(rock.id())).contains(alterado);
		assertThat(repositorio.buscar(jazz.id())).contains(jazz);
	}

	@Test
	void mesmoEstiloNoMesmoEquipamentoLancaDuplicado() {
		Equipamento equipamento = equipamentoNovo();
		repositorio.criar(pack("rock", 1990, equipamento));

		Pack outroId = new Pack("outro-" + equipamento.marca(), "Outro", "rock", "Descrição", 2990, equipamento);
		assertThatThrownBy(() -> repositorio.criar(outroId))
				.isInstanceOfSatisfying(Duplicado.class,
						erro -> assertThat(erro.restricao()).isEqualTo("uk_pack_estilo_equipamento"));
		assertThat(repositorio.buscar(outroId.id())).isEmpty();
	}

	@Test
	void atualizarParaUmEstiloJaUsadoNoEquipamentoLancaDuplicado() {
		Equipamento equipamento = equipamentoNovo();
		repositorio.criar(pack("rock", 1990, equipamento));
		Pack jazz = repositorio.criar(pack("jazz", 2990, equipamento));

		assertThatThrownBy(() -> repositorio.atualizar(new Pack(jazz.id(), jazz.nome(), "rock", jazz.descricao(),
				jazz.precoCentavos(), equipamento)))
				.isInstanceOfSatisfying(Duplicado.class,
						erro -> assertThat(erro.restricao()).isEqualTo("uk_pack_estilo_equipamento"));
		assertThat(repositorio.buscar(jazz.id())).contains(jazz);
	}

	// A new pack whose id is taken must not overwrite the existing one.
	@Test
	void idJaUsadoLancaDuplicadoENaoSobrescreve() {
		Equipamento equipamento = equipamentoNovo();
		Pack original = repositorio.criar(pack("rock", 1990, equipamento));

		Pack mesmoId = new Pack(original.id(), "Intruso", "rock!", "Outra", 2990, equipamento);
		assertThatThrownBy(() -> repositorio.criar(mesmoId))
				.isInstanceOfSatisfying(Duplicado.class, erro -> assertThat(erro.restricao()).isEqualTo("pk_pack"));
		assertThat(repositorio.buscar(original.id())).contains(original);
	}

	@Test
	void excluirPackComPresetsLancaEmUsoENaoExclui() {
		assertThat(repositorio.emUso("metal-nux-mg-30")).isTrue();

		assertThatThrownBy(() -> repositorio.excluir("metal-nux-mg-30"))
				.isInstanceOfSatisfying(EmUso.class, erro -> assertThat(erro.restricao()).isEqualTo("fk_preset_pack"));
		assertThat(repositorio.buscar("metal-nux-mg-30")).isPresent();
	}

	@Test
	void excluirPackEmPedidoLancaEmUsoENaoExclui() {
		Pack vendido = repositorio.criar(pack("rock", 1990, equipamentoNovo()));
		// The order belongs to a user of its own, so no other test sees it among the seeded user's orders.
		Long comprador = jdbc.queryForObject("INSERT INTO usuario (nome, email, senha_hash) VALUES ('Comprador', ?, 'x')"
				+ " RETURNING id", Long.class, "c" + UUID.randomUUID() + "@exemplo.com");
		Long pedido = jdbc.queryForObject("INSERT INTO pedido (usuario_id, status, total_centavos, criado_em)"
				+ " VALUES (?, 'pago', 1990, ?) RETURNING id", Long.class, comprador, Timestamp.from(Instant.now()));
		jdbc.update("INSERT INTO item_pedido (pedido_id, pack_id, preco_centavos) VALUES (?, ?, 1990)", pedido,
				vendido.id());

		assertThat(repositorio.emUso(vendido.id())).isTrue();
		assertThatThrownBy(() -> repositorio.excluir(vendido.id()))
				.isInstanceOfSatisfying(EmUso.class,
						erro -> assertThat(erro.restricao()).isEqualTo("fk_item_pedido_pack"));
		assertThat(repositorio.buscar(vendido.id())).isPresent();
	}

	@Test
	void excluirPackSemPresetsNemPedidos() {
		Pack livre = repositorio.criar(pack("rock", 1990, equipamentoNovo()));
		assertThat(repositorio.emUso(livre.id())).isFalse();

		repositorio.excluir(livre.id());

		assertThat(repositorio.buscar(livre.id())).isEmpty();
	}

	@Test
	void existeEstiloNoEquipamentoIgnoraOProprioPack() {
		Equipamento equipamento = equipamentoNovo();
		Pack rock = repositorio.criar(pack("rock", 1990, equipamento));

		assertThat(repositorio.existeEstiloNoEquipamento("rock", equipamento.id(), null)).isTrue();
		assertThat(repositorio.existeEstiloNoEquipamento("rock", equipamento.id(), rock.id())).isFalse();
		assertThat(repositorio.existeEstiloNoEquipamento("jazz", equipamento.id(), null)).isFalse();
	}
}
