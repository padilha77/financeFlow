import java.math.BigDecimal;
import java.time.LocalDate;

    // atributos
public class Transaction {
    private String description;
    private BigDecimal amount;
    private LocalDate date;
    private TransactionType type;

    // construtor
    public Transaction(String description,
                       LocalDate date,
                       BigDecimal amount,
                       TransactionType type) {

        this.description = description;
        this.date = date;
        this.amount = amount;
        this.type = type;
    }

    // getters e setters
    public String getDescription() {
        return description;
    }
    public void setDescription(String description) {
        this.description = description;
    }

    public BigDecimal getAmount() {
        return amount;
    }
    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }

    public LocalDate getDate() {
        return date;
    }
    public void setDate(LocalDate date) {
        this.date = date;
    }

    public TransactionType getType() {
        return type;
    }
    public void setType(TransactionType type) {
        this.type = type;
    }

}
