package com.corsinotones.repository.jpa;

import com.corsinotones.model.ItemPedido;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

/** Row of {@code item_pedido}. The pack is kept by id: the item has its own price and needs nothing else of it. */
@Entity
@Table(name = "item_pedido")
class ItemPedidoEntidade {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "pedido_id")
	private PedidoEntidade pedido;

	@Column(name = "pack_id")
	private String packId;

	@Column(name = "preco_centavos")
	private int precoCentavos;

	protected ItemPedidoEntidade() {
	}

	ItemPedidoEntidade(PedidoEntidade pedido, String packId, int precoCentavos) {
		this.pedido = pedido;
		this.packId = packId;
		this.precoCentavos = precoCentavos;
	}

	ItemPedido paraRegistro() {
		return new ItemPedido(packId, precoCentavos);
	}
}
