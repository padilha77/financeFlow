package com.financeflow.transaction;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import jakarta.persistence.EntityManager;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.matchesPattern;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest  // carrega a aplicação para o teste
@AutoConfigureMockMvc  // permite simular requisições HTTP sem abrir outra porta de servidor
@ActiveProfiles("test")  // carrega as configurações de application-test.properties
@Transactional  // faz as alterações de cada teste serem revertidas ao terminar
class TransactionApiIT {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;
    @Autowired EntityManager entityManager;
    @Autowired TransactionRepository repository;

    @Test
    void deveCadastrarConsultarEListarTransacaoNoPostgres()
            throws Exception {
        String body = mvc.perform(post("/api/transactions").contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"description":" Salário ","date":"2026-11-03","amount":3000.00,"type":"RECEITA"}
                                """))
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", matchesPattern(".*/api/transactions/\\d+")))
                .andExpect(jsonPath("$.description").value("Salário"))
                .andReturn().getResponse().getContentAsString();
        long id = mapper.readTree(body).get("id").asLong();
        repository.flush();
        assertTrue(repository.findById(id).isPresent());
        mvc.perform(get("/api/transactions/{id}", id))
                .andExpect(status().isOk()).andExpect(jsonPath("$.amount").value(3000.00));
        mvc.perform(get("/api/transactions"))
                .andExpect(status().isOk()).andExpect(jsonPath("$[*].id", hasItem((int) id)));
    }

    @Test
    void deveSomarReceitasESubtrairDespesasComCentavos() throws Exception {
        BigDecimal baseline = repository.totalByType(TransactionType.RECEITA)
                .subtract(repository.totalByType(TransactionType.DESPESA));
        repository.save(new Transaction("Receita", LocalDate.now(), new BigDecimal("100.10"), TransactionType.RECEITA));
        repository.save(new Transaction("Despesa", LocalDate.now(), new BigDecimal("25.05"), TransactionType.DESPESA));
        String body = mvc.perform(get("/api/transactions/balance"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        assertEquals(0, mapper.readTree(body).get("balance").decimalValue()
                .compareTo(baseline.add(new BigDecimal("75.05"))));
    }

    @Test
    void deveRetornar404ParaTransacaoInexistente() throws Exception {
        mvc.perform(get("/api/transactions/9223372036854775807"))
                .andExpect(status().isNotFound()).andExpect(jsonPath("$.status").value(404));
    }

    @Test
    void deveEditarTransacaoMantendoIdentificador() throws Exception {
        Transaction original = repository.saveAndFlush(
                new Transaction(
                        "Conta de luz",
                        LocalDate.of(2026, 11, 3),
                        new BigDecimal("150.00"),
                        TransactionType.DESPESA
                )
        );

        Long id = original.getId();
        long totalBefore = repository.count();

        mvc.perform(put("/api/transactions/{id}", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                            {
                                "description": "Freelance",
                                "date": "2026-11-04",
                                "amount": 500.00,
                                "type": "RECEITA"
                            }
                            """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id))
                .andExpect(jsonPath("$.description").value("Freelance"))
                .andExpect(jsonPath("$.date").value("2026-11-04"))
                .andExpect(jsonPath("$.amount").value(500.00))
                .andExpect(jsonPath("$.type").value("RECEITA"));

        repository.flush();
        entityManager.clear();

        Transaction updated = repository.findById(id).orElseThrow();

        assertEquals("Freelance", updated.getDescription());
        assertEquals(LocalDate.of(2026, 11, 4), updated.getDate());
        assertEquals(new BigDecimal("500.00"), updated.getAmount());
        assertEquals(TransactionType.RECEITA, updated.getType());
        assertEquals(totalBefore, repository.count());
    }

    @Test
    void deveExcluirTransacaoNoPostgres() throws Exception {
        Transaction original = repository.saveAndFlush(
                new Transaction(
                        "Conta de luz",
                        LocalDate.of(2026, 11, 3),
                        new BigDecimal("150.00"),
                        TransactionType.DESPESA
                )
        );

        Long id = original.getId();
        long totalBefore = repository.count();

        mvc.perform(delete("/api/transactions/{id}", id))
                .andExpect(status().isNoContent())
                .andExpect(content().string(""));

        repository.flush();
        entityManager.clear();

        assertTrue(repository.findById(id).isEmpty());
        assertEquals(totalBefore - 1, repository.count());

        mvc.perform(get("/api/transactions/{id}", id))
                .andExpect(status().isNotFound());
    }

    @Test
    void deveRetornar404AoExcluirTransacaoInexistente() throws Exception {
        long totalBefore = repository.count();

        mvc.perform(delete("/api/transactions/9223372036854775807"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404));

        assertEquals(totalBefore, repository.count());
    }

    @Test
    void deveRetornar404AoEditarTransacaoInexistente() throws Exception {
        long totalBefore = repository.count();

        mvc.perform(put("/api/transactions/9223372036854775807")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                            {
                                "description": "Freelance",
                                "date": "2026-11-04",
                                "amount": 500.00,
                                "type": "RECEITA"
                            }
                            """))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404));

        assertEquals(totalBefore, repository.count());
    }

    @Test
    void deveRejeitarEdicaoInvalidaSemAlterarRegistro() throws Exception {
        Transaction original = repository.saveAndFlush(
                new Transaction(
                        "Conta de luz",
                        LocalDate.of(2026, 11, 3),
                        new BigDecimal("150.00"),
                        TransactionType.DESPESA
                )
        );

        Long id = original.getId();
        long totalBefore = repository.count();

        mvc.perform(put("/api/transactions/{id}", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                            {
                                "description": "Conta alterada",
                                "date": "2026-11-04",
                                "amount": -200.00,
                                "type": "RECEITA"
                            }
                            """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[*].field", hasItem("amount")));

        repository.flush();
        entityManager.clear();

        Transaction unchanged = repository.findById(id).orElseThrow();

        assertEquals("Conta de luz", unchanged.getDescription());
        assertEquals(LocalDate.of(2026, 11, 3), unchanged.getDate());
        assertEquals(new BigDecimal("150.00"), unchanged.getAmount());
        assertEquals(TransactionType.DESPESA, unchanged.getType());
        assertEquals(totalBefore, repository.count());
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "{\"description\":\" \",\"date\":\"2026-11-03\",\"amount\":10,\"type\":\"RECEITA\"}",
            "{\"description\":\"Teste\",\"date\":\"2026-11-03\",\"amount\":0,\"type\":\"RECEITA\"}",
            "{\"description\":\"Teste\",\"date\":\"2026-11-03\",\"amount\":-1,\"type\":\"DESPESA\"}",
            "{\"description\":\"Teste\",\"date\":\"2026-11-03\",\"amount\":1.001,\"type\":\"RECEITA\"}",
            "{\"description\":\"Teste\",\"date\":\"2026-11-03\",\"amount\":100000000000000000,\"type\":\"RECEITA\"}",
            "{\"description\":\"Teste\",\"date\":\"2026-11-03\",\"amount\":10,\"type\":\"INVALIDO\"}",
            "{\"description\":\"Teste\",\"date\":\"2026-11-03\",\"amount\":10,\"type\":0}",
            "{\"description\":\"Teste\",\"date\":\"data inválida\",\"amount\":10,\"type\":\"RECEITA\"}",
            "{}"
    })
    void deveRejeitarRequisicaoInvalidaSemSalvar(String json) throws Exception {
        long before = repository.count();
        mvc.perform(post("/api/transactions").contentType(MediaType.APPLICATION_JSON).content(json))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.status").value(400));
        assertEquals(before, repository.count());
    }
}
