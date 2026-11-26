package com.corsinotones.dto;

import com.corsinotones.model.Equipamento;

/** An equipment as the API shows it. */
public record EquipamentoResponse(long id, String marca, String modelo) {

	public static EquipamentoResponse de(Equipamento equipamento) {
		return new EquipamentoResponse(equipamento.id(), equipamento.marca(), equipamento.modelo());
	}
}
