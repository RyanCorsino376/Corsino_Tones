package com.corsinotones.dto;

import com.corsinotones.model.ItemPedido;
import com.corsinotones.model.Pedido;
import java.util.List;

/** An order as the API shows it, with the mock's field names. {@code status} is lower-case and {@code criadoEm} an ISO-8601 instant. */
public record PedidoResponse(long id, long usuarioId, List<String> packIds, int totalCentavos, String status,
		String criadoEm) {

	public static PedidoResponse de(Pedido pedido) {
		return new PedidoResponse(pedido.id(), pedido.usuarioId(),
				pedido.itens().stream().map(ItemPedido::packId).toList(), pedido.totalCentavos(),
				pedido.status().name().toLowerCase(), pedido.criadoEm().toString());
	}
}
