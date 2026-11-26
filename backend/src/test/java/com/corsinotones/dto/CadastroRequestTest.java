package com.corsinotones.dto;

import static org.assertj.core.api.Assertions.assertThat;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.junit.jupiter.api.Test;

// CAD-04 to CAD-08: field rules and their exact messages.
class CadastroRequestTest {

	private static final String MSG_NOME = "Informe um nome com 2 a 100 caracteres.";
	private static final String MSG_EMAIL = "Informe um e-mail válido, como nome@exemplo.com.";
	private static final String MSG_SENHA = "A senha precisa ter de 8 a 72 caracteres.";

	private final Validator validador = Validation.buildDefaultValidatorFactory().getValidator();

	private Map<String, String> erros(String nome, String email, String senha) {
		Set<ConstraintViolation<CadastroRequest>> violacoes = validador.validate(new CadastroRequest(nome, email, senha));
		return violacoes.stream().collect(
				Collectors.toMap(v -> v.getPropertyPath().toString(), ConstraintViolation::getMessage, (a, b) -> a));
	}

	private static String texto(int tamanho) {
		return "a".repeat(tamanho);
	}

	@Test
	void nomeCurtoOuLongoDemais() {
		assertThat(erros("A", "x@y.z", texto(8))).containsEntry("nome", MSG_NOME);
		assertThat(erros(texto(101), "x@y.z", texto(8))).containsEntry("nome", MSG_NOME);
	}

	@Test
	void nomeNosLimitesEValido() {
		assertThat(erros("Al", "x@y.z", texto(8))).doesNotContainKey("nome");
		assertThat(erros(texto(100), "x@y.z", texto(8))).doesNotContainKey("nome");
	}

	@Test
	void nomeEMedidoDepoisDeAparar() {
		assertThat(erros("   A  ", "x@y.z", texto(8))).containsEntry("nome", MSG_NOME);
		assertThat(new CadastroRequest("  Ana  ", "x@y.z", texto(8)).nome()).isEqualTo("Ana");
	}

	@Test
	void nomeNuloEInvalido() {
		assertThat(erros(null, "x@y.z", texto(8))).containsEntry("nome", MSG_NOME);
	}

	@Test
	void emailsMalFormadosSaoRejeitados() {
		assertThat(erros("Ana", "a@b", texto(8))).containsEntry("email", MSG_EMAIL);
		assertThat(erros("Ana", "a b@c.d", texto(8))).containsEntry("email", MSG_EMAIL);
		assertThat(erros("Ana", texto(250) + "@b.cd", texto(8))).containsEntry("email", MSG_EMAIL);
	}

	@Test
	void emailValidoEAparado() {
		assertThat(erros("Ana", "x@y.z", texto(8))).doesNotContainKey("email");
		CadastroRequest pedido = new CadastroRequest("Ana", "  Ana@Y.Z ", texto(8));
		assertThat(pedido.email()).isEqualTo("Ana@Y.Z");
		assertThat(erros("Ana", "  Ana@Y.Z ", texto(8))).doesNotContainKey("email");
	}

	@Test
	void emailValidoDentroDeTextoInvalidoERejeitado() {
		assertThat(erros("Ana", "ruim a@b.c ruim", texto(8))).containsEntry("email", MSG_EMAIL);
	}

	@Test
	void emailNuloEInvalido() {
		assertThat(erros("Ana", null, texto(8))).containsEntry("email", MSG_EMAIL);
	}

	@Test
	void emailNoLimiteDe254CaracteresEValido() {
		assertThat(erros("Ana", texto(249) + "@b.cd", texto(8))).doesNotContainKey("email");
	}

	@Test
	void senhaForaDe8Ate72EInvalida() {
		assertThat(erros("Ana", "x@y.z", texto(7))).containsEntry("senha", MSG_SENHA);
		assertThat(erros("Ana", "x@y.z", texto(73))).containsEntry("senha", MSG_SENHA);
		assertThat(erros("Ana", "x@y.z", null)).containsEntry("senha", MSG_SENHA);
	}

	@Test
	void senhaNosLimitesEValida() {
		assertThat(erros("Ana", "x@y.z", texto(8))).doesNotContainKey("senha");
		assertThat(erros("Ana", "x@y.z", texto(72))).doesNotContainKey("senha");
	}

	@Test
	void todosOsCamposInvalidosGeramUmaViolacaoPorCampo() {
		assertThat(erros("A", "ruim", "curta")).containsOnlyKeys("nome", "email", "senha");
	}
}
