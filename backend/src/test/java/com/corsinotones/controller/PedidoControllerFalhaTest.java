package com.corsinotones.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.corsinotones.BancoIsolado;
import com.corsinotones.model.Usuario;
import com.corsinotones.repository.UsuarioRepository;
import com.corsinotones.service.TokenService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

// PED-10: a trigger that only exists in this test makes the item insert fail after the pedido row was written.
@SpringBootTest
@Import(BancoIsolado.class)
@AutoConfigureMockMvc
class PedidoControllerFalhaTest {

	@Autowired
	private MockMvc mvc;
	@Autowired
	private TokenService tokens;
	@Autowired
	private UsuarioRepository usuarios;
	@Autowired
	private JdbcTemplate jdbc;

	@Test
	void falhaAoGuardarUmItemDesfazOPedido() throws Exception {
		Usuario usuario = usuarios.criar("Cliente", "falha@exemplo.com", "hash").orElseThrow();
		jdbc.execute("""
				CREATE FUNCTION falha_no_item() RETURNS trigger AS $$
				BEGIN
				  IF NEW.pack_id = 'rock-boss-gt-1000' THEN
				    RAISE EXCEPTION 'item recusado pelo teste';
				  END IF;
				  RETURN NEW;
				END $$ LANGUAGE plpgsql""");
		jdbc.execute("CREATE TRIGGER falha_no_item BEFORE INSERT ON item_pedido "
				+ "FOR EACH ROW EXECUTE FUNCTION falha_no_item()");

		mvc.perform(post("/pedidos")
				.header("Authorization", "Bearer " + tokens.gerar(usuario))
				.contentType(MediaType.APPLICATION_JSON)
				.content("{\"packIds\":[\"blues-boss-gt-1000\",\"rock-boss-gt-1000\"]}"))
				.andExpect(status().isInternalServerError());

		assertThat(jdbc.queryForObject("SELECT count(*) FROM pedido WHERE usuario_id = ?", Integer.class,
				usuario.id())).isZero();
		assertThat(jdbc.queryForObject("SELECT count(*) FROM item_pedido", Integer.class)).isZero();
	}
}
