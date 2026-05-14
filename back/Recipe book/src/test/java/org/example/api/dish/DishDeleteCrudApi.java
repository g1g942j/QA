package org.example.api.dish;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.Set;

import org.example.DTOs.dish.DishResponse;
import org.example.api.ApiTestPayloads;
import org.example.entity.enums.DegreeReadiness;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

@DisplayName("Блюдо: delete (DELETE)")
class DishDeleteCrudApi extends DishApiSupport {

    @Test
    void returnsNoContent() {
        Long pid = createTrackedProduct(10, 1, 1, 1, DegreeReadiness.READY_TO_EAT);
        Long dishId =
                rest.postForEntity(
                                "/api/dishes",
                                json(
                                        dishBody(
                                                unique("удалить"),
                                                List.of(),
                                                null,
                                                null,
                                                null,
                                                null,
                                                List.of(ApiTestPayloads.compositionLine(pid, 10)),
                                                10,
                                                "SNACK",
                                                Set.of())),
                                DishResponse.class)
                        .getBody()
                        .getId();
        ResponseEntity<Void> del =
                rest.exchange("/api/dishes/" + dishId, HttpMethod.DELETE, null, Void.class);
        assertThat(del.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
    }
}
