package com.corsinotones.model;

import java.time.Instant;
import java.util.List;

/** A purchase of one user. The total is the sum of the item prices, computed by the server. */
public record Pedido(long id, long usuarioId, StatusPedido status, int totalCentavos, Instant criadoEm,
		List<ItemPedido> itens) {
}
