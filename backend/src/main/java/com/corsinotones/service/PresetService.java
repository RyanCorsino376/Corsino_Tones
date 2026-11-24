package com.corsinotones.service;

import com.corsinotones.model.Pack;
import com.corsinotones.model.Preset;
import com.corsinotones.repository.PackRepository;
import com.corsinotones.repository.PresetRepository;
import java.time.LocalDate;
import java.util.List;
import org.springframework.stereotype.Service;

/** Preset rules: a preset always belongs to an existing pack; it can move to another pack and is always deletable. */
@Service
public class PresetService {

	static final String MSG_NAO_ENCONTRADO = "Preset não encontrado.";
	static final String MSG_PACK = "Pack não encontrado.";

	private final PresetRepository repositorio;
	private final PackRepository packs;

	/** The fields a client sends; the id is never one of them. */
	public record Dados(String nome, String descricao, LocalDate data, String packId) {
	}

	public PresetService(PresetRepository repositorio, PackRepository packs) {
		this.repositorio = repositorio;
		this.packs = packs;
	}

	public List<Preset> listar() {
		return repositorio.listar();
	}

	/** The presets of one pack; empty when the pack has none or does not exist. */
	public List<Preset> listarPorPack(String packId) {
		return repositorio.listarPorPack(packId);
	}

	/** The preset, or {@link NaoEncontrado}. */
	public Preset buscar(long id) {
		return repositorio.buscar(id).orElseThrow(() -> new NaoEncontrado(MSG_NAO_ENCONTRADO));
	}

	public Preset criar(Dados dados) {
		return repositorio.criar(new Preset(0, dados.nome(), dados.descricao(), dados.data(), packDe(dados)));
	}

	/** Replaces every field, the pack included (PRS-05). */
	public Preset atualizar(long id, Dados dados) {
		buscar(id);
		return repositorio.atualizar(new Preset(id, dados.nome(), dados.descricao(), dados.data(), packDe(dados)));
	}

	public void excluir(long id) {
		buscar(id);
		repositorio.excluir(id);
	}

	private Pack packDe(Dados dados) {
		return packs.buscar(dados.packId()).orElseThrow(() -> new CampoInvalido("packId", MSG_PACK));
	}
}
