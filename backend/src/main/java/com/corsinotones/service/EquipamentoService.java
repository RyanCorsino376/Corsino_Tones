package com.corsinotones.service;

import com.corsinotones.model.Equipamento;
import com.corsinotones.repository.Duplicado;
import com.corsinotones.repository.EmUso;
import com.corsinotones.repository.EquipamentoRepository;
import java.util.List;
import java.util.Locale;
import org.springframework.stereotype.Service;

/** Equipment rules: brand stored lower-case, one equipment per brand and model, no delete while it has packs. */
@Service
public class EquipamentoService {

	static final String MSG_NAO_ENCONTRADO = "Equipamento não encontrado.";
	static final String MSG_DUPLICADO = "Este equipamento já está cadastrado.";
	static final String MSG_TEM_PACKS = "Este equipamento tem packs e não pode ser excluído.";

	private final EquipamentoRepository repositorio;

	public EquipamentoService(EquipamentoRepository repositorio) {
		this.repositorio = repositorio;
	}

	public List<Equipamento> listar() {
		return repositorio.listar();
	}

	/** The equipment, or {@link NaoEncontrado}. */
	public Equipamento buscar(long id) {
		return repositorio.buscar(id).orElseThrow(() -> new NaoEncontrado(MSG_NAO_ENCONTRADO));
	}

	public Equipamento criar(String marca, String modelo) {
		String m = normalizarMarca(marca);
		String mo = modelo.trim();
		exigirParLivre(m, mo, null);
		try {
			return repositorio.criar(m, mo);
		} catch (Duplicado erro) {
			// A concurrent insert passed the pre-check; the database caught it (ERR-04).
			throw new Conflito(MSG_DUPLICADO);
		}
	}

	public Equipamento atualizar(long id, String marca, String modelo) {
		buscar(id);
		String m = normalizarMarca(marca);
		String mo = modelo.trim();
		exigirParLivre(m, mo, id);
		try {
			return repositorio.atualizar(new Equipamento(id, m, mo));
		} catch (Duplicado erro) {
			throw new Conflito(MSG_DUPLICADO);
		}
	}

	public void excluir(long id) {
		buscar(id);
		if (repositorio.temPacks(id)) {
			throw new Conflito(MSG_TEM_PACKS);
		}
		try {
			repositorio.excluir(id);
		} catch (EmUso erro) {
			// A pack was added after the pre-check; the foreign key caught it (ERR-05).
			throw new Conflito(MSG_TEM_PACKS);
		}
	}

	static String normalizarMarca(String marca) {
		return marca.trim().toLowerCase(Locale.ROOT);
	}

	// The equipment being updated may keep its own pair.
	private void exigirParLivre(String marca, String modelo, Long exceto) {
		boolean emUso = repositorio.listar().stream().anyMatch(e -> e.marca().equals(marca)
				&& e.modelo().equals(modelo) && (exceto == null || e.id() != exceto));
		if (emUso) {
			throw new Conflito(MSG_DUPLICADO);
		}
	}
}
