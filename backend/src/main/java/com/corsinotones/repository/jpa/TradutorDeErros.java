package com.corsinotones.repository.jpa;

import com.corsinotones.repository.Duplicado;
import com.corsinotones.repository.EmUso;
import org.hibernate.exception.ConstraintViolationException;
import org.springframework.dao.DataIntegrityViolationException;

/** Turns a constraint violation into the repository's own exception, by the constraint name of the migrations. */
final class TradutorDeErros {

	private TradutorDeErros() {
	}

	/**
	 * {@link Duplicado} for a unique or primary key ({@code uk_*}, {@code pk_*}: a pack id is chosen by the server,
	 * so it can be taken), {@link EmUso} for a foreign key ({@code fk_*}); the original exception for anything else.
	 */
	static RuntimeException traduzir(DataIntegrityViolationException erro) {
		String restricao = nomeDaRestricao(erro);
		if (restricao != null && (restricao.startsWith("uk_") || restricao.startsWith("pk_"))) {
			return new Duplicado(restricao);
		}
		if (restricao != null && restricao.startsWith("fk_")) {
			return new EmUso(restricao);
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
