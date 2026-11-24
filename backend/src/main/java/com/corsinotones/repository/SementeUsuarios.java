package com.corsinotones.repository;

import com.corsinotones.model.Perfil;
import com.corsinotones.model.Usuario;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;
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
 * Loads the users of the mock seed ({@code usuarios} in mock/db.seed.json) at startup, only into an empty user table.
 * The file is only read, never written. The seed keeps plain passwords (mock-only), so each is hashed before storing.
 * The e-mails listed in {@code corsino.seed.admins} get the ADMIN profile; every other seeded user is COMUM.
 */
@Component
public class SementeUsuarios implements ApplicationRunner {

	private static final Logger log = LoggerFactory.getLogger(SementeUsuarios.class);

	private final UsuarioRepository repositorio;
	private final PasswordEncoder encoder;
	private final Path arquivo;
	private final Set<String> admins;

	public SementeUsuarios(UsuarioRepository repositorio, PasswordEncoder encoder,
			@Value("${corsino.seed.arquivo:../mock/db.seed.json}") String arquivo,
			@Value("${corsino.seed.admins:}") List<String> admins) {
		this.repositorio = repositorio;
		this.encoder = encoder;
		// Path.of, not a Path parameter: Spring would resolve a relative Path against the servlet context and reject "..".
		this.arquivo = Path.of(arquivo);
		this.admins = admins.stream().map(SementeUsuarios::normalizar).collect(Collectors.toSet());
	}

	private static String normalizar(String email) {
		return email.trim().toLowerCase(Locale.ROOT);
	}

	@Override
	public void run(ApplicationArguments args) throws Exception {
		if (!repositorio.vazio()) {
			log.info("Users already stored; seed skipped.");
			return;
		}
		if (!Files.isRegularFile(arquivo)) {
			log.warn("Seed file not found: {}. Starting with no users.", arquivo);
			return;
		}
		JsonNode raiz = JsonMapper.builder().build().readTree(Files.readAllBytes(arquivo));
		for (JsonNode u : raiz.path("usuarios")) {
			String email = normalizar(u.path("email").asString());
			Perfil perfil = admins.contains(email) ? Perfil.ADMIN : Perfil.COMUM;
			repositorio.carregar(new Usuario(u.path("id").asLong(), u.path("nome").asString(), email,
					encoder.encode(u.path("senha").asString()), perfil));
		}
		log.info("Seed loaded from {}", arquivo);
	}
}
