package org.example.api.dish;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.example.DTOs.dish.DishResponse;
import org.example.api.ApiTestPayloads;
import org.example.entity.enums.DegreeReadiness;
import org.example.entity.enums.Flag;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

@DisplayName("Блюдо: update (PUT)")
class DishUpdateCrudApi extends DishApiSupport {

    @Test
    @DisplayName("Название — rejectsWhenNameMissing")
    void rejectsWhenNameMissing() {
        long putId = createBaseDish();
        Long pid = createTrackedProduct(10, 1, 1, 1, DegreeReadiness.READY_TO_EAT);
        Map<String, Object> body =
                dishBodyWithoutName(
                        List.of(),
                        List.of(ApiTestPayloads.compositionLine(pid, 10)),
                        100,
                        "SECOND",
                        Set.of());
        ResponseEntity<String> r = putDish(putId, body, String.class);
        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    @DisplayName("Название — rejectsWhenNameOneCharacter")
    void rejectsWhenNameOneCharacter() {
        long putId = createBaseDish();
        Long pid = createTrackedProduct(10, 1, 1, 1, DegreeReadiness.READY_TO_EAT);
        Map<String, Object> body =
                dishBody(
                        "x",
                        List.of(),
                        null,
                        null,
                        null,
                        null,
                        List.of(ApiTestPayloads.compositionLine(pid, 10)),
                        100,
                        "SECOND",
                        Set.of());
        ResponseEntity<String> r = putDish(putId, body, String.class);
        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    @DisplayName("Название — acceptsWhenNameTwoCharacters")
    void acceptsWhenNameTwoCharacters() {
        long putId = createBaseDish();
        Long pid = createTrackedProduct(10, 1, 1, 1, DegreeReadiness.READY_TO_EAT);
        Map<String, Object> body =
                dishBody(
                        "ув",
                        List.of(),
                        null,
                        null,
                        null,
                        null,
                        List.of(ApiTestPayloads.compositionLine(pid, 10)),
                        100,
                        "SECOND",
                        Set.of());
        ResponseEntity<DishResponse> r = putDish(putId, body, DishResponse.class);
        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(r.getBody().getName()).isEqualTo("ув");
    }

    @Test
    @DisplayName("Фото — acceptsZeroPhotos")
    void acceptsZeroPhotos() {
        long putId = createBaseDish();
        Long pid = createTrackedProduct(10, 1, 1, 1, DegreeReadiness.READY_TO_EAT);
        Map<String, Object> body =
                dishBody(
                        unique("без фото"),
                        List.of(),
                        null,
                        null,
                        null,
                        null,
                        List.of(ApiTestPayloads.compositionLine(pid, 20)),
                        80,
                        "SOUP",
                        Set.of());
        ResponseEntity<DishResponse> r = putDish(putId, body, DishResponse.class);
        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(r.getBody().getPhotoKeys()).isEmpty();
    }

    @Test
    @DisplayName("Фото — rejectsSixPhotoKeys")
    void rejectsSixPhotoKeys() {
        long putId = createBaseDish();
        Long pid = createTrackedProduct(10, 1, 1, 1, DegreeReadiness.READY_TO_EAT);
        List<String> keys = new ArrayList<>();
        for (int i = 0; i < 6; i++) {
            keys.add("dummy-key-PUT-" + i);
        }
        Map<String, Object> body =
                dishBody(
                        unique("шестьФото-PUT"),
                        keys,
                        null,
                        null,
                        null,
                        null,
                        List.of(ApiTestPayloads.compositionLine(pid, 10)),
                        50,
                        "SNACK",
                        Set.of());
        ResponseEntity<String> r = putDish(putId, body, String.class);
        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    @DisplayName("Состав (продукты) — rejectsEmptyComposition")
    void rejectsEmptyComposition() {
        long putId = createBaseDish();
        Map<String, Object> body =
                dishBody(
                        unique("пустой-PUT"),
                        List.of(),
                        1.0,
                        1.0,
                        1.0,
                        1.0,
                        List.of(),
                        100,
                        "FIRST",
                        Set.of());
        ResponseEntity<String> r = putDish(putId, body, String.class);
        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    @DisplayName("Состав (продукты) — acceptsSeveralProducts")
    void acceptsSeveralProducts() {
        long putId = createBaseDish();
        Long p1 = createTrackedProduct(100, 10, 5, 15, DegreeReadiness.READY_TO_EAT);
        Long p2 = createTrackedProduct(50, 2, 3, 4, DegreeReadiness.SEMI_FINISHED);
        Long p3 = createTrackedProduct(20, 1, 1, 2, DegreeReadiness.REQUIRES_COOKING);
        Map<String, Object> body =
                dishBody(
                        unique("несколько продуктов"),
                        List.of(),
                        null,
                        null,
                        null,
                        null,
                        List.of(
                                ApiTestPayloads.compositionLine(p1, 50),
                                ApiTestPayloads.compositionLine(p2, 30),
                                ApiTestPayloads.compositionLine(p3, 20)),
                        100,
                        "SECOND",
                        Set.of());
        ResponseEntity<DishResponse> r = putDish(putId, body, DishResponse.class);
        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(r.getBody().getComposition()).hasSize(3);
    }

    @Test
    @DisplayName("Состав (продукты) — rejectsUnknownProduct")
    void rejectsUnknownProduct() {
        long putId = createBaseDish();
        Map<String, Object> body =
                dishBody(
                        unique("неизвестный продукт-PUT"),
                        List.of(),
                        null,
                        null,
                        null,
                        null,
                        List.of(ApiTestPayloads.compositionLine(UNKNOWN_PRODUCT_ID, 10)),
                        100,
                        "FIRST",
                        Set.of());
        ResponseEntity<String> r = putDish(putId, body, String.class);
        assertDefaultSpringError(r, 500, "/api/dishes/" + putId);
    }

    @DisplayName("Категория блюда")
    @ParameterizedTest(name = "{0}")
    @MethodSource("org.example.api.dish.DishApiSupport#dishCategorySamples")
    void acceptsEachCategory(String category) {
        long putId = createBaseDish();
        Long pid = createTrackedProduct(15, 1, 1, 1, DegreeReadiness.READY_TO_EAT);
        Map<String, Object> body =
                dishBody(
                        unique("категория-PUT-" + category),
                        List.of(),
                        null,
                        null,
                        null,
                        null,
                        List.of(ApiTestPayloads.compositionLine(pid, 10)),
                        50,
                        category,
                        Set.of());
        ResponseEntity<DishResponse> r = putDish(putId, body, DishResponse.class);
        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(r.getBody().getCategory().name()).isEqualTo(category);
    }

    @DisplayName("Метки (flags)")
    @ParameterizedTest(name = "{0}")
    @MethodSource("org.example.api.dish.DishApiSupport#dishFlagSamples")
    void acceptsEachFlagAlone(String flag) {
        long putId = createBaseDish();
        Long pid = createTrackedProduct(10, 1, 1, 1, DegreeReadiness.READY_TO_EAT);
        Map<String, Object> body =
                dishBody(
                        unique("флаг-PUT-" + flag),
                        List.of(),
                        null,
                        null,
                        null,
                        null,
                        List.of(ApiTestPayloads.compositionLine(pid, 10)),
                        50,
                        "DESSERT",
                        Set.of(flag));
        ResponseEntity<DishResponse> r = putDish(putId, body, DishResponse.class);
        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(r.getBody().getFlags()).containsExactlyInAnyOrderElementsOf(Set.of(Flag.valueOf(flag)));
    }

    @Test
    @DisplayName("Метки (flags) — acceptsAllFlagsTogether")
    void acceptsAllFlagsTogether() {
        long putId = createBaseDish();
        Long pid = createTrackedProduct(10, 1, 1, 1, DegreeReadiness.READY_TO_EAT);
        Map<String, Object> body =
                dishBody(
                        unique("всеМетки-PUT"),
                        List.of(),
                        null,
                        null,
                        null,
                        null,
                        List.of(ApiTestPayloads.compositionLine(pid, 10)),
                        50,
                        "DESSERT",
                        Set.of("VEGAN", "GLUTEN_FREE", "SUGAR_FREE"));
        ResponseEntity<DishResponse> r = putDish(putId, body, DishResponse.class);
        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(r.getBody().getFlags())
                .containsExactlyInAnyOrder(Flag.VEGAN, Flag.GLUTEN_FREE, Flag.SUGAR_FREE);
    }
}
