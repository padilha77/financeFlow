package com.financeflow.transaction;

import java.math.BigDecimal;
import java.time.LocalDate;

public record TransactionResponse(Long id, String description, LocalDate date,
                                  BigDecimal amount, TransactionType type) {
    public static TransactionResponse from(Transaction transaction) {
        return new TransactionResponse(transaction.getId(), transaction.getDescription(),
                transaction.getDate(), transaction.getAmount().setScale(2), transaction.getType());
    }
}
