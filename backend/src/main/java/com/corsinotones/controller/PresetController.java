package com.corsinotones.controller;

import com.corsinotones.dto.PresetRequest;
import com.corsinotones.dto.PresetResponse;
import com.corsinotones.model.Preset;
import com.corsinotones.service.PresetService;
import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** Preset CRUD. Reads are public; writes need the ADMIN profile (SegurancaConfig). */
@RestController
@RequestMapping("/presets")
public class PresetController {

	private final PresetService servico;

	public PresetController(PresetService servico) {
		this.servico = servico;
	}

	/** Every preset, or only those of {@code packId} when it is given. */
	@GetMapping
	public List<PresetResponse> listar(@RequestParam(required = false) String packId) {
		List<Preset> presets = packId == null ? servico.listar() : servico.listarPorPack(packId);
		return presets.stream().map(PresetResponse::de).toList();
	}

	@GetMapping("/{id}")
	public PresetResponse buscar(@PathVariable long id) {
		return PresetResponse.de(servico.buscar(id));
	}

	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	public PresetResponse criar(@Valid @RequestBody PresetRequest pedido) {
		return PresetResponse.de(servico.criar(dados(pedido)));
	}

	@PutMapping("/{id}")
	public PresetResponse atualizar(@PathVariable long id, @Valid @RequestBody PresetRequest pedido) {
		return PresetResponse.de(servico.atualizar(id, dados(pedido)));
	}

	@DeleteMapping("/{id}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void excluir(@PathVariable long id) {
		servico.excluir(id);
	}

	// Validation already checked that the date parses.
	private static PresetService.Dados dados(PresetRequest pedido) {
		return new PresetService.Dados(pedido.nome(), pedido.descricao(), LocalDate.parse(pedido.data()),
				pedido.packId());
	}
}
