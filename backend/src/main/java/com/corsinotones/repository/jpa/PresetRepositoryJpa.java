package com.corsinotones.repository.jpa;

import com.corsinotones.model.Preset;
import com.corsinotones.repository.PresetRepository;
import java.util.List;
import java.util.Optional;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

/** Presets in PostgreSQL. Each write is flushed here, so a broken constraint is translated inside the adapter. */
@Repository
public class PresetRepositoryJpa implements PresetRepository {

	private final PresetJpa jpa;
	private final PackJpa packs;

	PresetRepositoryJpa(PresetJpa jpa, PackJpa packs) {
		this.jpa = jpa;
		this.packs = packs;
	}

	@Override
	public List<Preset> listar() {
		return jpa.listarCompletos().stream().map(PresetEntidade::paraRegistro).toList();
	}

	@Override
	public List<Preset> listarPorPack(String packId) {
		return jpa.listarCompletosDoPack(packId).stream().map(PresetEntidade::paraRegistro).toList();
	}

	@Override
	public Optional<Preset> buscar(long id) {
		return jpa.buscarCompleto(id).map(PresetEntidade::paraRegistro);
	}

	// Transactional so the pack reference can still be read when converting the stored row.
	@Override
	@Transactional
	public Preset criar(Preset preset) {
		PresetEntidade entidade = new PresetEntidade();
		entidade.alterar(preset.nome(), preset.descricao(), preset.data(), packs.getReferenceById(preset.pack().id()));
		return gravar(entidade);
	}

	@Override
	@Transactional
	public Preset atualizar(Preset preset) {
		PresetEntidade entidade = jpa.findById(preset.id()).orElseThrow();
		entidade.alterar(preset.nome(), preset.descricao(), preset.data(), packs.getReferenceById(preset.pack().id()));
		return gravar(entidade);
	}

	private Preset gravar(PresetEntidade entidade) {
		try {
			return jpa.saveAndFlush(entidade).paraRegistro();
		} catch (DataIntegrityViolationException erro) {
			throw TradutorDeErros.traduzir(erro);
		}
	}

	@Override
	@Transactional
	public void excluir(long id) {
		jpa.deleteById(id);
		jpa.flush();
	}
}
