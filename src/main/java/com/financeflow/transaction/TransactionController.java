package com.financeflow.transaction;

import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/transactions")
public class TransactionController {
    private final TransactionService service;

    public TransactionController(TransactionService service) {
        this.service = service;
    }

    @PostMapping
    public ResponseEntity<TransactionResponse> create(
            @Valid @RequestBody TransactionRequest request) {
        Transaction transaction = service.addTransaction(request.toTransaction());

        var location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}").buildAndExpand(transaction.getId()).toUri();
        return ResponseEntity.created(location)
                .body(TransactionResponse.from(transaction));
    }

    @PutMapping("/{id}")
    public TransactionResponse update(
            @PathVariable Long id,
            @Valid @RequestBody TransactionRequest request) {

        Transaction updated = service.updateTransaction(
                id,
                request.toTransaction()
        );

        return TransactionResponse.from(updated);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.deleteTransaction(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping
    public List<TransactionResponse> list() {
        return service.getTransactions().stream().map(TransactionResponse::from).toList();
    }

    @GetMapping("/{id}")
    public TransactionResponse find(@PathVariable Long id) {
        return TransactionResponse.from(service.getTransaction(id));
    }

    @GetMapping("/balance")
    public BalanceResponse balance() {
        return new BalanceResponse(service.calculateBalance());
    }

    public record BalanceResponse(BigDecimal balance) {}
}
