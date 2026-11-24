package com.corsinotones.repository;

import com.corsinotones.model.ItemPedido;
import com.corsinotones.model.Pedido;
import com.corsinotones.model.StatusPedido;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

/** Test fake of {@link PedidoRepository}: ids from 1, each user's orders listed newest first, like the database. */
public class PedidoRepositoryEmMemoria implements PedidoRepository {

	private final List<Pedido> pedidos = new ArrayList<>();

	@Override
	public Pedido criar(long usuarioId, StatusPedido status, int totalCentavos, Instant criadoEm,
			List<ItemPedido> itens) {
		Pedido novo = new Pedido(pedidos.size() + 1, usuarioId, status, totalCentavos, criadoEm, List.copyOf(itens));
		pedidos.add(novo);
		return novo;
	}

	@Override
	public List<Pedido> listarDoUsuario(long usuarioId, Optional<StatusPedido> status) {
		return pedidos.stream()
				.filter(p -> p.usuarioId() == usuarioId && status.map(s -> s == p.status()).orElse(true))
				.sorted(Comparator.comparing(Pedido::criadoEm).thenComparingLong(Pedido::id).reversed())
				.toList();
	}

	@Override
	public Optional<Pedido> buscarDoUsuario(long id, long usuarioId) {
		return pedidos.stream().filter(p -> p.id() == id && p.usuarioId() == usuarioId).findFirst();
	}
}
