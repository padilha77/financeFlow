package com.financeflow.transaction;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDate;

public record TransactionRequest(
        @NotBlank(message = "A descrição não pode estar vazia!")
        @Size(max = 200, message = "A descrição deve ter até 200 caracteres!") String description,
        @NotNull(message = "A data é obrigatória!") LocalDate date,
        @NotNull(message = "O valor é obrigatório!")
        @DecimalMin(value = "0.00", inclusive = false, message = "O valor deve ser maior que zero!")
        @Digits(integer = 17, fraction = 2, message = "Use até 17 dígitos inteiros e 2 casas decimais!") BigDecimal amount,
        @NotNull(message = "O tipo é obrigatório!") TransactionType type) {

    public Transaction toTransaction() {
        return new Transaction(description.strip(), date, amount, type);
    }
}
