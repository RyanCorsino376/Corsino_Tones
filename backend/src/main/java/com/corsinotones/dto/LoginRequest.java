package com.corsinotones.dto;

import jakarta.validation.constraints.NotEmpty;

/** Body of POST /auth/login. The e-mail is trimmed; the service lower-cases it. Only presence is checked here. */
public record LoginRequest(
		@NotEmpty(message = "Informe um e-mail válido, como nome@exemplo.com.")
		String email,

		@NotEmpty(message = "Informe sua senha.")
		String senha) {

	public LoginRequest {
		email = email == null ? null : email.trim();
	}
}
