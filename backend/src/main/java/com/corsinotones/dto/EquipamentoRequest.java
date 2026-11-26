package com.corsinotones.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** Body of POST and PUT /equipamentos. Both fields are trimmed on creation, so the rules see the trimmed text. */
public record EquipamentoRequest(
		@NotNull(message = EquipamentoRequest.MSG_MARCA)
		@Size(min = 1, max = 50, message = EquipamentoRequest.MSG_MARCA)
		String marca,

		@NotNull(message = EquipamentoRequest.MSG_MODELO)
		@Size(min = 1, max = 50, message = EquipamentoRequest.MSG_MODELO)
		String modelo) {

	static final String MSG_MARCA = "Informe a marca com 1 a 50 caracteres.";
	static final String MSG_MODELO = "Informe o modelo com 1 a 50 caracteres.";

	public EquipamentoRequest {
		marca = marca == null ? null : marca.trim();
		modelo = modelo == null ? null : modelo.trim();
	}
}
