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
import com.corsinotones.model.Perfil;
import com.corsinotones.model.Usuario;
import com.corsinotones.service.TokenService;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.json.JsonCompareMode;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

// EQP-01 to EQP-09 through HTTP on PostgreSQL. The database is shared: new equipments use unique brands,
// the seeded rows (ids 1 to 4) are only read, and no test counts every equipment.
@SpringBootTest
@Import(BancoDeTeste.class)
@AutoConfigureMockMvc
class EquipamentoControllerTest {

	private static final String MSG_MARCA = "Informe a marca com 1 a 50 caracteres.";
	private static final String MSG_MODELO = "Informe o modelo com 1 a 50 caracteres.";

	@Autowired
	private MockMvc mvc;
	@Autowired
	private TokenService tokens;
	@Autowired
	private JsonMapper json;

	private String admin() {
		return "Bearer " + tokens.gerar(new Usuario(1, "Ryan", "ryan@exemplo.com", "hash", Perfil.ADMIN));
	}

	private static String marcaUnica() {
		return "m" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
	}

	private static String corpo(String marca, String modelo) {
		return "{\"marca\":" + (marca == null ? "null" : "\"" + marca + "\"")
				+ ",\"modelo\":" + (modelo == null ? "null" : "\"" + modelo + "\"") + "}";
	}

	private ResultActions comAdmin(MockHttpServletRequestBuilder pedido) throws Exception {
		return mvc.perform(pedido.header("Authorization", admin()));
	}

	private ResultActions criar(String corpo) throws Exception {
		return comAdmin(post("/equipamentos").contentType(MediaType.APPLICATION_JSON).content(corpo));
	}

	private ResultActions atualizar(long id, String corpo) throws Exception {
		return comAdmin(put("/equipamentos/" + id).contentType(MediaType.APPLICATION_JSON).content(corpo));
	}

	private long criarEObterId(String marca, String modelo) throws Exception {
		String resposta = criar(corpo(marca, modelo)).andExpect(status().isCreated())
				.andReturn().getResponse().getContentAsString();
		return json.readTree(resposta).get("id").asLong();
	}

	private List<JsonNode> listar() throws Exception {
		String resposta = mvc.perform(get("/equipamentos")).andExpect(status().isOk())
				.andReturn().getResponse().getContentAsString();
		List<JsonNode> itens = new ArrayList<>();
		json.readTree(resposta).forEach(itens::add);
		return itens;
	}

	private static void esperarNaoEncontrado(ResultActions resposta) throws Exception {
		resposta.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.status").value(404))
				.andExpect(jsonPath("$.mensagem").value("Equipamento não encontrado."))
				.andExpect(jsonPath("$.campos").isEmpty());
	}

	// EQP-01
	@Test
	void listaDevolveIdMarcaEModeloOrdenadosPorMarcaEModelo() throws Exception {
		String base = marcaUnica();
		long bA = criarEObterId(base + "b", "a");
		long aB = criarEObterId(base + "a", "b");
		long aA = criarEObterId(base + "a", "a");

		List<JsonNode> itens = listar();

		assertThat(itens).allSatisfy(item -> assertThat(item.propertyNames()).containsExactlyInAnyOrder("id", "marca", "modelo"));
		assertThat(itens.stream().filter(i -> i.get("id").asLong() <= 4)
				.map(i -> i.get("id").asLong() + " " + i.get("marca").asString() + " " + i.get("modelo").asString()))
				.containsExactly("1 boss GT-1000", "4 line6 HX Stomp", "3 nux MG-30", "2 zoom G6");
		assertThat(itens.stream().map(i -> i.get("id").asLong()).filter(id -> id == aA || id == aB || id == bA))
				.containsExactly(aA, aB, bA);
	}

	// EQP-02
	@Test
	void buscarDevolveOEquipamento() throws Exception {
		mvc.perform(get("/equipamentos/3"))
				.andExpect(status().isOk())
				.andExpect(content().json("{\"id\":3,\"marca\":\"nux\",\"modelo\":\"MG-30\"}", JsonCompareMode.STRICT));
	}

	// EQP-03
	@Test
	void adminCriaComMarcaAparadaEMinusculaEModeloAparado() throws Exception {
		String marca = marcaUnica();
		criar(corpo("  " + marca.toUpperCase(Locale.ROOT) + " ", "  Modelo X  "))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.id").isNumber())
				.andExpect(jsonPath("$.marca").value(marca))
				.andExpect(jsonPath("$.modelo").value("Modelo X"));
	}

	// EQP-04
	@Test
	void adminAtualizaMarcaEModelo() throws Exception {
		long id = criarEObterId(marcaUnica(), "Antigo");
		String nova = marcaUnica();

		atualizar(id, corpo(nova, "Novo"))
				.andExpect(status().isOk())
				.andExpect(content().json("{\"id\":" + id + ",\"marca\":\"" + nova + "\",\"modelo\":\"Novo\"}", JsonCompareMode.STRICT));
		mvc.perform(get("/equipamentos/" + id)).andExpect(jsonPath("$.modelo").value("Novo"));
	}

	// EQP-05
	@Test
	void adminExcluiEquipamentoSemPacksEDepoisEle404() throws Exception {
		long id = criarEObterId(marcaUnica(), "Apagar");

		comAdmin(delete("/equipamentos/" + id)).andExpect(status().isNoContent())
				.andExpect(content().string(""));
		esperarNaoEncontrado(mvc.perform(get("/equipamentos/" + id)));
	}

	// EQP-06: boundaries 50/51 on each field, empty after trimming, missing, and both fields at once.
	@Test
	void marcaEModeloCom50CaracteresSaoAceitos() throws Exception {
		String marca = (marcaUnica() + "a".repeat(50)).substring(0, 50);
		criar(corpo(marca, "m".repeat(50)))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.marca").value(marca))
				.andExpect(jsonPath("$.modelo").value("m".repeat(50)));
	}

	@Test
	void marcaCom51CaracteresERejeitada() throws Exception {
		criar(corpo("a".repeat(51), "Modelo"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.campos.length()").value(1))
				.andExpect(jsonPath("$.campos.marca").value(MSG_MARCA));
	}

	@Test
	void modeloCom51CaracteresERejeitado() throws Exception {
		criar(corpo(marcaUnica(), "m".repeat(51)))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.campos.length()").value(1))
				.andExpect(jsonPath("$.campos.modelo").value(MSG_MODELO));
	}

	// 50 characters plus surrounding spaces is still 50 after trimming.
	@Test
	void espacosEmVoltaNaoContamNoLimite() throws Exception {
		criar(corpo(marcaUnica(), "  " + "m".repeat(50) + "  ")).andExpect(status().isCreated());
	}

	@Test
	void camposVaziosDepoisDeAparadosSaoListadosJuntos() throws Exception {
		criar(corpo("   ", " "))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.status").value(400))
				.andExpect(jsonPath("$.campos.length()").value(2))
				.andExpect(jsonPath("$.campos.marca").value(MSG_MARCA))
				.andExpect(jsonPath("$.campos.modelo").value(MSG_MODELO));
	}

	@Test
	void camposAusentesSaoListadosJuntosTambemNoPut() throws Exception {
		atualizar(1, corpo(null, null))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.campos.length()").value(2))
				.andExpect(jsonPath("$.campos.marca").value(MSG_MARCA))
				.andExpect(jsonPath("$.campos.modelo").value(MSG_MODELO));
		mvc.perform(get("/equipamentos/1")).andExpect(jsonPath("$.marca").value("boss"));
	}

	// EQP-07, with the spec's edge case: "  BOSS " is stored as boss and collides with the seeded Boss GT-1000.
	@Test
	void criarParExistenteDevolve409ENaoCria() throws Exception {
		criar(corpo("  BOSS ", "GT-1000"))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.status").value(409))
				.andExpect(jsonPath("$.mensagem").value("Este equipamento já está cadastrado."))
				.andExpect(jsonPath("$.campos").isEmpty());
		assertThat(listar().stream().filter(i -> i.get("marca").asString().equals("boss")
				&& i.get("modelo").asString().equals("GT-1000"))).hasSize(1);
	}

	@Test
	void atualizarParaOParDeOutroDevolve409ENaoAltera() throws Exception {
		String marca = marcaUnica();
		long id = criarEObterId(marca, "Original");

		atualizar(id, corpo("Boss", "GT-1000"))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.mensagem").value("Este equipamento já está cadastrado."));
		mvc.perform(get("/equipamentos/" + id))
				.andExpect(content().json("{\"id\":" + id + ",\"marca\":\"" + marca + "\",\"modelo\":\"Original\"}", JsonCompareMode.STRICT));
	}

	@Test
	void atualizarComOProprioParNaoEConflito() throws Exception {
		String marca = marcaUnica();
		long id = criarEObterId(marca, "Mesmo");

		atualizar(id, corpo(marca, "Mesmo")).andExpect(status().isOk());
	}

	// EQP-08
	@Test
	void excluirEquipamentoComPacksDevolve409ENaoExclui() throws Exception {
		comAdmin(delete("/equipamentos/1"))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.status").value(409))
				.andExpect(jsonPath("$.mensagem").value("Este equipamento tem packs e não pode ser excluído."))
				.andExpect(jsonPath("$.campos").isEmpty());
		mvc.perform(get("/equipamentos/1")).andExpect(status().isOk());
	}

	// EQP-09
	@Test
	void idDesconhecidoDevolve404EmGetPutEDelete() throws Exception {
		esperarNaoEncontrado(mvc.perform(get("/equipamentos/999999")));
		esperarNaoEncontrado(atualizar(999999, corpo(marcaUnica(), "Qualquer")));
		esperarNaoEncontrado(comAdmin(delete("/equipamentos/999999")));
	}

	// ERR-07
	@Test
	void idQueNaoENumeroDevolve400() throws Exception {
		mvc.perform(get("/equipamentos/abc"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.mensagem").value("Identificador inválido."));
	}

	// ERR-03: a COMUM user is refused and nothing is created.
	@Test
	void usuarioComumNaoCria() throws Exception {
		String marca = marcaUnica();
		String comum = "Bearer " + tokens.gerar(new Usuario(999, "Ana", "ana@exemplo.com", "hash", Perfil.COMUM));

		mvc.perform(post("/equipamentos").header("Authorization", comum)
						.contentType(MediaType.APPLICATION_JSON).content(corpo(marca, "Bloqueado")))
				.andExpect(status().isForbidden());
		assertThat(listar()).noneMatch(i -> i.get("marca").asString().equals(marca));
	}
}
