package com.corsinotones.controller;

import com.corsinotones.dto.EquipamentoRequest;
import com.corsinotones.dto.EquipamentoResponse;
import com.corsinotones.service.EquipamentoService;
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

/** Equipment CRUD. Reads are public; writes need the ADMIN profile (SegurancaConfig). */
@RestController
@RequestMapping("/equipamentos")
public class EquipamentoController {

	private final EquipamentoService servico;

	public EquipamentoController(EquipamentoService servico) {
		this.servico = servico;
	}

	@GetMapping
	public List<EquipamentoResponse> listar() {
		return servico.listar().stream().map(EquipamentoResponse::de).toList();
	}

	@GetMapping("/{id}")
	public EquipamentoResponse buscar(@PathVariable long id) {
		return EquipamentoResponse.de(servico.buscar(id));
	}

	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	public EquipamentoResponse criar(@Valid @RequestBody EquipamentoRequest pedido) {
		return EquipamentoResponse.de(servico.criar(pedido.marca(), pedido.modelo()));
	}

	@PutMapping("/{id}")
	public EquipamentoResponse atualizar(@PathVariable long id, @Valid @RequestBody EquipamentoRequest pedido) {
		return EquipamentoResponse.de(servico.atualizar(id, pedido.marca(), pedido.modelo()));
	}

	@DeleteMapping("/{id}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void excluir(@PathVariable long id) {
		servico.excluir(id);
	}
}
