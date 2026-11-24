package com.corsinotones.service;

import com.corsinotones.model.ItemPedido;
import com.corsinotones.model.Pack;
import com.corsinotones.model.Pedido;
import com.corsinotones.model.StatusPedido;
import com.corsinotones.repository.PackRepository;
import com.corsinotones.repository.PedidoRepository;
import java.time.Clock;
import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Order rules: the client only names the packs; the owner, the prices, the total, the status and the time come from
 * the server. Payment is simulated in the browser, so a new order is always paid.
 */
@Service
public class PedidoService {

	static final String MSG_VAZIO = "Escolha pelo menos um pack.";
	static final String MSG_REPETIDO = "Um pack aparece mais de uma vez.";
	static final String MSG_PACK = "Pack não encontrado: %s.";
	static final String MSG_NAO_ENCONTRADO = "Pedido não encontrado.";

	private final PedidoRepository repositorio;
	private final PackRepository packs;
	private final Clock relogio;

	public PedidoService(PedidoRepository repositorio, PackRepository packs, Clock relogio) {
		this.repositorio = repositorio;
		this.packs = packs;
		this.relogio = relogio;
	}

	/** One transaction: if an item fails to store, the order row goes too (PED-10). */
	@Transactional
	public Pedido criar(long usuarioId, List<String> packIds) {
		if (packIds == null || packIds.isEmpty()) {
			throw new CampoInvalido("packIds", MSG_VAZIO);
		}
		if (new HashSet<>(packIds).size() != packIds.size()) {
			throw new CampoInvalido("packIds", MSG_REPETIDO);
		}
		Map<String, Pack> encontrados = packs.buscarVarios(packIds).stream()
				.collect(Collectors.toMap(Pack::id, Function.identity()));
		List<ItemPedido> itens = packIds.stream().map(id -> {
			Pack pack = encontrados.get(id);
			if (pack == null) {
				throw new CampoInvalido("packIds", MSG_PACK.formatted(id));
			}
			return new ItemPedido(id, pack.precoCentavos());
		}).toList();
		int total = itens.stream().mapToInt(ItemPedido::precoCentavos).sum();
		return repositorio.criar(usuarioId, StatusPedido.PAGO, total, Instant.now(relogio), itens);
	}

	public List<Pedido> listar(long usuarioId, Optional<StatusPedido> status) {
		return repositorio.listarDoUsuario(usuarioId, status);
	}

	/** The user's order, or {@link NaoEncontrado} when it does not exist or belongs to someone else. */
	public Pedido buscar(long id, long usuarioId) {
		return repositorio.buscarDoUsuario(id, usuarioId).orElseThrow(() -> new NaoEncontrado(MSG_NAO_ENCONTRADO));
	}
}
