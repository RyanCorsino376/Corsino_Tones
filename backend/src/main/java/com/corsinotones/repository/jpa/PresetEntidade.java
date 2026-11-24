package com.corsinotones.repository.jpa;

import com.corsinotones.model.Preset;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.LocalDate;

/**
 * Row of {@code preset}. Never leaves this package: the adapter converts it to {@link Preset}.
 * {@code arquivo_chave} is deliberately not mapped, so no write through JPA can set it (PRS-12).
 */
@Entity
@Table(name = "preset")
class PresetEntidade {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	private String nome;

	private String descricao;

	@Column(name = "data_publicacao")
	private LocalDate data;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "pack_id")
	private PackEntidade pack;

	protected PresetEntidade() {
	}

	void alterar(String nome, String descricao, LocalDate data, PackEntidade pack) {
		this.nome = nome;
		this.descricao = descricao;
		this.data = data;
		this.pack = pack;
	}

	Preset paraRegistro() {
		return new Preset(id, nome, descricao, data, pack.paraRegistro());
	}
}
