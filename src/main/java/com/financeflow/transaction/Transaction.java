package com.financeflow.transaction;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "transactions")
public class Transaction {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String description;

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal amount;

    @Column(name = "transaction_date", nullable = false)
    private LocalDate date;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 7)
    private TransactionType type;

    protected Transaction() {
        // Construtor utilizado pelo JPA para ler uma transação do banco.
    }

    public Transaction(String description, LocalDate date, BigDecimal amount, TransactionType type) {
        this.description = description;
        this.date = date;
        this.amount = amount;
        this.type = type;
    }

    public void updateDetails(
            String description,
            LocalDate date,
            BigDecimal amount,
            TransactionType type){

        this.description = description;
        this.date = date;
        this.amount = amount;
        this.type = type;
    }

    public Long getId() {
        return id; }
    public String getDescription() {
        return description; }
    public BigDecimal getAmount() {
        return amount; }
    public LocalDate getDate() {
        return date; }
    public TransactionType getType() {
        return type; }
}
