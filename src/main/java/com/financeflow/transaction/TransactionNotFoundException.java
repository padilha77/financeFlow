package com.financeflow.transaction;

public class TransactionNotFoundException extends RuntimeException {
    public TransactionNotFoundException(Long id) {
        super("Transação " + id + " não encontrada.");
    }
}
