package com.corsinotones.repository.jpa;

import com.corsinotones.model.ItemPedido;
import com.corsinotones.model.Pedido;
import com.corsinotones.model.StatusPedido;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * Row of {@code pedido}, with its items saved in cascade. Never leaves this package: the adapter converts it to
 * {@link Pedido}. The user is kept by id; the foreign key lives in the database.
 */
@Entity
@Table(name = "pedido")
class PedidoEntidade {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "usuario_id")
	private long usuarioId;

	// Lower-case, as the check constraint and the mock want it.
	private String status;

	@Column(name = "total_centavos")
	private int totalCentavos;

	@Column(name = "criado_em")
	private Instant criadoEm;

	@OneToMany(mappedBy = "pedido", cascade = CascadeType.ALL)
	@OrderBy("id")
	private List<ItemPedidoEntidade> itens = new ArrayList<>();

	protected PedidoEntidade() {
	}

	// timestamptz keeps microseconds, so the instant is cut to that: the record returned now equals a later read.
	PedidoEntidade(long usuarioId, StatusPedido status, int totalCentavos, Instant criadoEm, List<ItemPedido> itens) {
		this.usuarioId = usuarioId;
		this.status = status.name().toLowerCase(Locale.ROOT);
		this.totalCentavos = totalCentavos;
		this.criadoEm = criadoEm.truncatedTo(ChronoUnit.MICROS);
		itens.forEach(item -> this.itens.add(new ItemPedidoEntidade(this, item.packId(), item.precoCentavos())));
	}

	Pedido paraRegistro() {
		return new Pedido(id, usuarioId, StatusPedido.valueOf(status.toUpperCase(Locale.ROOT)), totalCentavos, criadoEm,
				itens.stream().map(ItemPedidoEntidade::paraRegistro).toList());
	}
}
