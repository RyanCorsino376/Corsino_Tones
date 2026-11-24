package com.corsinotones.repository.jpa;

import com.corsinotones.model.ItemPedido;
import com.corsinotones.model.Pedido;
import com.corsinotones.model.StatusPedido;
import com.corsinotones.repository.PedidoRepository;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

/**
 * Orders in PostgreSQL. The order and its items are flushed together; inside the service's transaction a failed
 * item insert rolls the order back too (PED-10).
 */
@Repository
public class PedidoRepositoryJpa implements PedidoRepository {

	private final PedidoJpa jpa;

	PedidoRepositoryJpa(PedidoJpa jpa) {
		this.jpa = jpa;
	}

	@Override
	@Transactional
	public Pedido criar(long usuarioId, StatusPedido status, int totalCentavos, Instant criadoEm,
			List<ItemPedido> itens) {
		try {
			return jpa.saveAndFlush(new PedidoEntidade(usuarioId, status, totalCentavos, criadoEm, itens))
					.paraRegistro();
		} catch (DataIntegrityViolationException erro) {
			throw TradutorDeErros.traduzir(erro);
		}
	}

	@Override
	public List<Pedido> listarDoUsuario(long usuarioId, Optional<StatusPedido> status) {
		List<PedidoEntidade> pedidos = status
				.map(s -> jpa.listarDoUsuarioComStatus(usuarioId, s.name().toLowerCase(Locale.ROOT)))
				.orElseGet(() -> jpa.listarDoUsuario(usuarioId));
		return pedidos.stream().map(PedidoEntidade::paraRegistro).toList();
	}

	@Override
	public Optional<Pedido> buscarDoUsuario(long id, long usuarioId) {
		return jpa.buscarDoUsuario(id, usuarioId).map(PedidoEntidade::paraRegistro);
	}
}
