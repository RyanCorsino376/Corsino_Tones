package com.corsinotones.dto;

import com.corsinotones.model.Preset;

/**
 * A preset as the API shows it, with the mock's field names: {@code estilo}, {@code marca} and {@code equipamento}
 * come from its pack and equipment, and {@code data} is {@code YYYY-MM-DD}. The file key is never shown (PRS-12).
 */
public record PresetResponse(long id, String nome, String estilo, String marca, String equipamento, String data,
		String descricao, String packId) {

	public static PresetResponse de(Preset preset) {
		return new PresetResponse(preset.id(), preset.nome(), preset.pack().estilo(),
				preset.pack().equipamento().marca(), preset.pack().equipamento().modelo(), preset.data().toString(),
				preset.descricao(), preset.pack().id());
	}
}
