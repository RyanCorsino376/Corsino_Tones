package com.corsinotones.controller;

import com.corsinotones.dto.CadastroRequest;
import com.corsinotones.dto.UsuarioResponse;
import com.corsinotones.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/auth")
public class AuthController {

	private final AuthService servico;

	public AuthController(AuthService servico) {
		this.servico = servico;
	}

	@PostMapping("/cadastro")
	@ResponseStatus(HttpStatus.CREATED)
	public UsuarioResponse cadastrar(@Valid @RequestBody CadastroRequest pedido) {
		return UsuarioResponse.de(servico.cadastrar(pedido));
	}
}
