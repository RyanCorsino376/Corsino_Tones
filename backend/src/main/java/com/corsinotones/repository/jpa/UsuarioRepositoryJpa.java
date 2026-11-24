package com.corsinotones.repository.jpa;

import com.corsinotones.model.Perfil;
import com.corsinotones.model.Usuario;
import com.corsinotones.repository.Duplicado;
import com.corsinotones.repository.UsuarioRepository;
import java.util.Optional;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

/** Users in PostgreSQL. The database assigns ids, and its unique key on e-mail settles concurrent registrations. */
@Repository
public class UsuarioRepositoryJpa implements UsuarioRepository {

	private final UsuarioJpa jpa;

	UsuarioRepositoryJpa(UsuarioJpa jpa) {
		this.jpa = jpa;
	}

	@Override
	public Optional<Usuario> buscarPorEmail(String email) {
		return jpa.findByEmail(email).map(UsuarioEntidade::paraRegistro);
	}

	// The pre-check keeps a plain repeat from using up an id; the unique key catches a registration
	// that slipped in between the check and the insert (USR-07).
	@Override
	public Optional<Usuario> criar(String nome, String email, String senhaHash) {
		if (jpa.existsByEmail(email)) {
			return Optional.empty();
		}
		try {
			return Optional.of(jpa.saveAndFlush(new UsuarioEntidade(nome, email, senhaHash, Perfil.COMUM)).paraRegistro());
		} catch (DataIntegrityViolationException erro) {
			if (TradutorDeErros.traduzir(erro) instanceof Duplicado) {
				return Optional.empty();
			}
			throw erro;
		}
	}

	@Override
	@Transactional
	public void carregar(Usuario usuario) {
		jpa.inserirComId(usuario.id(), usuario.nome(), usuario.email(), usuario.senhaHash(), usuario.perfil().name());
		jpa.avancarIdentidade();
	}

	@Override
	public boolean vazio() {
		return jpa.count() == 0;
	}
}
