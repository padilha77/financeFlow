import java.math.BigDecimal;
import java.util.ArrayList;

public class TransactionService {

    private ArrayList<Transaction> transactions =  new ArrayList<>();

    public void  addTransaction(Transaction transaction) {
        if (transaction.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException(
                    "O valor da transação deve ser maior que zero!"
            );
        }
        transactions.add(transaction);
    }

    public ArrayList<Transaction> getTransactions() {
        return transactions;
    }

    public BigDecimal calculateBalance() {

        BigDecimal saldo = BigDecimal.ZERO;
        for (Transaction transaction : transactions) {

            if (transaction.getType().equals("Receita")) {
                saldo = saldo.add(transaction.getAmount());

            } else if (transaction.getType().equals("Despesa")) {
                saldo = saldo.subtract(transaction.getAmount());
            }
        }
        return saldo;
    }


}
