package com.corsinotones.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.corsinotones.BancoDeTeste;
import com.corsinotones.model.Equipamento;
import com.corsinotones.model.Pack;
import com.corsinotones.model.Perfil;
import com.corsinotones.model.Usuario;
import com.corsinotones.repository.EquipamentoRepository;
import com.corsinotones.repository.PackRepository;
import com.corsinotones.service.TokenService;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.json.JsonCompareMode;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

// PRS-01 to PRS-12 and ERR-07 through HTTP on PostgreSQL. The database is shared: new presets live in fresh packs
// on fresh equipments, seeded presets are only read, and no test counts every preset.
@SpringBootTest
@Import(BancoDeTeste.class)
@AutoConfigureMockMvc
class PresetControllerTest {

	private static final String MSG_NOME = "Informe um nome com 2 a 120 caracteres.";
	private static final String MSG_DESCRICAO = "Informe uma descrição de até 500 caracteres.";
	private static final String MSG_DATA = "Informe a data no formato AAAA-MM-DD.";
	private static final String MSG_PACK = "Pack não encontrado.";

	@Autowired
	private MockMvc mvc;
	@Autowired
	private TokenService tokens;
	@Autowired
	private JsonMapper json;
	@Autowired
	private EquipamentoRepository equipamentos;
	@Autowired
	private PackRepository packs;
	@Autowired
	private JdbcTemplate jdbc;

	private String admin() {
		return "Bearer " + tokens.gerar(new Usuario(1, "Ryan", "ryan@exemplo.com", "hash", Perfil.ADMIN));
	}

	// Style and brand differ per pack, so a preset shown with the wrong pack would show (lesson L-014).
	private Pack packNovo(String estilo) {
		Equipamento equipamento = equipamentos.criar("m" + UUID.randomUUID().toString().replace("-", "")
				.substring(0, 12), "HX Stomp");
		return packs.criar(new Pack(estilo + "-" + equipamento.marca(), "Pack " + estilo, estilo, "Descrição", 1990,
				equipamento));
	}

	private static Map<String, Object> corpo(String nome, Object data, Object packId) {
		Map<String, Object> corpo = new LinkedHashMap<>();
		corpo.put("nome", nome);
		corpo.put("descricao", "Descrição de " + nome);
		corpo.put("data", data);
		corpo.put("packId", packId);
		return corpo;
	}

	private ResultActions comAdmin(MockHttpServletRequestBuilder pedido) throws Exception {
		return mvc.perform(pedido.header("Authorization", admin()));
	}

	private ResultActions criar(Map<String, Object> corpo) throws Exception {
		return comAdmin(post("/presets").contentType(MediaType.APPLICATION_JSON)
				.content(json.writeValueAsString(corpo)));
	}

	private ResultActions atualizar(Object id, Map<String, Object> corpo) throws Exception {
		return comAdmin(put("/presets/" + id).contentType(MediaType.APPLICATION_JSON)
				.content(json.writeValueAsString(corpo)));
	}

	private long idCriado(Map<String, Object> corpo) throws Exception {
		String resposta = criar(corpo).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
		return json.readTree(resposta).get("id").asLong();
	}

	private static void esperarCampo(ResultActions resposta, String campo, String mensagem) throws Exception {
		resposta.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.status").value(400))
				.andExpect(jsonPath("$.mensagem").value("Dados inválidos."))
				.andExpect(jsonPath("$.campos.length()").value(1))
				.andExpect(jsonPath("$.campos." + campo).value(mensagem));
	}

	private static void esperarNaoEncontrado(ResultActions resposta) throws Exception {
		resposta.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.status").value(404))
				.andExpect(jsonPath("$.mensagem").value("Preset não encontrado."))
				.andExpect(jsonPath("$.campos").isEmpty());
	}

	private List<JsonNode> listar(String url) throws Exception {
		String resposta = mvc.perform(get(url)).andExpect(status().isOk())
				.andReturn().getResponse().getContentAsString();
		List<JsonNode> itens = new ArrayList<>();
		json.readTree(resposta).forEach(itens::add);
		return itens;
	}

	private static List<Long> ids(List<JsonNode> itens) {
		return itens.stream().map(i -> i.get("id").asLong()).toList();
	}

	private String arquivoChave(long id) {
		return jdbc.queryForObject("SELECT arquivo_chave FROM preset WHERE id = ?", String.class, id);
	}

	private static String esperado(long id, String nome, String data, Pack pack) {
		return "{\"id\":" + id + ",\"nome\":\"" + nome + "\",\"estilo\":\"" + pack.estilo() + "\",\"marca\":\""
				+ pack.equipamento().marca() + "\",\"equipamento\":\"" + pack.equipamento().modelo() + "\",\"data\":\""
				+ data + "\",\"descricao\":\"Descrição de " + nome + "\",\"packId\":\"" + pack.id() + "\"}";
	}

	// PRS-01 and PRS-12: the mock's fields and nothing else; the seed's dates all differ, so only date order
	// gives this sequence.
	@Test
	void listaTrazOsCamposDoMockOrdenadosPorDataDecrescente() throws Exception {
		List<JsonNode> itens = listar("/presets");

		assertThat(itens).allSatisfy(item -> assertThat(item.propertyNames()).containsExactlyInAnyOrder("id", "nome",
				"estilo", "marca", "equipamento", "data", "descricao", "packId"));
		assertThat(ids(itens).stream().filter(id -> id <= 21)).containsExactly(2L, 3L, 21L, 9L, 12L, 1L, 11L, 5L, 19L,
				6L, 7L, 17L, 13L, 4L, 8L, 14L, 10L, 18L, 16L, 20L, 15L);
		JsonNode arena = itens.stream().filter(i -> i.get("id").asLong() == 7).findFirst().orElseThrow();
		assertThat(arena.get("estilo").asString()).isEqualTo("rock");
		assertThat(arena.get("marca").asString()).isEqualTo("boss");
		assertThat(arena.get("equipamento").asString()).isEqualTo("GT-1000");
		assertThat(arena.get("data").asString()).isEqualTo("2026-05-02");
		assertThat(arena.get("packId").asString()).isEqualTo("rock-boss-gt-1000");
	}

	// PRS-01: two presets of one day come by id ascending.
	@Test
	void mesmoDiaOrdenaPorIdCrescente() throws Exception {
		Pack pack = packNovo("rock");
		long janeiro = idCriado(corpo("Janeiro", "2026-01-10", pack.id()));
		long marco1 = idCriado(corpo("Março 1", "2026-03-05", pack.id()));
		long fevereiro = idCriado(corpo("Fevereiro", "2026-02-01", pack.id()));
		long marco2 = idCriado(corpo("Março 2", "2026-03-05", pack.id()));
		List<Long> meus = List.of(janeiro, marco1, fevereiro, marco2);

		assertThat(ids(listar("/presets")).stream().filter(meus::contains))
				.containsExactly(marco1, marco2, fevereiro, janeiro);
	}

	// PRS-02
	@Test
	void filtroPorPackDevolveSoOsPresetsDoPack() throws Exception {
		List<JsonNode> doPack = listar("/presets?packId=metal-nux-mg-30");

		assertThat(ids(doPack)).containsExactly(21L, 1L, 13L);
		assertThat(doPack).allSatisfy(item -> assertThat(item.get("packId").asString()).isEqualTo("metal-nux-mg-30"));
		mvc.perform(get("/presets?packId=nao-existe")).andExpect(status().isOk())
				.andExpect(content().json("[]", JsonCompareMode.STRICT));
		mvc.perform(get("/presets?packId=" + packNovo("rock").id())).andExpect(status().isOk())
				.andExpect(content().json("[]", JsonCompareMode.STRICT));
	}

	// PRS-03
	@Test
	void buscarDevolveOPresetDoSeed() throws Exception {
		mvc.perform(get("/presets/1"))
				.andExpect(status().isOk())
				.andExpect(content().json("""
						{"id":1,"nome":"Djent Preciso","estilo":"metal","marca":"nux","equipamento":"MG-30",
						"data":"2026-06-25","descricao":"Ataque definido, graves firmes e noise gate agressivo.",
						"packId":"metal-nux-mg-30"}
						""", JsonCompareMode.STRICT));
	}

	// PRS-04, PRS-06 and PRS-12 (no arquivoChave in the response).
	@Test
	void adminCriaPresetEDepoisOExclui() throws Exception {
		Pack pack = packNovo("rock");
		String resposta = criar(corpo("Riff", "2026-05-04", pack.id()))
				.andExpect(status().isCreated())
				.andReturn().getResponse().getContentAsString();
		long id = json.readTree(resposta).get("id").asLong();

		assertThat(id).isGreaterThan(21);
		mvc.perform(get("/presets/" + id)).andExpect(status().isOk())
				.andExpect(content().json(esperado(id, "Riff", "2026-05-04", pack), JsonCompareMode.STRICT));
		assertThat(json.readTree(resposta)).isEqualTo(json.readTree(esperado(id, "Riff", "2026-05-04", pack)));

		comAdmin(delete("/presets/" + id)).andExpect(status().isNoContent()).andExpect(content().string(""));
		esperarNaoEncontrado(mvc.perform(get("/presets/" + id)));
	}

	// PRS-05: the preset moves to another pack.
	@Test
	void adminAtualizaEMoveOPresetParaOutroPack() throws Exception {
		Pack rock = packNovo("rock");
		Pack metal = packNovo("metal");
		long id = idCriado(corpo("Riff", "2026-05-04", rock.id()));

		atualizar(id, corpo("Solo", "2026-07-08", metal.id()))
				.andExpect(status().isOk())
				.andExpect(content().json(esperado(id, "Solo", "2026-07-08", metal), JsonCompareMode.STRICT));
		mvc.perform(get("/presets/" + id))
				.andExpect(content().json(esperado(id, "Solo", "2026-07-08", metal), JsonCompareMode.STRICT));
		assertThat(listar("/presets?packId=" + rock.id())).isEmpty();
		assertThat(ids(listar("/presets?packId=" + metal.id()))).containsExactly(id);
	}

	// PRS-07
	@Test
	void nomeCom2E120CaracteresEAceito() throws Exception {
		String pack = packNovo("rock").id();
		criar(corpo(" ab ", "2026-05-04", pack)).andExpect(status().isCreated()).andExpect(jsonPath("$.nome").value("ab"));
		criar(corpo("n".repeat(120), "2026-05-04", pack)).andExpect(status().isCreated());
	}

	@Test
	void nomeCom1Ou121CaracteresOuAusenteERejeitado() throws Exception {
		for (String nome : new String[] {"  a  ", "n".repeat(121), null}) {
			esperarCampo(criar(corpo(nome, "2026-05-04", "rock-boss-gt-1000")), "nome", MSG_NOME);
		}
	}

	// PRS-08
	@Test
	void descricaoDe500CaracteresEAceita() throws Exception {
		Map<String, Object> corpo = corpo("Riff", "2026-05-04", packNovo("rock").id());
		corpo.put("descricao", " " + "d".repeat(500) + " ");
		criar(corpo).andExpect(status().isCreated()).andExpect(jsonPath("$.descricao").value("d".repeat(500)));
	}

	@Test
	void descricaoAusenteOuCom501CaracteresERejeitada() throws Exception {
		for (String descricao : new String[] {null, "d".repeat(501)}) {
			Map<String, Object> corpo = corpo("Riff", "2026-05-04", "rock-boss-gt-1000");
			corpo.put("descricao", descricao);
			esperarCampo(criar(corpo), "descricao", MSG_DESCRICAO);
		}
	}

	// PRS-09 and the spec's edge case: only a real date written YYYY-MM-DD passes. "x2026-06-25" and
	// "2026-06-25T10:00" hold a valid date inside invalid text (lesson L-002).
	@Test
	void dataQueNaoEUmDiaRealEmAAAAMMDDERejeitada() throws Exception {
		for (String data : new String[] {"2026-02-30", "2026-2-3", "25/06/2026", "x2026-06-25", "2026-06-25T10:00",
				"2025-02-29", "", null}) {
			esperarCampo(criar(corpo("Riff", data, "rock-boss-gt-1000")), "data", MSG_DATA);
		}
		esperarCampo(atualizar(1, corpo("Riff", "2026-02-30", "metal-nux-mg-30")), "data", MSG_DATA);
		mvc.perform(get("/presets/1")).andExpect(jsonPath("$.data").value("2026-06-25"));
	}

	@Test
	void diaVinteENoveDeFevereiroEmAnoBissextoEAceito() throws Exception {
		criar(corpo("Riff", "2028-02-29", packNovo("rock").id()))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.data").value("2028-02-29"));
	}

	// PRS-10
	@Test
	void packAusenteOuDesconhecidoDevolve400NoCampo() throws Exception {
		esperarCampo(criar(corpo("Riff", "2026-05-04", null)), "packId", MSG_PACK);
		esperarCampo(criar(corpo("Riff", "2026-05-04", "nao-existe")), "packId", MSG_PACK);
		esperarCampo(atualizar(1, corpo("Riff", "2026-05-04", "nao-existe")), "packId", MSG_PACK);
		mvc.perform(get("/presets/1")).andExpect(jsonPath("$.packId").value("metal-nux-mg-30"))
				.andExpect(jsonPath("$.nome").value("Djent Preciso"));
	}

	// PRS-11
	@Test
	void idDesconhecidoDevolve404EmGetPutEDelete() throws Exception {
		esperarNaoEncontrado(mvc.perform(get("/presets/999999")));
		esperarNaoEncontrado(atualizar(999999, corpo("Riff", "2026-05-04", "rock-boss-gt-1000")));
		esperarNaoEncontrado(comAdmin(delete("/presets/999999")));
	}

	// ERR-07
	@Test
	void idQueNaoENumeroDevolve400() throws Exception {
		mvc.perform(get("/presets/abc"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.status").value(400))
				.andExpect(jsonPath("$.mensagem").value("Identificador inválido."))
				.andExpect(jsonPath("$.campos").isEmpty());
	}

	// PRS-12: a client cannot set the file key, on creation or on update.
	@Test
	void arquivoChaveNoCorpoNaoEGravado() throws Exception {
		Pack pack = packNovo("rock");
		Map<String, Object> comChave = corpo("Riff", "2026-05-04", pack.id());
		comChave.put("arquivoChave", "presets/intruso.tsl");

		String resposta = criar(comChave).andExpect(status().isCreated())
				.andReturn().getResponse().getContentAsString();
		long id = json.readTree(resposta).get("id").asLong();
		assertThat(json.readTree(resposta).has("arquivoChave")).isFalse();
		assertThat(arquivoChave(id)).isNull();

		atualizar(id, comChave).andExpect(status().isOk())
				.andExpect(content().json(esperado(id, "Riff", "2026-05-04", pack), JsonCompareMode.STRICT));
		assertThat(arquivoChave(id)).isNull();
	}
}
