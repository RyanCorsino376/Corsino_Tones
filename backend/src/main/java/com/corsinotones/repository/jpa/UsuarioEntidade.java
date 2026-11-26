package com.corsinotones.repository.jpa;

import com.corsinotones.model.Perfil;
import com.corsinotones.model.Usuario;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** Row of {@code usuario}. Never leaves this package: the adapter converts it to {@link Usuario}. */
@Entity
@Table(name = "usuario")
class UsuarioEntidade {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	private String nome;

	private String email;

	@Column(name = "senha_hash")
	private String senhaHash;

	@Enumerated(EnumType.STRING)
	private Perfil perfil;

	protected UsuarioEntidade() {
	}

	UsuarioEntidade(String nome, String email, String senhaHash, Perfil perfil) {
		this.nome = nome;
		this.email = email;
		this.senhaHash = senhaHash;
		this.perfil = perfil;
	}

	Usuario paraRegistro() {
		return new Usuario(id, nome, email, senhaHash, perfil);
	}
}
