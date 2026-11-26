package com.corsinotones.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

/**
 * Body of POST and PUT /packs. Texts are trimmed on creation, so the rules see the trimmed text. The price is a
 * BigDecimal so that 49.5 reaches validation instead of being truncated into an int (PCK-09).
 */
public record PackRequest(
		@NotNull(message = PackRequest.MSG_NOME)
		@Size(min = 2, max = 120, message = PackRequest.MSG_NOME)
		String nome,

		@NotNull(message = PackRequest.MSG_ESTILO)
		@Size(min = 2, max = 30, message = PackRequest.MSG_ESTILO)
		String estilo,

		@NotNull(message = PackRequest.MSG_DESCRICAO)
		@Size(max = 500, message = PackRequest.MSG_DESCRICAO)
		String descricao,

		@NotNull(message = PackRequest.MSG_PRECO)
		@Digits(integer = 7, fraction = 0, message = PackRequest.MSG_PRECO)
		@DecimalMin(value = "0", message = PackRequest.MSG_PRECO)
		@DecimalMax(value = "1000000", message = PackRequest.MSG_PRECO)
		BigDecimal precoCentavos,

		@NotNull(message = PackRequest.MSG_EQUIPAMENTO)
		Long equipamentoId) {

	static final String MSG_NOME = "Informe um nome com 2 a 120 caracteres.";
	static final String MSG_ESTILO = "Informe um estilo com 2 a 30 caracteres.";
	static final String MSG_DESCRICAO = "Informe uma descrição de até 500 caracteres.";
	static final String MSG_PRECO = "Informe um preço entre 0 e 1000000 centavos.";
	static final String MSG_EQUIPAMENTO = "Equipamento não encontrado.";

	public PackRequest {
		nome = nome == null ? null : nome.trim();
		estilo = estilo == null ? null : estilo.trim();
		descricao = descricao == null ? null : descricao.trim();
	}
}
