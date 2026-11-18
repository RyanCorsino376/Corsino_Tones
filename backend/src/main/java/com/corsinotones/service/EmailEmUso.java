package com.corsinotones.service;

/** The e-mail already belongs to a registered user. */
public class EmailEmUso extends RuntimeException {

	public EmailEmUso() {
		super("Este e-mail já está cadastrado.");
	}
}
