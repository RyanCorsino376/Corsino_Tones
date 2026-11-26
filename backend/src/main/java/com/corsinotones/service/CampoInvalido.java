package com.corsinotones.service;

/** One field of the body is well formed but refers to something that does not exist (400 with that field). */
public class CampoInvalido extends RuntimeException {

	private final String campo;

	public CampoInvalido(String campo, String mensagem) {
		super(mensagem);
		this.campo = campo;
	}

	public String campo() {
		return campo;
	}
}
