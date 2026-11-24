package com.corsinotones.model;

import java.time.LocalDate;

/**
 * One preset of a pack. Its style, brand and model are those of its pack and equipment. The key of its file
 * (a later slice) is not part of the model.
 */
public record Preset(long id, String nome, String descricao, LocalDate data, Pack pack) {
}
