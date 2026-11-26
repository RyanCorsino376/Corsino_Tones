package com.corsinotones.repository;

import com.corsinotones.model.Preset;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/** Test fake of {@link PresetRepository}: ids from 1, listed newest date first, then by id, like the database. */
public class PresetRepositoryEmMemoria implements PresetRepository {

	private static final Comparator<Preset> ORDEM = Comparator.comparing(Preset::data).reversed()
			.thenComparingLong(Preset::id);

	private final Map<Long, Preset> porId = new LinkedHashMap<>();
	private long proximoId = 1;

	@Override
	public List<Preset> listar() {
		return porId.values().stream().sorted(ORDEM).toList();
	}

	@Override
	public List<Preset> listarPorPack(String packId) {
		return listar().stream().filter(p -> p.pack().id().equals(packId)).toList();
	}

	@Override
	public Optional<Preset> buscar(long id) {
		return Optional.ofNullable(porId.get(id));
	}

	@Override
	public Preset criar(Preset preset) {
		Preset novo = new Preset(proximoId++, preset.nome(), preset.descricao(), preset.data(), preset.pack());
		porId.put(novo.id(), novo);
		return novo;
	}

	@Override
	public Preset atualizar(Preset preset) {
		porId.put(preset.id(), preset);
		return preset;
	}

	@Override
	public void excluir(long id) {
		porId.remove(id);
	}
}
