package com.corsinotones.repository;

import com.corsinotones.model.Equipamento;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

/**
 * Test fake of {@link EquipamentoRepository}. Like the database it rejects a duplicate pair with {@link Duplicado}
 * and a delete of an equipment with packs with {@link EmUso}. {@link #falharProximaEscritaCom} makes the next write
 * fail as a concurrent request would, after the service's own checks passed.
 */
public class EquipamentoRepositoryEmMemoria implements EquipamentoRepository {

	private final Map<Long, Equipamento> porId = new LinkedHashMap<>();
	private final Set<Long> comPacks = new HashSet<>();
	private long proximoId = 1;
	private RuntimeException proximaFalha;

	public void marcarComPacks(long id) {
		comPacks.add(id);
	}

	public void falharProximaEscritaCom(RuntimeException falha) {
		proximaFalha = falha;
	}

	private void talvezFalhar() {
		if (proximaFalha != null) {
			RuntimeException falha = proximaFalha;
			proximaFalha = null;
			throw falha;
		}
	}

	private void exigirParLivre(String marca, String modelo, long exceto) {
		if (porId.values().stream().anyMatch(e -> e.id() != exceto && e.marca().equals(marca) && e.modelo().equals(modelo))) {
			throw new Duplicado("uk_equipamento_marca_modelo");
		}
	}

	@Override
	public List<Equipamento> listar() {
		return porId.values().stream()
				.sorted(Comparator.comparing(Equipamento::marca).thenComparing(Equipamento::modelo)).toList();
	}

	@Override
	public Optional<Equipamento> buscar(long id) {
		return Optional.ofNullable(porId.get(id));
	}

	@Override
	public Equipamento criar(String marca, String modelo) {
		talvezFalhar();
		exigirParLivre(marca, modelo, -1);
		Equipamento novo = new Equipamento(proximoId++, marca, modelo);
		porId.put(novo.id(), novo);
		return novo;
	}

	@Override
	public Equipamento atualizar(Equipamento equipamento) {
		talvezFalhar();
		exigirParLivre(equipamento.marca(), equipamento.modelo(), equipamento.id());
		porId.put(equipamento.id(), equipamento);
		return equipamento;
	}

	@Override
	public void excluir(long id) {
		talvezFalhar();
		if (comPacks.contains(id)) {
			throw new EmUso("fk_pack_equipamento");
		}
		porId.remove(id);
	}

	@Override
	public boolean temPacks(long id) {
		return comPacks.contains(id);
	}
}
