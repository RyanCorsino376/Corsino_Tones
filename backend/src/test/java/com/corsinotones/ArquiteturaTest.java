package com.corsinotones;

import static org.assertj.core.api.Assertions.assertThat;

import jakarta.persistence.Entity;
import java.io.IOException;
import java.lang.reflect.Constructor;
import java.lang.reflect.Method;
import java.lang.reflect.ParameterizedType;
import java.lang.reflect.Type;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import plantado.Plantados;

// ARQ-01 to ARQ-03: only the repository layer knows the database. Imports are read from the source, so a forbidden
// import fails even when the compiler would accept it; the signature rules read the compiled classes.
class ArquiteturaTest {

	private static final Path FONTES = Path.of("src/main/java");
	private static final String PACOTE = "com.corsinotones";
	private static final List<String> PROIBIDOS = List.of("jakarta.persistence", "org.springframework.data",
			"org.hibernate");

	// ARQ-01
	@Test
	void controllerEServiceNaoImportamTiposDeBanco() throws IOException {
		assertThat(importsProibidos(FONTES.resolve("com/corsinotones/controller"))).isEmpty();
		assertThat(importsProibidos(FONTES.resolve("com/corsinotones/service"))).isEmpty();
	}

	// ARQ-01: the scan is not vacuous, a planted bad import is found.
	@Test
	void importProibidoPlantadoEEncontrado(@TempDir Path pasta) throws IOException {
		Files.writeString(pasta.resolve("Ruim.java"), """
				package com.corsinotones.service;

				import jakarta.persistence.Entity;
				import org.springframework.data.jpa.repository.JpaRepository;

				class Ruim {}
				""");
		Files.writeString(pasta.resolve("Boa.java"), """
				package com.corsinotones.service;

				import java.util.List;

				class Boa {}
				""");

		assertThat(importsProibidos(pasta)).containsExactly("Ruim.java: import jakarta.persistence.Entity;",
				"Ruim.java: import org.springframework.data.jpa.repository.JpaRepository;");
	}

	// ARQ-02
	@Test
	void nenhumMetodoDeControllerDevolveEntity() throws Exception {
		for (Class<?> controller : classesDe("controller")) {
			assertThat(retornosEntity(controller)).as(controller.getSimpleName()).isEmpty();
		}
	}

	// ARQ-02: a planted controller returning an @Entity, directly or inside a List, is found.
	@Test
	void retornoEntityPlantadoEEncontrado() {
		assertThat(retornosEntity(Plantados.ControladorRuim.class)).containsExactlyInAnyOrder("direto", "emLista");
	}

	// ARQ-03
	@Test
	void construtorDeServiceNaoRecebeTipoDoSpringData() throws Exception {
		for (Class<?> servico : classesDe("service")) {
			assertThat(parametrosDeBanco(servico)).as(servico.getSimpleName()).isEmpty();
		}
	}

	// ARQ-03: a planted service taking a Spring Data repository is found.
	@Test
	void construtorComRepositorioSpringDataPlantadoEEncontrado() {
		assertThat(parametrosDeBanco(Plantados.ServicoRuim.class)).containsExactly(Plantados.RepositorioRuim.class.getName());
	}

	private static List<String> importsProibidos(Path pasta) throws IOException {
		List<String> achados = new ArrayList<>();
		try (Stream<Path> arquivos = Files.walk(pasta)) {
			for (Path arquivo : arquivos.filter(p -> p.toString().endsWith(".java")).sorted().toList()) {
				for (String linha : Files.readAllLines(arquivo)) {
					String texto = linha.strip();
					if (texto.startsWith("import ") && PROIBIDOS.stream().anyMatch(p -> texto.contains(" " + p)
							|| texto.contains(" static " + p))) {
						achados.add(arquivo.getFileName() + ": " + texto);
					}
				}
			}
		}
		return achados;
	}

	// The classes are named by the source files of the package, so a new class is checked without editing this test.
	private static List<Class<?>> classesDe(String pacote) throws Exception {
		List<Class<?>> classes = new ArrayList<>();
		try (Stream<Path> arquivos = Files.list(FONTES.resolve("com/corsinotones/" + pacote))) {
			for (Path arquivo : arquivos.filter(p -> p.toString().endsWith(".java")).sorted().toList()) {
				String nome = arquivo.getFileName().toString().replace(".java", "");
				classes.add(Class.forName(PACOTE + "." + pacote + "." + nome));
			}
		}
		assertThat(classes).isNotEmpty();
		return classes;
	}

	private static List<String> retornosEntity(Class<?> controller) {
		List<String> metodos = new ArrayList<>();
		for (Method metodo : controller.getDeclaredMethods()) {
			if (tiposEm(metodo.getGenericReturnType()).anyMatch(t -> t.isAnnotationPresent(Entity.class))) {
				metodos.add(metodo.getName());
			}
		}
		return metodos;
	}

	private static List<String> parametrosDeBanco(Class<?> servico) {
		List<String> achados = new ArrayList<>();
		for (Constructor<?> construtor : servico.getDeclaredConstructors()) {
			for (Class<?> tipo : construtor.getParameterTypes()) {
				if (tipo.getName().startsWith("org.springframework.data")
						|| org.springframework.data.repository.Repository.class.isAssignableFrom(tipo)) {
					achados.add(tipo.getName());
				}
			}
		}
		return achados;
	}

	// The type itself plus every type argument, so List<Entity> and ResponseEntity<Entity> are seen.
	private static Stream<Class<?>> tiposEm(Type tipo) {
		if (tipo instanceof Class<?> classe) {
			return Stream.of(classe);
		}
		if (tipo instanceof ParameterizedType parametrizado) {
			return Stream.concat(tiposEm(parametrizado.getRawType()),
					Stream.of(parametrizado.getActualTypeArguments()).flatMap(ArquiteturaTest::tiposEm));
		}
		return Stream.empty();
	}
}
