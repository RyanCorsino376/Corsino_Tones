package com.corsinotones.repository.jpa;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

// Reads fetch the items in the same query: the JSON lists the pack ids of each order.
interface PedidoJpa extends JpaRepository<PedidoEntidade, Long> {

	@Query("SELECT DISTINCT p FROM PedidoEntidade p LEFT JOIN FETCH p.itens WHERE p.usuarioId = :usuarioId"
			+ " ORDER BY p.criadoEm DESC, p.id DESC")
	List<PedidoEntidade> listarDoUsuario(@Param("usuarioId") long usuarioId);

	@Query("SELECT DISTINCT p FROM PedidoEntidade p LEFT JOIN FETCH p.itens WHERE p.usuarioId = :usuarioId"
			+ " AND p.status = :status ORDER BY p.criadoEm DESC, p.id DESC")
	List<PedidoEntidade> listarDoUsuarioComStatus(@Param("usuarioId") long usuarioId, @Param("status") String status);

	@Query("SELECT p FROM PedidoEntidade p LEFT JOIN FETCH p.itens WHERE p.id = :id AND p.usuarioId = :usuarioId")
	Optional<PedidoEntidade> buscarDoUsuario(@Param("id") long id, @Param("usuarioId") long usuarioId);
}
