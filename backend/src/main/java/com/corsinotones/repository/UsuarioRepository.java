package com.corsinotones.repository;

import com.corsinotones.model.Usuario;
import java.util.Optional;

/** Storage of users. The e-mail is always the already normalised one (trimmed, lower-case). */
public interface UsuarioRepository {

	/** Finds a user by e-mail, or empty when there is none. */
	Optional<Usuario> buscarPorEmail(String email);

	/**
	 * Stores a new COMUM user; the database assigns the id (USR-02, USR-03).
	 * Returns empty, storing nothing, when the e-mail already exists.
	 */
	Optional<Usuario> criar(String nome, String email, String senhaHash);

	/** Stores an already built user with its own id (used by the seed). Replaces one with the same e-mail. */
	void carregar(Usuario usuario);
}
