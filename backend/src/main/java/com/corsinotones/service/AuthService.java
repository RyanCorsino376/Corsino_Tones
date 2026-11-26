package com.corsinotones.service;

import com.corsinotones.dto.CadastroRequest;
import com.corsinotones.dto.LoginRequest;
import com.corsinotones.model.Usuario;
import com.corsinotones.repository.UsuarioRepository;
import java.util.Locale;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

	private final UsuarioRepository repositorio;
	private final PasswordEncoder encoder;
	private final TokenService tokens;
	// Compared against when the e-mail is unknown, so both failures cost the same time.
	private final String hashFalso;

	/** The user who signed in and the token issued for them. */
	public record Sessao(Usuario usuario, String token) {
	}

	public AuthService(UsuarioRepository repositorio, PasswordEncoder encoder, TokenService tokens) {
		this.repositorio = repositorio;
		this.encoder = encoder;
		this.tokens = tokens;
		this.hashFalso = encoder.encode("senha-que-nunca-sera-usada");
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

	/** Checks the credentials, or throws {@link CredenciaisInvalidas} (the same error for an unknown e-mail and a wrong password). */
	public Sessao entrar(LoginRequest pedido) {
		Usuario usuario = repositorio.buscarPorEmail(normalizarEmail(pedido.email())).orElse(null);
		boolean senhaCorreta = encoder.matches(pedido.senha(), usuario == null ? hashFalso : usuario.senhaHash());
		if (usuario == null || !senhaCorreta) {
			throw new CredenciaisInvalidas();
		}
		return new Sessao(usuario, tokens.gerar(usuario));
	}
}
