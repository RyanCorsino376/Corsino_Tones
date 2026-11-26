package com.corsinotones.repository;

import com.corsinotones.model.Preset;
import java.util.List;
import java.util.Optional;

/** Storage of presets, always returned with their pack and its equipment. */
public interface PresetRepository {

	/** Every preset, newest date first, then by id. */
	List<Preset> listar();

	/** The presets of one pack, in the order of {@link #listar()}; empty for an unknown pack. */
	List<Preset> listarPorPack(String packId);

	Optional<Preset> buscar(long id);

	/** Stores a new preset; the database assigns the id, so the record's id is ignored. */
	Preset criar(Preset preset);

	/** Replaces every field but the id of an existing preset, its pack included. */
	Preset atualizar(Preset preset);

	/** Deletes the preset; nothing happens when it does not exist. */
	void excluir(long id);
}
