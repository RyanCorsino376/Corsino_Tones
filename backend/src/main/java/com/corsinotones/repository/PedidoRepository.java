package com.corsinotones.repository;

import com.corsinotones.model.ItemPedido;
import com.corsinotones.model.Pedido;
import com.corsinotones.model.StatusPedido;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

/** Storage of orders, always returned with their items. Orders are never changed or deleted. */
public interface PedidoRepository {

	/** Stores the order and its items; the database assigns the id. */
	Pedido criar(long usuarioId, StatusPedido status, int totalCentavos, Instant criadoEm, List<ItemPedido> itens);

	/** The user's orders, newest first; only those with {@code status} when it is present. */
	List<Pedido> listarDoUsuario(long usuarioId, Optional<StatusPedido> status);

	/** The order when it exists and belongs to the user. */
	Optional<Pedido> buscarDoUsuario(long id, long usuarioId);
}
