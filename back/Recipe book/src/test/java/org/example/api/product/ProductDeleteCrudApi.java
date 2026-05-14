package org.example.api.product;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.Map;
import java.util.Set;

import org.example.DTOs.dish.DishResponse;
import org.example.DTOs.product.ProductResponse;
import org.example.api.ApiTestPayloads;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import org.example.entity.enums.DegreeReadiness;
import org.example.entity.enums.ProductCategory;

@DisplayName("Продукт: delete (DELETE)")
class ProductDeleteCrudApi extends ProductApiSupport {

    @Test
    void returnsNoContentWhenProductNotUsedInAnyDish() {
        Long id =
                rest.postForEntity(
                                "/api/products",
                                json(
                                        productBody(
                                                unique("удалитьСвободный"),
                                                List.of(),
                                                5,
                                                5,
                                                5,
                                                5,
                                                null,
                                                ProductCategory.FROZEN.name(),
                                                DegreeReadiness.READY_TO_EAT.name(),
                                                Set.of())),
                                ProductResponse.class)
                        .getBody()
                        .getId();

        ResponseEntity<Void> del =
                rest.exchange("/api/products/" + id, HttpMethod.DELETE, null, Void.class);
        assertThat(del.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);

        ResponseEntity<String> after =
                rest.getForEntity("/api/products/" + id, String.class);
        assertDefaultSpringError(after, 500, "/api/products/" + id);
    }

    @Test
    void failsWhenProductIsUsedInDish_productRemains() {
        Long productId = createStandaloneProductInDishBlocked("вСоставе");

        String dishName = unique("блюдоСПродуктом");
        Map<String, Object> dishBody =
                ApiTestPayloads.dish(
                        dishName,
                        List.of(),
                        null,
                        null,
                        null,
                        null,
                        List.of(ApiTestPayloads.compositionLine(productId, 100)),
                        200.0,
                        "SECOND",
                        Set.of());
        Long dishId =
                rest.postForEntity("/api/dishes", json(dishBody), DishResponse.class).getBody().getId();
        trackDish(dishId);

        ResponseEntity<String> del =
                rest.exchange("/api/products/" + productId, HttpMethod.DELETE, null, String.class);
        assertDefaultSpringError(del, 500, "/api/products/" + productId);

        ResponseEntity<ProductResponse> stillThere =
                rest.getForEntity("/api/products/" + productId, ProductResponse.class);
        assertThat(stillThere.getStatusCode().is2xxSuccessful()).isTrue();
    }
}
