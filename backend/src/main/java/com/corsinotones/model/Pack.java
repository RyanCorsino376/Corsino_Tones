package com.corsinotones.model;

/** A set of presets for one style on one equipment. The id is a slug built at creation and never changes. */
public record Pack(String id, String nome, String estilo, String descricao, int precoCentavos, Equipamento equipamento) {
}
