package com.corsinotones.controller;

import com.corsinotones.service.CredenciaisInvalidas;
import com.corsinotones.service.EmailEmUso;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Test-only routes that raise each error the handler must translate. */
@RestController
@RequestMapping("/teste")
class ControladorDeTeste {

	record Corpo(@NotNull(message = "nome ausente") @Size(min = 2, message = "nome curto") String nome,
			@NotNull(message = "senha ausente") String senha) {
	}

	@PostMapping("/validar")
	String validar(@Valid @RequestBody Corpo corpo) {
		return "ok";
	}

	@PostMapping("/email-em-uso")
	void emailEmUso() {
		throw new EmailEmUso();
	}

	@PostMapping("/credenciais")
	void credenciais() {
		throw new CredenciaisInvalidas();
	}

	@PostMapping("/explode")
	void explode() {
		throw new RuntimeException("segredo interno");
	}

	@GetMapping("/so-get")
	String soGet() {
		return "ok";
	}
}
