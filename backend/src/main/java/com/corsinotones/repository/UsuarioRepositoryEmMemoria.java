package com.corsinotones.repository;

import com.corsinotones.model.Usuario;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Repository;

/** Keeps users in memory, keyed by e-mail. Everything is lost on restart (the database replaces this class later). */
@Repository
public class UsuarioRepositoryEmMemoria implements UsuarioRepository {

	private final Map<String, Usuario> porEmail = new ConcurrentHashMap<>();

	@Override
	public Optional<Usuario> buscarPorEmail(String email) {
		return Optional.ofNullable(porEmail.get(email));
	}

	// synchronized: the e-mail check, the max-id read and the insert must be one step (CAD-12).
	@Override
	public synchronized Optional<Usuario> criar(String nome, String email, String senhaHash) {
		if (porEmail.containsKey(email)) {
			return Optional.empty();
		}
		long proximoId = porEmail.values().stream().mapToLong(Usuario::id).max().orElse(0L) + 1;
		Usuario usuario = new Usuario(proximoId, nome, email, senhaHash);
		porEmail.put(email, usuario);
		return Optional.of(usuario);
	}

	@Override
	public synchronized void carregar(Usuario usuario) {
		porEmail.put(usuario.email(), usuario);
	}
}
