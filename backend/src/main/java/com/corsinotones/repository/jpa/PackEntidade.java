package com.corsinotones.repository.jpa;

import com.corsinotones.model.Pack;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PostLoad;
import jakarta.persistence.PostPersist;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;
import org.springframework.data.domain.Persistable;

/**
 * Row of {@code pack}. Never leaves this package: the adapters convert it to {@link Pack}.
 * The id is assigned by the service, so {@link Persistable} tells Spring Data when a row is new: otherwise
 * {@code save} would merge, and a new pack with a taken id would silently overwrite the existing one.
 */
@Entity
@Table(name = "pack")
class PackEntidade implements Persistable<String> {

	@Id
	private String id;

	private String nome;

	private String estilo;

	private String descricao;

	@Column(name = "preco_centavos")
	private int precoCentavos;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "equipamento_id")
	private EquipamentoEntidade equipamento;

	@Transient
	private boolean novo;

	protected PackEntidade() {
	}

	PackEntidade(String id) {
		this.id = id;
		this.novo = true;
	}

	void alterar(String nome, String estilo, String descricao, int precoCentavos, EquipamentoEntidade equipamento) {
		this.nome = nome;
		this.estilo = estilo;
		this.descricao = descricao;
		this.precoCentavos = precoCentavos;
		this.equipamento = equipamento;
	}

	@PostLoad
	@PostPersist
	void marcarGuardado() {
		novo = false;
	}

	@Override
	public String getId() {
		return id;
	}

	@Override
	public boolean isNew() {
		return novo;
	}

	Pack paraRegistro() {
		return new Pack(id, nome, estilo, descricao, precoCentavos, equipamento.paraRegistro());
	}
}
