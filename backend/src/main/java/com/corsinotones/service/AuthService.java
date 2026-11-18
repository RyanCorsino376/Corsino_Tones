package com.corsinotones.service;

import com.corsinotones.dto.CadastroRequest;
import com.corsinotones.model.Usuario;
import com.corsinotones.repository.UsuarioRepository;
import java.util.Locale;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

	private final UsuarioRepository repositorio;
	private final PasswordEncoder encoder;

	public AuthService(UsuarioRepository repositorio, PasswordEncoder encoder) {
		this.repositorio = repositorio;
		this.encoder = encoder;
	}

	/** "  Ryan@Exemplo.com " and "ryan@exemplo.com" are the same account. */
	static String normalizarEmail(String email) {
		return email.trim().toLowerCase(Locale.ROOT);
	}

	/** Creates the account, or throws {@link EmailEmUso}. */
	public Usuario cadastrar(CadastroRequest pedido) {
		String email = normalizarEmail(pedido.email());
		return repositorio.criar(pedido.nome(), email, encoder.encode(pedido.senha()))
				.orElseThrow(EmailEmUso::new);
	}
}
