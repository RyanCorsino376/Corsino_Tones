package com.corsinotones.controller;

import com.corsinotones.repository.UsuarioRepository;
import com.corsinotones.service.CampoInvalido;
import com.corsinotones.service.Conflito;
import com.corsinotones.service.CredenciaisInvalidas;
import com.corsinotones.service.EmailEmUso;
import com.corsinotones.service.NaoEncontrado;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Test-only routes that raise each error the handler must translate. */
@RestController
@RequestMapping("/teste")
class ControladorDeTeste {

	private final UsuarioRepository usuarios;

	ControladorDeTeste(UsuarioRepository usuarios) {
		this.usuarios = usuarios;
	}

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

	@PostMapping("/nao-encontrado")
	void naoEncontrado() {
		throw new NaoEncontrado("Equipamento não encontrado.");
	}

	@PostMapping("/conflito")
	void conflito() {
		throw new Conflito("Este equipamento já está cadastrado.");
	}

	@PostMapping("/campo-invalido")
	void campoInvalido() {
		throw new CampoInvalido("equipamentoId", "Equipamento não encontrado.");
	}

	@GetMapping("/item/{id}")
	String item(@PathVariable long id) {
		return "item " + id;
	}

	// Reads the database, so it fails when the database is down (ERR-06).
	@GetMapping("/usuarios")
	String usuarios() {
		return usuarios.buscarPorEmail("ryan@exemplo.com").isPresent() ? "ok" : "vazio";
	}
}
