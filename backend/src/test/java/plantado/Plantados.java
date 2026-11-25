package plantado;

import jakarta.persistence.Entity;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Deliberately wrong types for ArquiteturaTest. They live outside com.corsinotones so the application's entity and
 * repository scan never picks them up.
 */
public final class Plantados {

	private Plantados() {
	}

	@Entity
	public static class EntidadeRuim {
	}

	public static class ControladorRuim {
		public EntidadeRuim direto() {
			return null;
		}

		public List<EntidadeRuim> emLista() {
			return null;
		}

		public String limpo() {
			return null;
		}
	}

	public interface RepositorioRuim extends JpaRepository<EntidadeRuim, Long> {
	}

	public static class ServicoRuim {
		public ServicoRuim(RepositorioRuim repositorio, String outro) {
		}
	}
}
