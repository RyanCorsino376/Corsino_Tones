package com.corsinotones.controller;

import com.corsinotones.dto.PackRequest;
import com.corsinotones.dto.PackResponse;
import com.corsinotones.service.PackService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** Pack CRUD. Reads are public; writes need the ADMIN profile (SegurancaConfig). */
@RestController
@RequestMapping("/packs")
public class PackController {

	private final PackService servico;

	public PackController(PackService servico) {
		this.servico = servico;
	}

	@GetMapping
	public List<PackResponse> listar() {
		return servico.listar().stream().map(PackResponse::de).toList();
	}

	@GetMapping("/{id}")
	public PackResponse buscar(@PathVariable String id) {
		return PackResponse.de(servico.buscar(id));
	}

	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	public PackResponse criar(@Valid @RequestBody PackRequest pedido) {
		return PackResponse.de(servico.criar(dados(pedido)));
	}

	@PutMapping("/{id}")
	public PackResponse atualizar(@PathVariable String id, @Valid @RequestBody PackRequest pedido) {
		return PackResponse.de(servico.atualizar(id, dados(pedido)));
	}

	@DeleteMapping("/{id}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void excluir(@PathVariable String id) {
		servico.excluir(id);
	}

	// Validation already limited the price to a whole number from 0 to 1000000.
	private static PackService.Dados dados(PackRequest pedido) {
		return new PackService.Dados(pedido.nome(), pedido.estilo(), pedido.descricao(),
				pedido.precoCentavos().intValueExact(), pedido.equipamentoId());
	}
}
