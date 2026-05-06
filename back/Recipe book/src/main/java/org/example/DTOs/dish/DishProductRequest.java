package org.example.DTOs.dish;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

public class DishProductRequest {

    @NotNull
    private Long productId;

    @NotNull
    @DecimalMin(value = "0.0", inclusive = false)
    private Double amount;

    public Long getProductId() {
        return productId;
    }

    public void setProductId(Long productId) {
        this.productId = productId;
    }

    public Double getAmount() {
        return amount;
    }

    public void setAmount(Double amount) {
        this.amount = amount;
    }
}
