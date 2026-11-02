import java.math.BigDecimal;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.assertThrows;


import static org.junit.jupiter.api.Assertions.assertEquals;

public class TransactionServiceTest {
    @Test
    void deveAdicionarUmaTransacao() {

        TransactionService transactionService = new TransactionService();

        Transaction receita = new Transaction(
                "Freelance",
                LocalDate.now(),
                new BigDecimal("500.00"),
                TransactionType.RECEITA
        );
        transactionService.addTransaction(receita);

        assertEquals(1, transactionService.getTransactions().size());
    }

    @Test
    void deveRejeitarTransacaoComValorNegativo() {

        TransactionService service = new TransactionService();

        Transaction despesa = new Transaction(
                "Internet",
                LocalDate.now(),
                new BigDecimal("-200.00"),
                TransactionType.DESPESA
        );

        assertThrows(IllegalArgumentException.class, () -> {
            service.addTransaction(despesa);
        });
    }

    @Test
    void deveRejeitarTransacaoComValorZero() {
        TransactionService service = new TransactionService();

        Transaction despesa2 = new Transaction(
                "Internet",
                LocalDate.now(),
                BigDecimal.ZERO,
                TransactionType.DESPESA
        );
        assertThrows(IllegalArgumentException.class, () -> {
            service.addTransaction(despesa2);
        });
        assertEquals(0, service.getTransactions().size());

    }


}
