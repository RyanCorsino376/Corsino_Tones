package com.corsinotones.repository.jpa;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

interface UsuarioJpa extends JpaRepository<UsuarioEntidade, Long> {

	Optional<UsuarioEntidade> findByEmail(String email);

	boolean existsByEmail(String email);

	/** Inserts a seed user with its own id; a user with the same e-mail is replaced. */
	@Modifying
	@Query(value = "INSERT INTO usuario (id, nome, email, senha_hash, perfil)"
			+ " VALUES (:id, :nome, :email, :senhaHash, :perfil)"
			+ " ON CONFLICT (email) DO UPDATE SET nome = EXCLUDED.nome, senha_hash = EXCLUDED.senha_hash,"
			+ " perfil = EXCLUDED.perfil", nativeQuery = true)
	void inserirComId(@Param("id") long id, @Param("nome") String nome, @Param("email") String email,
			@Param("senhaHash") String senhaHash, @Param("perfil") String perfil);

	/** Moves the identity past the largest id, so explicit seed ids are never handed out again. */
	@Query(value = "SELECT setval(pg_get_serial_sequence('usuario', 'id'), (SELECT max(id) FROM usuario))",
			nativeQuery = true)
	Long avancarIdentidade();
}
