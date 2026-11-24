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
import com.corsinotones.model.Perfil;
import com.corsinotones.model.Usuario;
import com.corsinotones.repository.EquipamentoRepository;
import com.corsinotones.service.TokenService;
import java.sql.Timestamp;
import java.time.Instant;
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

// PCK-01 to PCK-13 and ERR-08 through HTTP on PostgreSQL. The database is shared: new packs live on fresh
// equipments with unique brands, seeded packs are only read, and no test counts every pack.
@SpringBootTest
@Import(BancoDeTeste.class)
@AutoConfigureMockMvc
class PackControllerTest {

	private static final String MSG_NOME = "Informe um nome com 2 a 120 caracteres.";
	private static final String MSG_ESTILO = "Informe um estilo com 2 a 30 caracteres.";
	private static final String MSG_DESCRICAO = "Informe uma descrição de até 500 caracteres.";
	private static final String MSG_PRECO = "Informe um preço entre 0 e 1000000 centavos.";
	private static final String MSG_EQUIPAMENTO = "Equipamento não encontrado.";
	private static final List<String> IDS_DO_SEED = List.of("rock-boss-gt-1000", "metal-boss-gt-1000",
			"blues-boss-gt-1000", "rock-zoom-g6", "clean-zoom-g6", "metal-nux-mg-30", "clean-nux-mg-30",
			"blues-line6-hx-stomp", "rock-line6-hx-stomp");

	@Autowired
	private MockMvc mvc;
	@Autowired
	private TokenService tokens;
	@Autowired
	private JsonMapper json;
	@Autowired
	private EquipamentoRepository equipamentos;
	@Autowired
	private JdbcTemplate jdbc;

	private String admin() {
		return "Bearer " + tokens.gerar(new Usuario(1, "Ryan", "ryan@exemplo.com", "hash", Perfil.ADMIN));
	}

	private Equipamento equipamentoNovo() {
		return equipamentos.criar("m" + UUID.randomUUID().toString().replace("-", "").substring(0, 12), "HX Stomp");
	}

	private static Map<String, Object> corpo(String estilo, Object preco, Object equipamentoId) {
		Map<String, Object> corpo = new LinkedHashMap<>();
		corpo.put("nome", "Pack " + estilo);
		corpo.put("estilo", estilo);
		corpo.put("descricao", "Descrição de " + estilo);
		corpo.put("precoCentavos", preco);
		corpo.put("equipamentoId", equipamentoId);
		return corpo;
	}

	private ResultActions comAdmin(MockHttpServletRequestBuilder pedido) throws Exception {
		return mvc.perform(pedido.header("Authorization", admin()));
	}

	private ResultActions criar(Map<String, Object> corpo) throws Exception {
		return comAdmin(post("/packs").contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(corpo)));
	}

	private ResultActions criarTexto(String corpo) throws Exception {
		return comAdmin(post("/packs").contentType(MediaType.APPLICATION_JSON).content(corpo));
	}

	private ResultActions atualizar(String id, Map<String, Object> corpo) throws Exception {
		return comAdmin(put("/packs/" + id).contentType(MediaType.APPLICATION_JSON)
				.content(json.writeValueAsString(corpo)));
	}

	private static void esperarCampo(ResultActions resposta, String campo, String mensagem) throws Exception {
		resposta.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.status").value(400))
				.andExpect(jsonPath("$.campos.length()").value(1))
				.andExpect(jsonPath("$.campos." + campo).value(mensagem));
	}

	private static void esperarNaoEncontrado(ResultActions resposta) throws Exception {
		resposta.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.status").value(404))
				.andExpect(jsonPath("$.mensagem").value("Pack não encontrado."))
				.andExpect(jsonPath("$.campos").isEmpty());
	}

	private List<JsonNode> listar() throws Exception {
		String resposta = mvc.perform(get("/packs")).andExpect(status().isOk())
				.andReturn().getResponse().getContentAsString();
		List<JsonNode> itens = new ArrayList<>();
		json.readTree(resposta).forEach(itens::add);
		return itens;
	}

	// PCK-01
	@Test
	void listaTrazOsCamposDoMockOrdenadosPorId() throws Exception {
		List<JsonNode> itens = listar();

		assertThat(itens).allSatisfy(item -> assertThat(item.propertyNames()).containsExactlyInAnyOrder("id", "nome",
				"estilo", "marca", "equipamento", "equipamentoId", "descricao", "precoCentavos"));
		assertThat(itens.stream().map(i -> i.get("id").asString()).filter(IDS_DO_SEED::contains)).containsExactly(
				"blues-boss-gt-1000", "blues-line6-hx-stomp", "clean-nux-mg-30", "clean-zoom-g6", "metal-boss-gt-1000",
				"metal-nux-mg-30", "rock-boss-gt-1000", "rock-line6-hx-stomp", "rock-zoom-g6");
		JsonNode cleanNux = itens.stream().filter(i -> i.get("id").asString().equals("clean-nux-mg-30")).findFirst()
				.orElseThrow();
		assertThat(cleanNux.get("marca").asString()).isEqualTo("nux");
		assertThat(cleanNux.get("equipamento").asString()).isEqualTo("MG-30");
		assertThat(cleanNux.get("equipamentoId").asLong()).isEqualTo(3);
	}

	// PCK-02
	@Test
	void buscarDevolveOPackDoSeed() throws Exception {
		mvc.perform(get("/packs/rock-boss-gt-1000"))
				.andExpect(status().isOk())
				.andExpect(content().json("""
						{"id":"rock-boss-gt-1000","nome":"Rock · Boss GT-1000","estilo":"rock","marca":"boss",
						"equipamento":"GT-1000","equipamentoId":1,
						"descricao":"Do crunch britânico ao solo de arena, prontos para a sua GT-1000.","precoCentavos":4990}
						""", JsonCompareMode.STRICT));
	}

	// PCK-03 (the spec's example) and PCK-05.
	@Test
	void adminCriaPackComOIdEmSlugEDepoisOExclui() throws Exception {
		criar(corpo("clean", 2990, 4))
				.andExpect(status().isCreated())
				.andExpect(content().json("""
						{"id":"clean-line6-hx-stomp","nome":"Pack clean","estilo":"clean","marca":"line6",
						"equipamento":"HX Stomp","equipamentoId":4,"descricao":"Descrição de clean","precoCentavos":2990}
						""", JsonCompareMode.STRICT));
		mvc.perform(get("/packs/clean-line6-hx-stomp")).andExpect(jsonPath("$.precoCentavos").value(2990));

		comAdmin(delete("/packs/clean-line6-hx-stomp")).andExpect(status().isNoContent())
				.andExpect(content().string(""));
		esperarNaoEncontrado(mvc.perform(get("/packs/clean-line6-hx-stomp")));
	}

	@Test
	void estiloEAparadoEMinusculoAntesDoSlug() throws Exception {
		Equipamento equipamento = equipamentoNovo();
		criar(corpo("  Clássico ", 1990, equipamento.id()))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.id").value("classico-" + equipamento.marca() + "-hx-stomp"))
				.andExpect(jsonPath("$.estilo").value("clássico"));
	}

	// PCK-04 and the spec's edge case: the id stays when estilo and equipment change.
	@Test
	void adminAtualizaEOIdNaoMuda() throws Exception {
		Equipamento equipamento = equipamentoNovo();
		Equipamento outro = equipamentoNovo();
		String id = "rock-" + equipamento.marca() + "-hx-stomp";
		criar(corpo("rock", 1990, equipamento.id())).andExpect(status().isCreated());

		Map<String, Object> novo = corpo("blues", 3990, outro.id());
		atualizar(id, novo)
				.andExpect(status().isOk())
				.andExpect(content().json("{\"id\":\"" + id + "\",\"nome\":\"Pack blues\",\"estilo\":\"blues\","
						+ "\"marca\":\"" + outro.marca() + "\",\"equipamento\":\"HX Stomp\",\"equipamentoId\":"
						+ outro.id() + ",\"descricao\":\"Descrição de blues\",\"precoCentavos\":3990}",
						JsonCompareMode.STRICT));
		mvc.perform(get("/packs/" + id)).andExpect(jsonPath("$.estilo").value("blues"))
				.andExpect(jsonPath("$.precoCentavos").value(3990));
	}

	// PCK-06
	@Test
	void nomeCom2E120CaracteresEAceito() throws Exception {
		Equipamento equipamento = equipamentoNovo();
		Map<String, Object> curto = corpo("rock", 1990, equipamento.id());
		curto.put("nome", " ab ");
		criar(curto).andExpect(status().isCreated()).andExpect(jsonPath("$.nome").value("ab"));
		Map<String, Object> longo = corpo("metal", 1990, equipamento.id());
		longo.put("nome", "n".repeat(120));
		criar(longo).andExpect(status().isCreated());
	}

	@Test
	void nomeCom1Ou121CaracteresERejeitado() throws Exception {
		for (String nome : new String[] {"  a  ", "n".repeat(121)}) {
			Map<String, Object> corpo = corpo("rock", 1990, 1);
			corpo.put("nome", nome);
			esperarCampo(criar(corpo), "nome", MSG_NOME);
		}
	}

	// PCK-07
	@Test
	void estiloCom2E30CaracteresEAceito() throws Exception {
		Equipamento equipamento = equipamentoNovo();
		criar(corpo("ab", 1990, equipamento.id())).andExpect(status().isCreated());
		criar(corpo("e".repeat(30), 1990, equipamento.id())).andExpect(status().isCreated());
	}

	@Test
	void estiloCom1Ou31CaracteresERejeitado() throws Exception {
		esperarCampo(criar(corpo(" a ", 1990, 1)), "estilo", MSG_ESTILO);
		esperarCampo(criar(corpo("e".repeat(31), 1990, 1)), "estilo", MSG_ESTILO);
	}

	// PCK-08
	@Test
	void descricaoDe500CaracteresEAceita() throws Exception {
		Map<String, Object> corpo = corpo("rock", 1990, equipamentoNovo().id());
		corpo.put("descricao", "d".repeat(500));
		criar(corpo).andExpect(status().isCreated());
	}

	@Test
	void descricaoAusenteOuCom501CaracteresERejeitada() throws Exception {
		Map<String, Object> longa = corpo("rock", 1990, 1);
		longa.put("descricao", "d".repeat(501));
		esperarCampo(criar(longa), "descricao", MSG_DESCRICAO);
		Map<String, Object> ausente = corpo("rock", 1990, 1);
		ausente.remove("descricao");
		esperarCampo(criar(ausente), "descricao", MSG_DESCRICAO);
	}

	// PCK-09 and the spec's edge case: exactly 0 and 1000000 are accepted.
	@Test
	void preco0E1000000SaoAceitos() throws Exception {
		Equipamento equipamento = equipamentoNovo();
		criar(corpo("rock", 0, equipamento.id())).andExpect(status().isCreated())
				.andExpect(jsonPath("$.precoCentavos").value(0));
		criar(corpo("metal", 1000000, equipamento.id())).andExpect(status().isCreated())
				.andExpect(jsonPath("$.precoCentavos").value(1000000));
	}

	@Test
	void precoNegativoAcimaDoLimiteFracionarioOuAusenteERejeitado() throws Exception {
		for (Object preco : new Object[] {-1, 1000001, 49.5, null}) {
			esperarCampo(criar(corpo("rock", preco, 1)), "precoCentavos", MSG_PRECO);
		}
	}

	// ERR-08 and the spec's edge case: a field of the wrong JSON type is an unreadable body.
	@Test
	void campoDeTipoErradoDevolveCorpoInvalido() throws Exception {
		for (Map<String, Object> corpo : List.of(corpo("rock", "abc", 1), corpo("rock", 1990, "x"))) {
			criar(corpo)
					.andExpect(status().isBadRequest())
					.andExpect(jsonPath("$.status").value(400))
					.andExpect(jsonPath("$.mensagem").value("Corpo da requisição inválido."))
					.andExpect(jsonPath("$.campos").isEmpty());
		}
	}

	@Test
	void jsonQuebradoDevolveCorpoInvalido() throws Exception {
		criarTexto("{\"nome\":")
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.mensagem").value("Corpo da requisição inválido."))
				.andExpect(jsonPath("$.campos").isEmpty());
	}

	// PCK-10
	@Test
	void equipamentoAusenteOuDesconhecidoDevolve400NoCampo() throws Exception {
		esperarCampo(criar(corpo("rock", 1990, null)), "equipamentoId", MSG_EQUIPAMENTO);
		esperarCampo(criar(corpo("rock", 1990, 999999)), "equipamentoId", MSG_EQUIPAMENTO);
		esperarCampo(atualizar("rock-boss-gt-1000", corpo("rock", 1990, 999999)), "equipamentoId", MSG_EQUIPAMENTO);
		mvc.perform(get("/packs/rock-boss-gt-1000")).andExpect(jsonPath("$.equipamentoId").value(1));
	}

	// PCK-11
	@Test
	void mesmoEstiloNoMesmoEquipamentoDevolve409NoCriar() throws Exception {
		criar(corpo(" ROCK ", 1990, 1))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.status").value(409))
				.andExpect(jsonPath("$.mensagem").value("Já existe um pack deste estilo para este equipamento."))
				.andExpect(jsonPath("$.campos").isEmpty());
		mvc.perform(get("/packs/rock-boss-gt-1000")).andExpect(jsonPath("$.precoCentavos").value(4990));
	}

	@Test
	void mudarParaUmEstiloJaUsadoNoEquipamentoDevolve409ENaoAltera() throws Exception {
		Equipamento equipamento = equipamentoNovo();
		criar(corpo("rock", 1990, equipamento.id())).andExpect(status().isCreated());
		String metal = "metal-" + equipamento.marca() + "-hx-stomp";
		criar(corpo("metal", 2990, equipamento.id())).andExpect(status().isCreated());

		atualizar(metal, corpo("rock", 3990, equipamento.id()))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.mensagem").value("Já existe um pack deste estilo para este equipamento."));
		mvc.perform(get("/packs/" + metal)).andExpect(jsonPath("$.estilo").value("metal"))
				.andExpect(jsonPath("$.precoCentavos").value(2990));
	}

	// PCK-12: a pack with presets, and a pack in an order.
	@Test
	void excluirPackComPresetsDevolve409ENaoExclui() throws Exception {
		comAdmin(delete("/packs/metal-nux-mg-30"))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.status").value(409))
				.andExpect(jsonPath("$.mensagem").value("Este pack tem presets ou pedidos e não pode ser excluído."))
				.andExpect(jsonPath("$.campos").isEmpty());
		mvc.perform(get("/packs/metal-nux-mg-30")).andExpect(status().isOk());
	}

	@Test
	void excluirPackEmPedidoDevolve409ENaoExclui() throws Exception {
		Equipamento equipamento = equipamentoNovo();
		String id = "rock-" + equipamento.marca() + "-hx-stomp";
		criar(corpo("rock", 1990, equipamento.id())).andExpect(status().isCreated());
		// The order belongs to a user of its own, so no other test sees it among the seeded user's orders.
		Long comprador = jdbc.queryForObject("INSERT INTO usuario (nome, email, senha_hash) VALUES ('Comprador', ?, 'x')"
				+ " RETURNING id", Long.class, "c" + UUID.randomUUID() + "@exemplo.com");
		Long pedido = jdbc.queryForObject("INSERT INTO pedido (usuario_id, status, total_centavos, criado_em)"
				+ " VALUES (?, 'pago', 1990, ?) RETURNING id", Long.class, comprador, Timestamp.from(Instant.now()));
		jdbc.update("INSERT INTO item_pedido (pedido_id, pack_id, preco_centavos) VALUES (?, ?, 1990)", pedido, id);

		comAdmin(delete("/packs/" + id))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.mensagem").value("Este pack tem presets ou pedidos e não pode ser excluído."));
		mvc.perform(get("/packs/" + id)).andExpect(status().isOk());
	}

	// PCK-13
	@Test
	void idDesconhecidoDevolve404EmGetPutEDelete() throws Exception {
		esperarNaoEncontrado(mvc.perform(get("/packs/nao-existe")));
		esperarNaoEncontrado(atualizar("nao-existe", corpo("rock", 1990, 1)));
		esperarNaoEncontrado(comAdmin(delete("/packs/nao-existe")));
	}

	// ERR-03: a COMUM user is refused and nothing is created.
	@Test
	void usuarioComumNaoCria() throws Exception {
		Equipamento equipamento = equipamentoNovo();
		String comum = "Bearer " + tokens.gerar(new Usuario(999, "Ana", "ana@exemplo.com", "hash", Perfil.COMUM));

		mvc.perform(post("/packs").header("Authorization", comum).contentType(MediaType.APPLICATION_JSON)
						.content(json.writeValueAsString(corpo("rock", 1990, equipamento.id()))))
				.andExpect(status().isForbidden());
		mvc.perform(get("/packs/rock-" + equipamento.marca() + "-hx-stomp")).andExpect(status().isNotFound());
	}
}
