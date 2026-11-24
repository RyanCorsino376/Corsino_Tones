package com.corsinotones.service;

/** The request breaks a uniqueness or delete rule; the message is the rule of that resource (409). */
public class Conflito extends RuntimeException {

	public Conflito(String mensagem) {
		super(mensagem);
	}
}
