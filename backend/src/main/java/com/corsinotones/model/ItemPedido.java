package com.corsinotones.model;

/** One pack of an order, with the price it was sold for: a later price change of the pack does not reach it. */
public record ItemPedido(String packId, int precoCentavos) {
}
