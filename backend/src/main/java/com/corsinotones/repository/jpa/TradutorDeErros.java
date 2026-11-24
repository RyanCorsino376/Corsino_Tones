package com.corsinotones.repository.jpa;

import com.corsinotones.repository.Duplicado;
import org.hibernate.exception.ConstraintViolationException;
import org.springframework.dao.DataIntegrityViolationException;

/** Turns a constraint violation into the repository's own exception, by the constraint name of the migrations. */
final class TradutorDeErros {

	private TradutorDeErros() {
	}

	/** {@link Duplicado} for a unique key ({@code uk_*}); the original exception for anything else. */
	static RuntimeException traduzir(DataIntegrityViolationException erro) {
		String restricao = nomeDaRestricao(erro);
		if (restricao != null && restricao.startsWith("uk_")) {
			return new Duplicado(restricao);
		}
		return erro;
	}

	private static String nomeDaRestricao(Throwable erro) {
		for (Throwable atual = erro; atual != null; atual = atual.getCause()) {
			if (atual instanceof ConstraintViolationException violacao) {
				return violacao.getConstraintName();
			}
		}
		return null;
	}
}
