import java.util.ArrayList;


public class TransactionService {

    private ArrayList<Transaction> transactions =  new ArrayList<>();

    public void  addTransaction(Transaction transaction) {
        transactions.add(transaction);
    }

    public ArrayList<Transaction> getTransactions() {
        return transactions;
    }

}
