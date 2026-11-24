package com.corsinotones.repository.jpa;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

// Reads fetch the equipment in the same query: the JSON needs its brand and model (no 1 + N queries).
interface PackJpa extends JpaRepository<PackEntidade, String> {

	@Query("SELECT p FROM PackEntidade p JOIN FETCH p.equipamento ORDER BY p.id")
	List<PackEntidade> listarComEquipamento();

	@Query("SELECT p FROM PackEntidade p JOIN FETCH p.equipamento WHERE p.id = :id")
	Optional<PackEntidade> buscarComEquipamento(@Param("id") String id);

	@Query("SELECT p FROM PackEntidade p JOIN FETCH p.equipamento WHERE p.id IN :ids")
	List<PackEntidade> buscarVariosComEquipamento(@Param("ids") Collection<String> ids);

	@Query(value = "SELECT EXISTS (SELECT 1 FROM preset WHERE pack_id = :id)"
			+ " OR EXISTS (SELECT 1 FROM item_pedido WHERE pack_id = :id)", nativeQuery = true)
	boolean emUso(@Param("id") String id);

	boolean existsByEstiloAndEquipamentoIdAndIdNot(String estilo, long equipamentoId, String id);
}
