package com.corsinotones.repository;

import com.corsinotones.model.Pack;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.TreeMap;

/**
 * Test fake of {@link PackRepository}. Like the database it rejects a taken id or style on an equipment with
 * {@link Duplicado} and a delete of a pack in use with {@link EmUso}. {@link #falharProximaEscritaCom} makes the next
 * write fail as a concurrent request would, after the service's own checks passed.
 */
public class PackRepositoryEmMemoria implements PackRepository {

	private final Map<String, Pack> porId = new TreeMap<>();
	private final Set<String> emUso = new HashSet<>();
	private RuntimeException proximaFalha;

	public void marcarEmUso(String id) {
		emUso.add(id);
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

	@Override
	public List<Pack> listar() {
		return porId.values().stream().sorted(Comparator.comparing(Pack::id)).toList();
	}

	@Override
	public Optional<Pack> buscar(String id) {
		return Optional.ofNullable(porId.get(id));
	}

	@Override
	public List<Pack> buscarVarios(Collection<String> ids) {
		return ids.stream().filter(porId::containsKey).map(porId::get).toList();
	}

	@Override
	public Pack criar(Pack pack) {
		talvezFalhar();
		if (porId.containsKey(pack.id())) {
			throw new Duplicado("pk_pack");
		}
		if (existeEstiloNoEquipamento(pack.estilo(), pack.equipamento().id(), null)) {
			throw new Duplicado("uk_pack_estilo_equipamento");
		}
		porId.put(pack.id(), pack);
		return pack;
	}

	@Override
	public Pack atualizar(Pack pack) {
		talvezFalhar();
		if (existeEstiloNoEquipamento(pack.estilo(), pack.equipamento().id(), pack.id())) {
			throw new Duplicado("uk_pack_estilo_equipamento");
		}
		porId.put(pack.id(), pack);
		return pack;
	}

	@Override
	public void excluir(String id) {
		talvezFalhar();
		if (emUso.contains(id)) {
			throw new EmUso("fk_preset_pack");
		}
		porId.remove(id);
	}

	@Override
	public boolean emUso(String id) {
		return emUso.contains(id);
	}

	@Override
	public boolean existeEstiloNoEquipamento(String estilo, long equipamentoId, String exceto) {
		return porId.values().stream().anyMatch(p -> p.estilo().equals(estilo)
				&& p.equipamento().id() == equipamentoId && !p.id().equals(exceto));
	}
}
