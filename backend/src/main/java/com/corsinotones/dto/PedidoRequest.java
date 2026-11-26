package com.corsinotones.dto;

import java.util.List;

/**
 * Body of POST /pedidos. Only the packs are read: the owner, total, status and time come from the server (PED-03), so
 * any other field the client sends is ignored. An empty or missing list is rejected by the service (PED-07).
 */
public record PedidoRequest(List<String> packIds) {
}
