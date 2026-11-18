package com.corsinotones.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** Body of POST /auth/cadastro. Name and e-mail are trimmed on creation, so the rules see the trimmed text. */
public record CadastroRequest(
		@NotNull(message = CadastroRequest.MSG_NOME)
		@Size(min = 2, max = 100, message = CadastroRequest.MSG_NOME)
		String nome,

		@NotNull(message = CadastroRequest.MSG_EMAIL)
		@Size(max = 254, message = CadastroRequest.MSG_EMAIL)
		@Pattern(regexp = "[^\\s@]+@[^\\s@]+\\.[^\\s@]+", message = CadastroRequest.MSG_EMAIL)
		String email,

		@NotNull(message = CadastroRequest.MSG_SENHA)
		@Size(min = 8, max = 72, message = CadastroRequest.MSG_SENHA)
		String senha) {

	static final String MSG_NOME = "Informe um nome com 2 a 100 caracteres.";
	static final String MSG_EMAIL = "Informe um e-mail válido, como nome@exemplo.com.";
	static final String MSG_SENHA = "A senha precisa ter de 8 a 72 caracteres.";

	public CadastroRequest {
		nome = nome == null ? null : nome.trim();
		email = email == null ? null : email.trim();
	}
}
