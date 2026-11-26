package com.corsinotones.dto;

import java.util.Map;

/** The single error body of the API; {@code campos} maps a field name to its message (empty when no field applies). */
public record ErroResposta(int status, String mensagem, Map<String, String> campos) {

	public static ErroResposta semCampos(int status, String mensagem) {
		return new ErroResposta(status, mensagem, Map.of());
	}
}
