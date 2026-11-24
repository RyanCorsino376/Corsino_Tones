package com.corsinotones.repository;

import com.corsinotones.model.Pack;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

/** Storage of packs, always returned with their equipment. Writes that break a database rule throw {@link Duplicado} or {@link EmUso}. */
public interface PackRepository {

	/** Every pack, ordered by id. */
	List<Pack> listar();

	Optional<Pack> buscar(String id);

	/** The packs among {@code ids} that exist, in no particular order. */
	List<Pack> buscarVarios(Collection<String> ids);

	/** Stores a new pack under its own id. Throws {@link Duplicado} for a taken id or style on that equipment. */
	Pack criar(Pack pack);

	/** Replaces every field but the id of an existing pack. Throws {@link Duplicado} for a style taken on that equipment. */
	Pack atualizar(Pack pack);

	/** Deletes the pack; nothing happens when it does not exist. Throws {@link EmUso} when presets or orders point to it. */
	void excluir(String id);

	/** True when the pack has presets or appears in an order. */
	boolean emUso(String id);

	/** True when another pack than {@code exceto} (null for none) has this style on this equipment. */
	boolean existeEstiloNoEquipamento(String estilo, long equipamentoId, String exceto);
}
