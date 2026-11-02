import java.math.BigDecimal;
import java.util.ArrayList;

public class TransactionService {

    private ArrayList<Transaction> transactions =  new ArrayList<>();

    public void  addTransaction(Transaction transaction) {

        // validando a descrição
        if(transaction.getDescription() == null ||
            transaction.getDescription().isBlank()){

            throw new IllegalArgumentException(
                    "A descrição não pode estar vazia!"
            );

        }

        // validando o valor
        if (transaction.getAmount() == null ||
                transaction.getAmount().compareTo(BigDecimal.ZERO) <= 0) {

            throw new IllegalArgumentException(
                    "O valor da transação deve ser maior que zero!"
            );
        }
        // adicionando a transação a lista
        transactions.add(transaction);
    }

    public ArrayList<Transaction> getTransactions() {
        return transactions;
    }

    public BigDecimal calculateBalance() {

        BigDecimal saldo = BigDecimal.ZERO;
        for (Transaction transaction : transactions) {

            if (transaction.getType().equals(TransactionType.RECEITA)) {
                saldo = saldo.add(transaction.getAmount());

            } else if (transaction.getType().equals(TransactionType.DESPESA)) {
                saldo = saldo.subtract(transaction.getAmount());
            }
        }
        return saldo;
    }


}
