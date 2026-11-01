import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;

public class Main {
    public static void main(String[] args) {
        System.out.println("=================================");
        System.out.println("         FINANCE FLOW             ");
        System.out.println("=================================");

        System.out.println("Bem vindo ao seu controle financeiro!");
        System.out.println();

        System.out.println("1 - Cadastrar receita");
        System.out.println("2 - Cadastrar despesa");
        System.out.println("3 - Consultar saldo");
        System.out.println("4 - Listar transações");
        System.out.println("0 - Sair");

        System.out.println();
        System.out.println("=================================");

        Transaction despesa = new Transaction(
                "Alimentação",
                LocalDate.now(),

                new BigDecimal("150.00"),
                "Despesa"
        );
        Transaction contaLuz = new Transaction(
                "Conta de Luz",
                LocalDate.now(),

                new BigDecimal("150.00"),
                "Despesa"

        );
        Transaction salario = new Transaction(
                "Salario",
                LocalDate.now(),
                new BigDecimal("3000.00"), "Receita"
        );

        // Criando a lista de transações
        ArrayList<Transaction> transactions = new ArrayList<>();

        // Adicionando as transações na lista
        transactions.add(despesa);
        transactions.add(salario);
        transactions.add(contaLuz);

        System.out.println("Total de transações: " + transactions.size() + "\n");

        for (Transaction transaction : transactions) {
            System.out.println("Descrição: " + transaction.getDescription());
            System.out.println("Valor: R$ " + transaction.getAmount());
            System.out.println("Tipo: " + transaction.getType() + "\n");
        }
        // calculando o saldo financeiro
        BigDecimal saldo = BigDecimal.ZERO;
        for (Transaction transaction : transactions) {
            if (transaction.getType().equals("Receita")) {
                saldo = saldo.add(transaction.getAmount());
            } else if (transaction.getType().equals("Despesa")) {
                saldo = saldo.subtract(transaction.getAmount());
            }
        }
        System.out.println("Saldo atual: R$ " + saldo);


    }
}