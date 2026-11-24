package com.corsinotones.repository.jpa;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

interface EquipamentoJpa extends JpaRepository<EquipamentoEntidade, Long> {

	@Query(value = "SELECT EXISTS (SELECT 1 FROM pack WHERE equipamento_id = :id)", nativeQuery = true)
	boolean temPacks(@Param("id") long id);
}
