package com.corsinotones.dto;

import com.corsinotones.model.Pack;

/** A pack as the API shows it, with the mock's field names: {@code marca} and {@code equipamento} come from its equipment. */
public record PackResponse(String id, String nome, String estilo, String marca, String equipamento, long equipamentoId,
		String descricao, int precoCentavos) {

	public static PackResponse de(Pack pack) {
		return new PackResponse(pack.id(), pack.nome(), pack.estilo(), pack.equipamento().marca(),
				pack.equipamento().modelo(), pack.equipamento().id(), pack.descricao(), pack.precoCentavos());
	}
}
