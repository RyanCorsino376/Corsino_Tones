package com.corsinotones.dto;

import static org.assertj.core.api.Assertions.assertThat;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import java.util.Map;
import java.util.stream.Collectors;
import org.junit.jupiter.api.Test;

// LOG-02, LOG-06: login only needs an e-mail and a password; no length rule on the password.
class LoginRequestTest {

	private static final String MSG_EMAIL = "Informe um e-mail válido, como nome@exemplo.com.";
	private static final String MSG_SENHA = "Informe sua senha.";

	private final Validator validador = Validation.buildDefaultValidatorFactory().getValidator();

	private Map<String, String> erros(String email, String senha) {
		return validador.validate(new LoginRequest(email, senha)).stream().collect(
				Collectors.toMap(v -> v.getPropertyPath().toString(), ConstraintViolation::getMessage, (a, b) -> a));
	}

	@Test
	void emailVazioEmBrancoOuNuloEInvalido() {
		assertThat(erros("", "x")).containsEntry("email", MSG_EMAIL);
		assertThat(erros("   ", "x")).containsEntry("email", MSG_EMAIL);
		assertThat(erros(null, "x")).containsEntry("email", MSG_EMAIL);
	}

	@Test
	void senhaVaziaOuNulaEInvalida() {
		assertThat(erros("a@b.c", "")).containsEntry("senha", MSG_SENHA);
		assertThat(erros("a@b.c", null)).containsEntry("senha", MSG_SENHA);
	}

	@Test
	void senhaDeTresCaracteresEValidaNoLogin() {
		assertThat(erros("a@b.c", "abc")).isEmpty();
	}

	@Test
	void emailSemFormatoValidoNaoEVerificadoNoLogin() {
		assertThat(erros("sem-arroba", "abc")).doesNotContainKey("email");
	}

	@Test
	void emailEAparadoMasNaoMudaDeCaixa() {
		assertThat(new LoginRequest("  RYAN@Exemplo.com ", "x").email()).isEqualTo("RYAN@Exemplo.com");
	}
}
