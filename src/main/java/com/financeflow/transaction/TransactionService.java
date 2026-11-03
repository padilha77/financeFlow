package com.financeflow.transaction;

import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.util.List;

@Service
@Transactional(readOnly = true)
public class TransactionService {
    private final TransactionRepository repository;

    public TransactionService(TransactionRepository repository) {
        this.repository = repository;
    }

    private void validateTransaction(Transaction transaction) {
        if (transaction == null) {
            throw new IllegalArgumentException("A transação é obrigatória!");
        }
        if (transaction.getDescription() == null || transaction.getDescription().isBlank()) {
            throw new IllegalArgumentException("A descrição não pode estar vazia!");
        }
        if (transaction.getDescription().length() > 200) {
            throw new IllegalArgumentException("A descrição deve ter até 200 caracteres!");
        }
        BigDecimal amount = transaction.getAmount();
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("O valor da transação deve ser maior que zero!");
        }
        if (amount.scale() > 2 || amount.compareTo(new BigDecimal("100000000000000000")) >= 0) {
            throw new IllegalArgumentException("Use até 17 dígitos inteiros e 2 casas decimais!");
        }
        if (transaction.getDate() == null || transaction.getType() == null) {
            throw new IllegalArgumentException("A data e o tipo da transação são obrigatórios!");
        }  // fecha o último if
    }  // fecha validateTransaction

    @Transactional
    public Transaction addTransaction(Transaction transaction){
        validateTransaction(transaction);
        return repository.save(transaction);
    }

    @Transactional
    public Transaction updateTransaction(Long id, Transaction newData){
        Transaction existingTransaction = getTransaction(id);

        validateTransaction(newData);

        existingTransaction.updateDetails(
                newData.getDescription(),
                newData.getDate(),
                newData.getAmount(),
                newData.getType()
        );
        return repository.save(existingTransaction);
    }

    @Transactional
    public void deleteTransaction(Long id) {
        Transaction existingTransaction = getTransaction(id);
        repository.delete(existingTransaction);
    }


    public List<Transaction> getTransactions() {
        return repository.findAll(Sort.by(Sort.Direction.DESC, "date", "id"));
    }

    public Transaction getTransaction(Long id) {
        return repository.findById(id).orElseThrow(() -> new TransactionNotFoundException(id));
    }

    public BigDecimal calculateBalance() {
        return repository.totalByType(TransactionType.RECEITA)
                .subtract(repository.totalByType(TransactionType.DESPESA)).setScale(2);
    }
}
