import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.InputMismatchException;
import java.util.Scanner;

public class Main {
    public static void main(String[] args) {

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
        TransactionService service = new TransactionService();

        // Adicionando as transações na lista
       service.addTransaction(despesa);
       service.addTransaction(contaLuz);
       service.addTransaction(salario);


        Scanner sc = new Scanner(System.in);
        System.out.println("=================================");
        System.out.println("         FINANCE FLOW             ");
        System.out.println("=================================");

        System.out.println("Bem vindo ao seu controle financeiro!");
        System.out.println();

        int opcao;
        do {
            System.out.println("1 - Cadastrar receita");
            System.out.println("2 - Cadastrar despesa");
            System.out.println("3 - Consultar saldo");
            System.out.println("4 - Listar transações");
            System.out.println("0 - Sair");

            System.out.print("Escolha uma das opções acima: ");
            opcao = sc.nextInt();

            switch (opcao) {
                case 1:
                    System.out.println("===== CADASTRAR RECEITA =====");

                    sc.nextLine();  //  para consumir o enter pendente

                    System.out.print("Descrição da receita: ");
                    String descricao = sc.nextLine();

                    System.out.println("Descrição informada: " + descricao);

                    System.out.print("Valor da receita: ");

                    try {
                        BigDecimal valor = sc.nextBigDecimal();

                        Transaction novaReceita = new Transaction(
                                descricao,
                                LocalDate.now(),
                                valor,
                                "Receita"
                        );

                        service.addTransaction(novaReceita);

                        System.out.println("Receita cadastrada com sucesso! \n");

                    } catch (InputMismatchException e) {
                        System.out.println("Erro: Digite um valor numérico válido!");
                        sc.nextLine(); // descarta entrada inválida
                    } catch (IllegalArgumentException e) {
                        System.out.println("Erro: " + e.getMessage());
                    }

                    break;

                case 2:
                    System.out.println("===== CADASTRAR DESPESA =====");

                    sc.nextLine();  //  para consumir o enter pendente

                    System.out.print("Descrição da despesa: ");
                    String descricaoDespesa = sc.nextLine();

                    System.out.println("Descrição informada: " + descricaoDespesa);

                    System.out.print("Valor da despesa: ");

                    try {
                        BigDecimal valorDespesa = sc.nextBigDecimal();

                        Transaction novaDespesa = new Transaction(
                                descricaoDespesa,
                                LocalDate.now(),
                                valorDespesa,
                                "Despesa"
                        );

                        service.addTransaction(novaDespesa);

                        System.out.println("Despesa cadastrada com sucesso! \n");

                    } catch (InputMismatchException e) {
                        System.out.println("Erro: Digite um valor numérico válido!");
                        sc.nextLine();
                    } catch (IllegalArgumentException e) {
                        System.out.println("Erro: " +  e.getMessage());
                    }

                    break;

                case 3:
                    System.out.println("Saldo atual: R$ " + service.calculateBalance());
                    System.out.println();
                    break;

                case 4:
                    System.out.println("\n ===== LISTA DE TRANSAÇÕES =====");

                    for (Transaction transaction : service.getTransactions()) {
                        System.out.println("Descrição: " + transaction.getDescription());
                        System.out.println("Valor: R$ " + transaction.getAmount());
                        System.out.println("Tipo: " + transaction.getType() + "\n");
                        System.out.println("============================");
                    }
                    break;
                case 0:
                    System.out.println("Saindo...");
                    break;
            }
        } while (opcao != 0);
        sc.close();



    }
}