package com.corsinotones.dto;

import com.corsinotones.model.Usuario;

/** A user as the API shows it: never the password or its hash. */
public record UsuarioResponse(long id, String nome, String email) {

	public static UsuarioResponse de(Usuario usuario) {
		return new UsuarioResponse(usuario.id(), usuario.nome(), usuario.email());
	}
}
