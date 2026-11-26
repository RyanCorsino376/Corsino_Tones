package com.corsinotones.controller;

import com.corsinotones.dto.PedidoRequest;
import com.corsinotones.dto.PedidoResponse;
import com.corsinotones.model.StatusPedido;
import com.corsinotones.service.PedidoService;
import java.util.List;
import java.util.Optional;
import java.util.stream.Stream;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** Orders of the signed-in user. The user is always the token's subject, never a value from the request. */
@RestController
@RequestMapping("/pedidos")
public class PedidoController {

	private final PedidoService servico;

	public PedidoController(PedidoService servico) {
		this.servico = servico;
	}

	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	public PedidoResponse criar(@AuthenticationPrincipal Jwt token, @RequestBody PedidoRequest pedido) {
		return PedidoResponse.de(servico.criar(usuarioId(token), pedido.packIds()));
	}

	@GetMapping
	public List<PedidoResponse> listar(@AuthenticationPrincipal Jwt token,
			@RequestParam(name = "status") Optional<String> status) {
		Optional<StatusPedido> filtro = status.map(PedidoController::statusDe).orElse(Optional.empty());
		// A status that names no state matches no order, like an unknown packId filter: an empty list, not an error.
		if (status.isPresent() && filtro.isEmpty()) {
			return List.of();
		}
		return servico.listar(usuarioId(token), filtro).stream().map(PedidoResponse::de).toList();
	}

	@GetMapping("/{id}")
	public PedidoResponse buscar(@AuthenticationPrincipal Jwt token, @PathVariable long id) {
		return PedidoResponse.de(servico.buscar(id, usuarioId(token)));
	}

	private static long usuarioId(Jwt token) {
		return Long.parseLong(token.getSubject());
	}

	private static Optional<StatusPedido> statusDe(String texto) {
		return Stream.of(StatusPedido.values()).filter(s -> s.name().equalsIgnoreCase(texto)).findFirst();
	}
}
