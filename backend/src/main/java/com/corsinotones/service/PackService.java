package com.corsinotones.service;

import com.corsinotones.model.Equipamento;
import com.corsinotones.model.Pack;
import com.corsinotones.repository.Duplicado;
import com.corsinotones.repository.EmUso;
import com.corsinotones.repository.EquipamentoRepository;
import com.corsinotones.repository.PackRepository;
import java.text.Normalizer;
import java.util.List;
import java.util.Locale;
import org.springframework.stereotype.Service;

/**
 * Pack rules: the id is the slug of style, brand and model, built once at creation; one pack per style per
 * equipment; no delete while presets or orders point to it.
 */
@Service
public class PackService {

	static final String MSG_NAO_ENCONTRADO = "Pack não encontrado.";
	static final String MSG_EQUIPAMENTO = "Equipamento não encontrado.";
	static final String MSG_DUPLICADO = "Já existe um pack deste estilo para este equipamento.";
	static final String MSG_EM_USO = "Este pack tem presets ou pedidos e não pode ser excluído.";

	private final PackRepository repositorio;
	private final EquipamentoRepository equipamentos;

	/** The fields a client sends; the id is never one of them. */
	public record Dados(String nome, String estilo, String descricao, int precoCentavos, long equipamentoId) {
	}

	public PackService(PackRepository repositorio, EquipamentoRepository equipamentos) {
		this.repositorio = repositorio;
		this.equipamentos = equipamentos;
	}

	/** Lower-case slug: accents removed, every run of other characters turned into one "-", none at the ends. */
	static String slug(String estilo, String marca, String modelo) {
		String semAcentos = Normalizer.normalize(estilo + " " + marca + " " + modelo, Normalizer.Form.NFD)
				.replaceAll("\\p{M}", "");
		return semAcentos.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", "-").replaceAll("^-|-$", "");
	}

	public List<Pack> listar() {
		return repositorio.listar();
	}

	/** The pack, or {@link NaoEncontrado}. */
	public Pack buscar(String id) {
		return repositorio.buscar(id).orElseThrow(() -> new NaoEncontrado(MSG_NAO_ENCONTRADO));
	}

	public Pack criar(Dados dados) {
		Equipamento equipamento = equipamentoDe(dados);
		String estilo = normalizarEstilo(dados.estilo());
		Pack novo = montar(slug(estilo, equipamento.marca(), equipamento.modelo()), dados, estilo, equipamento);
		exigirEstiloLivre(novo, null);
		try {
			return repositorio.criar(novo);
		} catch (Duplicado erro) {
			// A concurrent insert passed the pre-check; the database caught it (ERR-04).
			throw new Conflito(MSG_DUPLICADO);
		}
	}

	/** Replaces every field; the id stays the same even when it no longer matches the slug (PCK-04). */
	public Pack atualizar(String id, Dados dados) {
		buscar(id);
		Equipamento equipamento = equipamentoDe(dados);
		Pack alterado = montar(id, dados, normalizarEstilo(dados.estilo()), equipamento);
		exigirEstiloLivre(alterado, id);
		try {
			return repositorio.atualizar(alterado);
		} catch (Duplicado erro) {
			throw new Conflito(MSG_DUPLICADO);
		}
	}

	public void excluir(String id) {
		buscar(id);
		if (repositorio.emUso(id)) {
			throw new Conflito(MSG_EM_USO);
		}
		try {
			repositorio.excluir(id);
		} catch (EmUso erro) {
			// A preset or an order arrived after the pre-check; the foreign key caught it (ERR-05).
			throw new Conflito(MSG_EM_USO);
		}
	}

	private Equipamento equipamentoDe(Dados dados) {
		return equipamentos.buscar(dados.equipamentoId())
				.orElseThrow(() -> new CampoInvalido("equipamentoId", MSG_EQUIPAMENTO));
	}

	private static String normalizarEstilo(String estilo) {
		return estilo.trim().toLowerCase(Locale.ROOT);
	}

	private static Pack montar(String id, Dados dados, String estilo, Equipamento equipamento) {
		return new Pack(id, dados.nome().trim(), estilo, dados.descricao().trim(), dados.precoCentavos(), equipamento);
	}

	private void exigirEstiloLivre(Pack pack, String exceto) {
		if (repositorio.existeEstiloNoEquipamento(pack.estilo(), pack.equipamento().id(), exceto)) {
			throw new Conflito(MSG_DUPLICADO);
		}
	}
}
