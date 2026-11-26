package com.corsinotones.controller;

import com.corsinotones.dto.ErroResposta;
import com.corsinotones.service.CampoInvalido;
import com.corsinotones.service.Conflito;
import com.corsinotones.service.CredenciaisInvalidas;
import com.corsinotones.service.NaoEncontrado;
import java.util.LinkedHashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.transaction.CannotCreateTransactionException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

/** Turns every error into the single body {status, mensagem, campos} (SRV-05). */
@RestControllerAdvice
public class ErroHandler {

	private static final Logger log = LoggerFactory.getLogger(ErroHandler.class);

	@ExceptionHandler(MethodArgumentNotValidException.class)
	ResponseEntity<ErroResposta> validacao(MethodArgumentNotValidException erro) {
		Map<String, String> campos = new LinkedHashMap<>();
		erro.getBindingResult().getFieldErrors()
				.forEach(campo -> campos.putIfAbsent(campo.getField(), campo.getDefaultMessage()));
		return resposta(HttpStatus.BAD_REQUEST, "Dados inválidos.", campos);
	}

	@ExceptionHandler(HttpMessageNotReadableException.class)
	ResponseEntity<ErroResposta> corpoIlegivel() {
		return resposta(HttpStatus.BAD_REQUEST, "Corpo da requisição inválido.", Map.of());
	}

	// Same message as a Bean Validation failure: the field itself says what is wrong.
	@ExceptionHandler(CampoInvalido.class)
	ResponseEntity<ErroResposta> campoInvalido(CampoInvalido erro) {
		return resposta(HttpStatus.BAD_REQUEST, "Dados inválidos.", Map.of(erro.campo(), erro.getMessage()));
	}

	// A path id of the wrong type, such as /presets/abc (ERR-07).
	@ExceptionHandler(MethodArgumentTypeMismatchException.class)
	ResponseEntity<ErroResposta> identificadorInvalido() {
		return resposta(HttpStatus.BAD_REQUEST, "Identificador inválido.", Map.of());
	}

	@ExceptionHandler(NaoEncontrado.class)
	ResponseEntity<ErroResposta> naoEncontrado(NaoEncontrado erro) {
		return resposta(HttpStatus.NOT_FOUND, erro.getMessage(), Map.of());
	}

	// Includes EmailEmUso.
	@ExceptionHandler(Conflito.class)
	ResponseEntity<ErroResposta> conflito(Conflito erro) {
		return resposta(HttpStatus.CONFLICT, erro.getMessage(), Map.of());
	}

	// The database cannot be reached while the app runs (ERR-06); the cause is logged, never sent.
	@ExceptionHandler({DataAccessResourceFailureException.class, CannotCreateTransactionException.class})
	ResponseEntity<ErroResposta> bancoIndisponivel(Exception erro) {
		log.error("Database unavailable", erro);
		return resposta(HttpStatus.SERVICE_UNAVAILABLE, "Serviço temporariamente indisponível. Tente novamente.", Map.of());
	}

	@ExceptionHandler(CredenciaisInvalidas.class)
	ResponseEntity<ErroResposta> credenciaisInvalidas(CredenciaisInvalidas erro) {
		return resposta(HttpStatus.UNAUTHORIZED, erro.getMessage(), Map.of());
	}

	@ExceptionHandler(NoResourceFoundException.class)
	ResponseEntity<ErroResposta> rotaDesconhecida() {
		return resposta(HttpStatus.NOT_FOUND, "Rota não encontrada.", Map.of());
	}

	@ExceptionHandler(HttpRequestMethodNotSupportedException.class)
	ResponseEntity<ErroResposta> metodoNaoPermitido() {
		return resposta(HttpStatus.METHOD_NOT_ALLOWED, "Método não permitido.", Map.of());
	}

	@ExceptionHandler(Exception.class)
	ResponseEntity<ErroResposta> inesperado(Exception erro) {
		log.error("Unexpected error", erro);
		return resposta(HttpStatus.INTERNAL_SERVER_ERROR, "Erro interno do servidor.", Map.of());
	}

	private static ResponseEntity<ErroResposta> resposta(HttpStatus status, String mensagem, Map<String, String> campos) {
		return ResponseEntity.status(status).body(new ErroResposta(status.value(), mensagem, campos));
	}
}
