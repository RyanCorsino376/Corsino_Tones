package com.corsinotones.service;

/** Unknown e-mail or wrong password; the same error for both so e-mails are not revealed. */
public class CredenciaisInvalidas extends RuntimeException {

	public CredenciaisInvalidas() {
		super("E-mail ou senha incorretos.");
	}
}
