package com.corsinotones.repository.jpa;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

// Reads fetch the pack and its equipment in the same query: the JSON needs the style, brand and model.
interface PresetJpa extends JpaRepository<PresetEntidade, Long> {

	@Query("SELECT p FROM PresetEntidade p JOIN FETCH p.pack k JOIN FETCH k.equipamento ORDER BY p.data DESC, p.id")
	List<PresetEntidade> listarCompletos();

	@Query("SELECT p FROM PresetEntidade p JOIN FETCH p.pack k JOIN FETCH k.equipamento WHERE k.id = :packId"
			+ " ORDER BY p.data DESC, p.id")
	List<PresetEntidade> listarCompletosDoPack(@Param("packId") String packId);

	@Query("SELECT p FROM PresetEntidade p JOIN FETCH p.pack k JOIN FETCH k.equipamento WHERE p.id = :id")
	Optional<PresetEntidade> buscarCompleto(@Param("id") long id);
}
