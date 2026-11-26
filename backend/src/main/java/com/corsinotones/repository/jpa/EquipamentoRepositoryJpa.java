package com.corsinotones.repository.jpa;

import com.corsinotones.model.Equipamento;
import com.corsinotones.repository.EquipamentoRepository;
import java.util.List;
import java.util.Optional;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

/** Equipments in PostgreSQL. Each write is flushed here, so a broken constraint is translated inside the adapter. */
@Repository
public class EquipamentoRepositoryJpa implements EquipamentoRepository {

	private final EquipamentoJpa jpa;

	EquipamentoRepositoryJpa(EquipamentoJpa jpa) {
		this.jpa = jpa;
	}

	@Override
	public List<Equipamento> listar() {
		return jpa.findAll(Sort.by("marca", "modelo")).stream().map(EquipamentoEntidade::paraRegistro).toList();
	}

	@Override
	public Optional<Equipamento> buscar(long id) {
		return jpa.findById(id).map(EquipamentoEntidade::paraRegistro);
	}

	@Override
	public Equipamento criar(String marca, String modelo) {
		try {
			return jpa.saveAndFlush(new EquipamentoEntidade(marca, modelo)).paraRegistro();
		} catch (DataIntegrityViolationException erro) {
			throw TradutorDeErros.traduzir(erro);
		}
	}

	@Override
	@Transactional
	public Equipamento atualizar(Equipamento equipamento) {
		EquipamentoEntidade entidade = jpa.findById(equipamento.id()).orElseThrow();
		entidade.alterar(equipamento.marca(), equipamento.modelo());
		try {
			return jpa.saveAndFlush(entidade).paraRegistro();
		} catch (DataIntegrityViolationException erro) {
			throw TradutorDeErros.traduzir(erro);
		}
	}

	@Override
	@Transactional
	public void excluir(long id) {
		try {
			jpa.deleteById(id);
			jpa.flush();
		} catch (DataIntegrityViolationException erro) {
			throw TradutorDeErros.traduzir(erro);
		}
	}

	@Override
	public boolean temPacks(long id) {
		return jpa.temPacks(id);
	}
}
