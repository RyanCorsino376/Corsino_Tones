package com.corsinotones.repository.jpa;

import com.corsinotones.model.Equipamento;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** Row of {@code equipamento}. Never leaves this package: the adapters convert it to {@link Equipamento}. */
@Entity
@Table(name = "equipamento")
class EquipamentoEntidade {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	private String marca;

	private String modelo;

	protected EquipamentoEntidade() {
	}

	EquipamentoEntidade(String marca, String modelo) {
		this.marca = marca;
		this.modelo = modelo;
	}

	void alterar(String marca, String modelo) {
		this.marca = marca;
		this.modelo = modelo;
	}

	Equipamento paraRegistro() {
		return new Equipamento(id, marca, modelo);
	}
}
