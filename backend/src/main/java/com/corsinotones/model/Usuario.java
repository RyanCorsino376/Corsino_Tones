package com.corsinotones.model;

/** A registered user. The password is only ever kept as a BCrypt hash. */
public record Usuario(long id, String nome, String email, String senhaHash, Perfil perfil) {
}
