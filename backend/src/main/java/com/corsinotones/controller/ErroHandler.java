package com.corsinotones.controller;

import com.corsinotones.dto.ErroResposta;
import com.corsinotones.service.CredenciaisInvalidas;
import com.corsinotones.service.EmailEmUso;
import java.util.LinkedHashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
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

	@ExceptionHandler(EmailEmUso.class)
	ResponseEntity<ErroResposta> emailEmUso(EmailEmUso erro) {
		return resposta(HttpStatus.CONFLICT, erro.getMessage(), Map.of());
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
