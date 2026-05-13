package org.example.api.dish;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.Map;
import java.util.Set;

import org.example.DTOs.dish.DishResponse;
import org.example.api.ApiTestPayloads;
import org.example.entity.enums.DegreeReadiness;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

@DisplayName("Блюдо: получение списка и по id (GET)")
class DishRetriveCrudApi extends DishApiSupport {

    @Test
    void getAllDishes() {
        ResponseEntity<List<DishResponse>> r =
                rest.exchange("/api/dishes", HttpMethod.GET, null, new ParameterizedTypeReference<>() {});
        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(r.getBody()).isNotNull();
    }

    @Test
    void getUnknownDishById() {
        ResponseEntity<String> r = rest.getForEntity("/api/dishes/999999999", String.class);
        assertDefaultSpringError(r, 500, "/api/dishes/999999999");
    }

    @Test
    void getByIdMatchesCreatedDish() {
        Long pid = createTrackedProduct(90, 9, 9, 9, DegreeReadiness.READY_TO_EAT);
        String name = unique("чтениеId");
        Map<String, Object> create =
                dishBody(
                        name,
                        List.of(),
                        null,
                        null,
                        null,
                        null,
                        List.of(ApiTestPayloads.compositionLine(pid, 60)),
                        120,
                        "SECOND",
                        Set.of("VEGAN"));
        DishResponse created =
                rest.postForEntity("/api/dishes", json(create), DishResponse.class).getBody();
        trackDish(created.getId());

        ResponseEntity<DishResponse> r =
                rest.getForEntity("/api/dishes/" + created.getId(), DishResponse.class);
        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(r.getBody().getId()).isEqualTo(created.getId());
    }
}
