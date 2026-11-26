package com.corsinotones.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.corsinotones.BancoDeTeste;
import com.corsinotones.model.Equipamento;
import com.corsinotones.model.Pack;
import com.corsinotones.model.Perfil;
import com.corsinotones.model.Usuario;
import com.corsinotones.repository.EquipamentoRepository;
import com.corsinotones.repository.PackRepository;
import com.corsinotones.repository.UsuarioRepository;
import com.corsinotones.service.TokenService;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

// PED-01 to PED-09 through HTTP on PostgreSQL (PED-10 is in PedidoControllerFalhaTest). The database is shared, so
// every test makes its own users and packs and never counts rows it did not create.
@SpringBootTest
@Import(BancoDeTeste.class)
@AutoConfigureMockMvc
class PedidoControllerTest {

	@Autowired
	private MockMvc mvc;
	@Autowired
	private TokenService tokens;
	@Autowired
	private JsonMapper json;
	@Autowired
	private UsuarioRepository usuarios;
	@Autowired
	private EquipamentoRepository equipamentos;
	@Autowired
	private PackRepository packs;

	private Usuario usuarioNovo() {
		String sufixo = UUID.randomUUID().toString().replace("-", "");
		return usuarios.criar("Cliente", "c" + sufixo + "@exemplo.com", "hash").orElseThrow();
	}

	private static String bearer(String token) {
		return "Bearer " + token;
	}

	private String token(Usuario usuario) {
		return bearer(tokens.gerar(usuario));
	}

	private Pack packNovo(int precoCentavos) {
		String sufixo = UUID.randomUUID().toString().replace("-", "").substring(0, 12);
		Equipamento equipamento = equipamentos.criar("m" + sufixo, "Modelo");
		return packs.criar(new Pack("p-" + sufixo, "Pack " + sufixo, "rock", "Descrição", precoCentavos, equipamento));
	}

	private ResultActions criar(String token, Object corpo) throws Exception {
		return mvc.perform(autenticado(post("/pedidos"), token).contentType(MediaType.APPLICATION_JSON)
				.content(json.writeValueAsString(corpo)));
	}

	private ResultActions listar(String token, String consulta) throws Exception {
		return mvc.perform(autenticado(get("/pedidos" + consulta), token));
	}

	private ResultActions buscar(String token, long id) throws Exception {
		return mvc.perform(autenticado(get("/pedidos/" + id), token));
	}

	private static MockHttpServletRequestBuilder autenticado(MockHttpServletRequestBuilder pedido, String token) {
		return pedido.header("Authorization", token);
	}

	private long idDoPedido(String token, List<String> packIds) throws Exception {
		String corpo = criar(token, Map.of("packIds", packIds)).andExpect(status().isCreated()).andReturn()
				.getResponse().getContentAsString();
		return json.readTree(corpo).get("id").asLong();
	}

	// PED-01
	@Test
	void criaPedidoPagoComTotalDosPrecosAtuais() throws Exception {
		Usuario usuario = usuarioNovo();
		Pack a = packNovo(12_000);
		Pack b = packNovo(8_050);
		Instant antes = Instant.now();

		String resposta = criar(token(usuario), Map.of("packIds", List.of(a.id(), b.id())))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.usuarioId").value(usuario.id()))
				.andExpect(jsonPath("$.packIds[0]").value(a.id()))
				.andExpect(jsonPath("$.packIds[1]").value(b.id()))
				.andExpect(jsonPath("$.packIds.length()").value(2))
				.andExpect(jsonPath("$.totalCentavos").value(20_050))
				.andExpect(jsonPath("$.status").value("pago"))
				.andReturn().getResponse().getContentAsString();

		JsonNode corpo = json.readTree(resposta);
		assertThat(corpo.get("id").asLong()).isPositive();
		assertThat(Instant.parse(corpo.get("criadoEm").asString())).isBetween(antes.minusSeconds(5),
				Instant.now().plusSeconds(5));
	}

	// PED-02
	@Test
	void mudancaDePrecoDoPackNaoAlteraOPedidoJaCriado() throws Exception {
		Usuario usuario = usuarioNovo();
		Pack pack = packNovo(10_000);
		long id = idDoPedido(token(usuario), List.of(pack.id()));

		packs.atualizar(new Pack(pack.id(), pack.nome(), pack.estilo(), pack.descricao(), 99_999, pack.equipamento()));

		buscar(token(usuario), id)
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.totalCentavos").value(10_000))
				.andExpect(jsonPath("$.packIds[0]").value(pack.id()));
	}

	// PED-03
	@Test
	void ignoraUsuarioTotalStatusEDataEnviadosNoCorpo() throws Exception {
		Usuario usuario = usuarioNovo();
		Usuario outro = usuarioNovo();
		Pack pack = packNovo(5_000);
		Map<String, Object> corpo = Map.of("packIds", List.of(pack.id()), "usuarioId", outro.id(),
				"totalCentavos", 1, "status", "pendente", "criadoEm", "2000-01-01T00:00:00Z");

		criar(token(usuario), corpo)
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.usuarioId").value(usuario.id()))
				.andExpect(jsonPath("$.totalCentavos").value(5_000))
				.andExpect(jsonPath("$.status").value("pago"))
				.andExpect(jsonPath("$.criadoEm").value(org.hamcrest.Matchers.not("2000-01-01T00:00:00Z")));
	}

	// PED-04
	@Test
	void listaSoOsPedidosDoUsuarioDoMaisNovoParaOMaisAntigo() throws Exception {
		Usuario usuario = usuarioNovo();
		Usuario outro = usuarioNovo();
		Pack pack = packNovo(1_000);
		long primeiro = idDoPedido(token(usuario), List.of(pack.id()));
		long segundo = idDoPedido(token(usuario), List.of(pack.id()));
		idDoPedido(token(outro), List.of(pack.id()));

		listar(token(usuario), "")
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.length()").value(2))
				.andExpect(jsonPath("$[0].id").value(segundo))
				.andExpect(jsonPath("$[1].id").value(primeiro))
				.andExpect(jsonPath("$[0].usuarioId").value(usuario.id()))
				.andExpect(jsonPath("$[1].usuarioId").value(usuario.id()));
	}

	// PED-04
	@Test
	void filtraPorStatusPago() throws Exception {
		Usuario usuario = usuarioNovo();
		Pack pack = packNovo(1_000);
		long id = idDoPedido(token(usuario), List.of(pack.id()));

		listar(token(usuario), "?status=pago")
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.length()").value(1))
				.andExpect(jsonPath("$[0].id").value(id))
				.andExpect(jsonPath("$[0].status").value("pago"));
		// Every order is created paid, so none is pending.
		listar(token(usuario), "?status=pendente")
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.length()").value(0));
	}

	// PED-05
	@Test
	void mostraOPedidoDoProprioUsuario() throws Exception {
		Usuario usuario = usuarioNovo();
		Pack pack = packNovo(2_500);
		long id = idDoPedido(token(usuario), List.of(pack.id()));

		buscar(token(usuario), id)
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.id").value(id))
				.andExpect(jsonPath("$.usuarioId").value(usuario.id()))
				.andExpect(jsonPath("$.packIds[0]").value(pack.id()))
				.andExpect(jsonPath("$.totalCentavos").value(2_500))
				.andExpect(jsonPath("$.status").value("pago"));
	}

	// PED-06
	@Test
	void pedidoDeOutroUsuarioOuInexistenteDevolve404() throws Exception {
		Usuario dono = usuarioNovo();
		Usuario outro = usuarioNovo();
		Pack pack = packNovo(2_500);
		long id = idDoPedido(token(dono), List.of(pack.id()));

		buscar(token(outro), id)
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.status").value(404))
				.andExpect(jsonPath("$.mensagem").value("Pedido não encontrado."));
		buscar(token(dono), Long.MAX_VALUE)
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.mensagem").value("Pedido não encontrado."));
	}

	// PED-07
	@Test
	void packIdsAusenteOuVazioDevolve400() throws Exception {
		String token = token(usuarioNovo());

		for (Object corpo : List.of(Map.of(), Map.of("packIds", List.of()))) {
			criar(token, corpo)
					.andExpect(status().isBadRequest())
					.andExpect(jsonPath("$.campos.packIds").value("Escolha pelo menos um pack."));
		}
	}

	// PED-08
	@Test
	void packRepetidoDevolve400() throws Exception {
		Pack pack = packNovo(1_000);

		criar(token(usuarioNovo()), Map.of("packIds", List.of(pack.id(), pack.id())))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.campos.packIds").value("Um pack aparece mais de uma vez."));
	}

	// PED-09
	@Test
	void packInexistenteDevolve400ENaoGuardaNada() throws Exception {
		Usuario usuario = usuarioNovo();
		Pack existente = packNovo(1_000);

		criar(token(usuario), Map.of("packIds", List.of(existente.id(), "nao-existe")))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.campos.packIds").value("Pack não encontrado: nao-existe."));

		listar(token(usuario), "").andExpect(jsonPath("$.length()").value(0));
	}

	// ERR-01: orders need a signed-in user.
	@Test
	void semTokenDevolve401() throws Exception {
		mvc.perform(get("/pedidos")).andExpect(status().isUnauthorized());
		mvc.perform(post("/pedidos").contentType(MediaType.APPLICATION_JSON).content("{}"))
				.andExpect(status().isUnauthorized());
	}
}
