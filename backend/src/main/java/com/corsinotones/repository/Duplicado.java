package com.corsinotones.repository;

/** The database refused a write that breaks a unique constraint, named in {@link #restricao()}. */
public class Duplicado extends RuntimeException {

	private final String restricao;

	public Duplicado(String restricao) {
		super("Unique constraint violated: " + restricao);
		this.restricao = restricao;
	}

	public String restricao() {
		return restricao;
	}
}
