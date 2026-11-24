package com.corsinotones.repository;

import com.corsinotones.model.Perfil;
import com.corsinotones.model.Usuario;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Locale;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * Loads the users of the mock seed ({@code usuarios} in mock/db.seed.json) at startup.
 * The file is only read, never written. The seed keeps plain passwords (mock-only), so each is hashed before storing.
 */
@Component
public class SementeUsuarios implements ApplicationRunner {

	private static final Logger log = LoggerFactory.getLogger(SementeUsuarios.class);

	private final UsuarioRepository repositorio;
	private final PasswordEncoder encoder;
	private final Path arquivo;

	public SementeUsuarios(UsuarioRepository repositorio, PasswordEncoder encoder,
			@Value("${corsino.seed.arquivo:../mock/db.seed.json}") String arquivo) {
		this.repositorio = repositorio;
		this.encoder = encoder;
		// Path.of, not a Path parameter: Spring would resolve a relative Path against the servlet context and reject "..".
		this.arquivo = Path.of(arquivo);
	}

	@Override
	public void run(ApplicationArguments args) throws Exception {
		if (!Files.isRegularFile(arquivo)) {
			log.warn("Seed file not found: {}. Starting with no users.", arquivo);
			return;
		}
		JsonNode raiz = JsonMapper.builder().build().readTree(Files.readAllBytes(arquivo));
		for (JsonNode u : raiz.path("usuarios")) {
			String email = u.path("email").asString().trim().toLowerCase(Locale.ROOT);
			repositorio.carregar(new Usuario(u.path("id").asLong(), u.path("nome").asString(), email,
					encoder.encode(u.path("senha").asString()), Perfil.COMUM));
		}
		log.info("Seed loaded from {}", arquivo);
	}
}
