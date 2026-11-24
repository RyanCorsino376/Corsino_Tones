package com.corsinotones.repository;

import com.corsinotones.model.Equipamento;
import java.util.List;
import java.util.Optional;

/** Storage of equipments. Writes that break a database rule throw {@link Duplicado} or {@link EmUso}. */
public interface EquipamentoRepository {

	/** Every equipment, ordered by brand then model. */
	List<Equipamento> listar();

	Optional<Equipamento> buscar(long id);

	/** Stores a new equipment; the database assigns the id. Throws {@link Duplicado} for an existing pair. */
	Equipamento criar(String marca, String modelo);

	/** Replaces brand and model of an existing equipment. Throws {@link Duplicado} for a pair of another one. */
	Equipamento atualizar(Equipamento equipamento);

	/** Deletes the equipment; nothing happens when it does not exist. Throws {@link EmUso} when it has packs. */
	void excluir(long id);

	/** True when at least one pack belongs to the equipment. */
	boolean temPacks(long id);
}
