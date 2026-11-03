package com.financeflow.transaction;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.stream.Stream;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TransactionServiceTest {
    @Mock TransactionRepository repository;
    @InjectMocks TransactionService service;

    @Test
    void deveAdicionarUmaTransacao() {
        Transaction receita = transaction(
                "Freelance",
                "500.00",
                TransactionType.RECEITA);
        when(repository.save(receita)).thenReturn(receita);

        assertSame(receita, service.addTransaction(receita));
        verify(repository).save(receita);
    }

    @Test
    void deveRejeitarTransacaoComValorNegativo() {
        assertThrows(IllegalArgumentException.class,
                () -> service.addTransaction(transaction(
                        "Internet",
                        "-200.00",
                        TransactionType.DESPESA)));
        verifyNoInteractions(repository);
    }

    @Test
    void deveRejeitarTransacaoComValorZero() {
        assertThrows(IllegalArgumentException.class,
                () -> service.addTransaction(transaction(
                        "Internet",
                        "0.00",
                        TransactionType.DESPESA)));
        verifyNoInteractions(repository);
    }

    @Test
    void deveRejeitarTransacaoComDescricaoVazia() {
        assertThrows(IllegalArgumentException.class,
                () -> service.addTransaction(transaction(
                        "  ",
                        "100.00",
                        TransactionType.DESPESA)));
        verifyNoInteractions(repository);
    }

    @Test
    void deveCalcularSaldoCorretamente() {
        when(repository.totalByType(TransactionType.RECEITA))
                .thenReturn(new BigDecimal("3000.00"));

        when(repository.totalByType(TransactionType.DESPESA))
                .thenReturn(new BigDecimal("500.00"));
        assertEquals(new BigDecimal("2500.00"), service.calculateBalance());
    }

    @ParameterizedTest
    @MethodSource("invalidTransactions")
    void deveRejeitarDadosIncompletosOuPrecisaoInvalida(Transaction transaction) {
        assertThrows(IllegalArgumentException.class, () -> service.addTransaction(transaction));
        verifyNoInteractions(repository);
    }

    static Stream<Transaction> invalidTransactions() {
        return Stream.of(
                null,
                new Transaction(null, LocalDate.now(), BigDecimal.ONE, TransactionType.RECEITA),
                new Transaction("Receita", null, BigDecimal.ONE, TransactionType.RECEITA),
                new Transaction("Receita", LocalDate.now(), null, TransactionType.RECEITA),
                new Transaction("Receita", LocalDate.now(), BigDecimal.ONE, null),
                transaction("Receita", "1.001", TransactionType.RECEITA),
                transaction("Receita", "100000000000000000", TransactionType.RECEITA));
    }

    private static Transaction transaction(String description, String amount, TransactionType type) {
        return new Transaction(description, LocalDate.now(), new BigDecimal(amount), type);
    }
}
