package com.corsinotones.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Body of POST and PUT /presets. Texts are trimmed on creation, so the rules see the trimmed text. The date stays a
 * String so that an impossible date lands in {@code campos.data} instead of failing JSON parsing (PRS-09). There is
 * no file key: a body that sends {@code arquivoChave} has it ignored (PRS-12).
 */
public record PresetRequest(
		@NotNull(message = PresetRequest.MSG_NOME)
		@Size(min = 2, max = 120, message = PresetRequest.MSG_NOME)
		String nome,

		@NotNull(message = PresetRequest.MSG_DESCRICAO)
		@Size(max = 500, message = PresetRequest.MSG_DESCRICAO)
		String descricao,

		@DataIso(message = PresetRequest.MSG_DATA)
		String data,

		@NotNull(message = PresetRequest.MSG_PACK)
		String packId) {

	static final String MSG_NOME = "Informe um nome com 2 a 120 caracteres.";
	static final String MSG_DESCRICAO = "Informe uma descrição de até 500 caracteres.";
	static final String MSG_DATA = "Informe a data no formato AAAA-MM-DD.";
	static final String MSG_PACK = "Pack não encontrado.";

	public PresetRequest {
		nome = nome == null ? null : nome.trim();
		descricao = descricao == null ? null : descricao.trim();
	}
}
