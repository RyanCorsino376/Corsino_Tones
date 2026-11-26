package com.corsinotones.repository.jpa;

import com.corsinotones.model.Pack;
import com.corsinotones.repository.PackRepository;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

/** Packs in PostgreSQL. Each write is flushed here, so a broken constraint is translated inside the adapter. */
@Repository
public class PackRepositoryJpa implements PackRepository {

	private final PackJpa jpa;
	private final EquipamentoJpa equipamentos;

	PackRepositoryJpa(PackJpa jpa, EquipamentoJpa equipamentos) {
		this.jpa = jpa;
		this.equipamentos = equipamentos;
	}

	@Override
	public List<Pack> listar() {
		return jpa.listarComEquipamento().stream().map(PackEntidade::paraRegistro).toList();
	}

	@Override
	public Optional<Pack> buscar(String id) {
		return jpa.buscarComEquipamento(id).map(PackEntidade::paraRegistro);
	}

	@Override
	public List<Pack> buscarVarios(Collection<String> ids) {
		return jpa.buscarVariosComEquipamento(ids).stream().map(PackEntidade::paraRegistro).toList();
	}

	// Transactional so the equipment reference can still be read when converting the stored row.
	@Override
	@Transactional
	public Pack criar(Pack pack) {
		PackEntidade entidade = new PackEntidade(pack.id());
		entidade.alterar(pack.nome(), pack.estilo(), pack.descricao(), pack.precoCentavos(),
				equipamentos.getReferenceById(pack.equipamento().id()));
		return gravar(entidade);
	}

	@Override
	@Transactional
	public Pack atualizar(Pack pack) {
		PackEntidade entidade = jpa.findById(pack.id()).orElseThrow();
		entidade.alterar(pack.nome(), pack.estilo(), pack.descricao(), pack.precoCentavos(),
				equipamentos.getReferenceById(pack.equipamento().id()));
		return gravar(entidade);
	}

	private Pack gravar(PackEntidade entidade) {
		try {
			return jpa.saveAndFlush(entidade).paraRegistro();
		} catch (DataIntegrityViolationException erro) {
			throw TradutorDeErros.traduzir(erro);
		}
	}

	@Override
	@Transactional
	public void excluir(String id) {
		try {
			jpa.deleteById(id);
			jpa.flush();
		} catch (DataIntegrityViolationException erro) {
			throw TradutorDeErros.traduzir(erro);
		}
	}

	@Override
	public boolean emUso(String id) {
		return jpa.emUso(id);
	}

	// "" stands for "no pack to skip": no pack has an empty id.
	@Override
	public boolean existeEstiloNoEquipamento(String estilo, long equipamentoId, String exceto) {
		return jpa.existsByEstiloAndEquipamentoIdAndIdNot(estilo, equipamentoId, exceto == null ? "" : exceto);
	}
}
