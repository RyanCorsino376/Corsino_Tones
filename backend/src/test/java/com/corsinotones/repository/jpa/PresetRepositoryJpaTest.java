package com.corsinotones.repository.jpa;

import static org.assertj.core.api.Assertions.assertThat;

import com.corsinotones.BancoDeTeste;
import com.corsinotones.model.Equipamento;
import com.corsinotones.model.Pack;
import com.corsinotones.model.Preset;
import com.corsinotones.repository.EquipamentoRepository;
import com.corsinotones.repository.PackRepository;
import com.corsinotones.repository.PresetRepository;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;

// PRS-01, PRS-02, PRS-03, PRS-12 at the adapter. The database is shared: new presets live in a fresh pack on a
// fresh equipment, the seeded presets are only read, and no test counts every preset.
@SpringBootTest
@Import(BancoDeTeste.class)
class PresetRepositoryJpaTest {

	private static final Pack METAL_NUX = new Pack("metal-nux-mg-30", "Metal · NUX MG-30", "metal",
			"Distorções modernas e precisas para a NUX MG-30.", 4990, new Equipamento(3, "nux", "MG-30"));

	@Autowired
	private PresetRepository repositorio;
	@Autowired
	private PackRepository packs;
	@Autowired
	private EquipamentoRepository equipamentos;
	@Autowired
	private JdbcTemplate jdbc;

	// Prices differ per pack, so a mix-up between packs would show (lesson L-014).
	private Pack packNovo(int preco) {
		Equipamento equipamento = equipamentos.criar("m" + UUID.randomUUID().toString().replace("-", ""), "Teste");
		return packs.criar(new Pack("rock-" + equipamento.marca(), "Pack rock", "rock", "Descrição", preco,
				equipamento));
	}

	private Preset criar(String nome, LocalDate data, Pack pack) {
		return repositorio.criar(new Preset(0, nome, "Descrição de " + nome, data, pack));
	}

	private String arquivoChave(long id) {
		return jdbc.queryForObject("SELECT arquivo_chave FROM preset WHERE id = ?", String.class, id);
	}

	// PRS-03
	@Test
	void buscarDevolveOPresetDoSeedComPackEEquipamento() {
		assertThat(repositorio.buscar(1)).contains(new Preset(1, "Djent Preciso",
				"Ataque definido, graves firmes e noise gate agressivo.", LocalDate.of(2026, 6, 25), METAL_NUX));
		assertThat(repositorio.buscar(999999)).isEmpty();
	}

	// PRS-02: the seed has presets 1, 13 and 21 in this pack, shown newest first.
	@Test
	void listarPorPackDevolveSoOsPresetsDoPack() {
		List<Preset> doPack = repositorio.listarPorPack("metal-nux-mg-30");

		assertThat(doPack).extracting(Preset::id).containsExactly(21L, 1L, 13L);
		assertThat(doPack).extracting(Preset::pack).containsOnly(METAL_NUX);
		assertThat(repositorio.listarPorPack("nao-existe")).isEmpty();
	}

	@Test
	void listarPorPackSemPresetsDevolveVazio() {
		assertThat(repositorio.listarPorPack(packNovo(1990).id())).isEmpty();
	}

	// PRS-01 over the seed: every date differs, so only the date order can produce this sequence.
	@Test
	void listarOrdenaOSeedPorDataDecrescente() {
		List<Long> doSeed = repositorio.listar().stream().map(Preset::id).filter(id -> id <= 21).toList();

		assertThat(doSeed).containsExactly(2L, 3L, 21L, 9L, 12L, 1L, 11L, 5L, 19L, 6L, 7L, 17L, 13L, 4L, 8L, 14L, 10L,
				18L, 16L, 20L, 15L);
	}

	// PRS-01: date descending, then id ascending for the two presets of one day.
	@Test
	void listarOrdenaPorDataDecrescenteEDepoisIdCrescente() {
		Pack pack = packNovo(1990);
		Preset janeiro = criar("Janeiro", LocalDate.of(2026, 1, 10), pack);
		Preset marco1 = criar("Março 1", LocalDate.of(2026, 3, 5), pack);
		Preset fevereiro = criar("Fevereiro", LocalDate.of(2026, 2, 1), pack);
		Preset marco2 = criar("Março 2", LocalDate.of(2026, 3, 5), pack);
		List<Long> meus = List.of(janeiro.id(), marco1.id(), fevereiro.id(), marco2.id());

		assertThat(repositorio.listar().stream().map(Preset::id).filter(meus::contains))
				.containsExactly(marco1.id(), marco2.id(), fevereiro.id(), janeiro.id());
		assertThat(repositorio.listarPorPack(pack.id())).extracting(Preset::id)
				.containsExactly(marco1.id(), marco2.id(), fevereiro.id(), janeiro.id());
	}

	// PRS-04, PRS-05 at the adapter; PRS-12: the file key column is never written.
	@Test
	void criarEAtualizarGuardamCadaCampoENaoTocamNoArquivo() {
		Pack rock = packNovo(1990);
		Pack outro = packNovo(2990);

		Preset criado = criar("Riff", LocalDate.of(2026, 5, 4), rock);

		assertThat(criado.id()).isGreaterThan(21);
		assertThat(criado).isEqualTo(new Preset(criado.id(), "Riff", "Descrição de Riff", LocalDate.of(2026, 5, 4),
				rock));
		assertThat(repositorio.buscar(criado.id())).contains(criado);
		assertThat(arquivoChave(criado.id())).isNull();

		Preset alterado = new Preset(criado.id(), "Solo", "Outra descrição", LocalDate.of(2026, 7, 8), outro);
		assertThat(repositorio.atualizar(alterado)).isEqualTo(alterado);
		assertThat(repositorio.buscar(criado.id())).contains(alterado);
		assertThat(repositorio.listarPorPack(rock.id())).isEmpty();
		assertThat(arquivoChave(criado.id())).isNull();
	}

	@Test
	void excluirRemoveOPreset() {
		Preset criado = criar("Riff", LocalDate.of(2026, 5, 4), packNovo(1990));

		repositorio.excluir(criado.id());

		assertThat(repositorio.buscar(criado.id())).isEmpty();
	}
}
