package com.corsinotones.repository;

/** The database refused a delete because other rows still point to this one, through the foreign key {@link #restricao()}. */
public class EmUso extends RuntimeException {

	private final String restricao;

	public EmUso(String restricao) {
		super("Foreign key violated: " + restricao);
		this.restricao = restricao;
	}

	public String restricao() {
		return restricao;
	}
}
