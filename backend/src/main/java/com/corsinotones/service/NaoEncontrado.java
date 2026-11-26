package com.corsinotones.service;

/** The resource named by the request does not exist; the message says which one (404). */
public class NaoEncontrado extends RuntimeException {

	public NaoEncontrado(String mensagem) {
		super(mensagem);
	}
}
