package com.corsinotones.dto;

/** Body of a successful login: the signed token and the user it belongs to. */
public record LoginResponse(String token, UsuarioResponse usuario) {
}
