package org.example.api.product;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Stream;

import org.example.DTOs.product.ProductResponse;
import org.example.api.CrudHttpVerb;
import org.example.entity.enums.DegreeReadiness;
import org.example.entity.enums.Flag;
import org.example.entity.enums.ProductCategory;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

@DisplayName("Продукт: POST и PUT (общие проверки)")
class ProductCreateCrudApi extends ProductApiSupport {

    private Long putProductId(CrudHttpVerb verb) {
        return verb == CrudHttpVerb.PUT ? createBaseProduct() : null;
    }

    static Stream<CrudHttpVerb> postAndPut() {
        return Stream.of(CrudHttpVerb.POST, CrudHttpVerb.PUT);
    }

    private static final double[] BJU_SINGLE_FIELD_BOUNDARIES =
            new double[] {-0.1, 0.0, 0.1, 99.9, 100.0, 100.1};

    static Stream<Arguments> macroVerbFieldAndValue() {
        return postAndPut()
                .flatMap(
                        verb ->
                                Stream.of(
                                                ProductApiSupport.MacroField.PROTEINS,
                                                ProductApiSupport.MacroField.FATS,
                                                ProductApiSupport.MacroField.CARBS)
                                        .flatMap(
                                                field ->
                                                        Arrays.stream(BJU_SINGLE_FIELD_BOUNDARIES)
                                                                .mapToObj(
                                                                        v ->
                                                                                Arguments.of(
                                                                                        verb, field, v))));
    }

    static Stream<Arguments> categoryAndVerb() {
        List<String> sample =
                List.of(
                        ProductCategory.MEAT.name(),
                        ProductCategory.SWEETS.name(),
                        ProductCategory.LIQUID.name());
        return postAndPut().flatMap(verb -> sample.stream().map(cat -> Arguments.of(verb, cat)));
    }

    static Stream<Arguments> degreeAndVerb() {
        return postAndPut()
                .flatMap(
                        verb ->
                                Stream.of(
                                        Arguments.of(verb, DegreeReadiness.READY_TO_EAT),
                                        Arguments.of(verb, DegreeReadiness.REQUIRES_COOKING)));
    }

    static Stream<Arguments> flagAndVerb() {
        return postAndPut()
                .flatMap(
                        verb ->
                                Stream.of("VEGAN", "GLUTEN_FREE")
                                        .map(flag -> Arguments.of(verb, flag)));
    }

    @Nested
    @DisplayName("Название")
    class Name {
        static Stream<Arguments> noName() {
            return Stream.of(
                    Arguments.of(CrudHttpVerb.POST),
                    Arguments.of(CrudHttpVerb.PUT));
        }

        @ParameterizedTest(name = "{0}")
        @MethodSource("noName")
        void rejectsWhenNameMissing(CrudHttpVerb verb) {
            Long putId = putProductId(verb);
            Map<String, Object> body =
                    productBodyWithoutName(
                            List.of(),
                            10,
                            5,
                            5,
                            5,
                            null,
                            ProductCategory.VEGETABLES.name(),
                            DegreeReadiness.READY_TO_EAT.name(),
                            Set.of());
            ResponseEntity<String> r =
                    executeProduct(verb, putId, body, String.class);
            assertThat(r.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        }

        static Stream<Arguments> nameOneCharCases() {
            return Stream.of(
                    Arguments.of(CrudHttpVerb.POST, "ф"),
                    Arguments.of(CrudHttpVerb.PUT, "к"));
        }

        @ParameterizedTest(name = "{0} name={1}")
        @MethodSource("nameOneCharCases")
        void rejectsWhenNameOneCharacter(CrudHttpVerb verb, String badName) {
            Long putId = putProductId(verb);
            Map<String, Object> body =
                    productBody(
                            badName,
                            List.of(),
                            10,
                            5,
                            5,
                            5,
                            null,
                            ProductCategory.FROZEN.name(),
                            DegreeReadiness.READY_TO_EAT.name(),
                            Set.of());
            ResponseEntity<String> r =
                    executeProduct(verb, putId, body, String.class);
            assertThat(r.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        }

        static Stream<Arguments> nameTwoCharsCases() {
            return Stream.of(
                    Arguments.of(CrudHttpVerb.POST, "пр", HttpStatus.CREATED),
                    Arguments.of(CrudHttpVerb.PUT, "ми", HttpStatus.OK));
        }

        @ParameterizedTest(name = "{0} -> {2}")
        @MethodSource("nameTwoCharsCases")
        void acceptsWhenNameTwoCharacters(
                CrudHttpVerb verb, String name, HttpStatus expected) {
            Long putId = putProductId(verb);
            Map<String, Object> body =
                    productBody(
                            name,
                            List.of(),
                            10,
                            5,
                            5,
                            5,
                            null,
                            ProductCategory.GREENS.name(),
                            DegreeReadiness.READY_TO_EAT.name(),
                            Set.of());
            ResponseEntity<ProductResponse> r =
                    executeProduct(verb, putId, body, ProductResponse.class);
            assertThat(r.getStatusCode()).isEqualTo(expected);
            assertThat(r.getBody().getName()).isEqualTo(name);
            if (verb == CrudHttpVerb.POST) {
                trackProduct(r.getBody().getId());
            }
        }
    }

    @Nested
    @DisplayName("Фото")
    class Photos {

        @ParameterizedTest(name = "{0}")
        @MethodSource("org.example.api.product.ProductCreateCrudApi#postAndPut")
        void acceptsZeroPhotos(CrudHttpVerb verb) {
            Long putId = putProductId(verb);
            Map<String, Object> body;
                body =
                        productBody(
                                unique("без фото"),
                                List.of(),
                                25,
                                10,
                                10,
                                10,
                                "—",
                                ProductCategory.CANNED.name(),
                                DegreeReadiness.SEMI_FINISHED.name(),
                                Set.of());
            ResponseEntity<ProductResponse> r =
                    executeProduct(verb, putId, body, ProductResponse.class);
            assertThat(r.getStatusCode())
                    .isEqualTo(verb == CrudHttpVerb.POST ? HttpStatus.CREATED : HttpStatus.OK);
            assertThat(r.getBody().getPhotoKeys()).isEmpty();
            if (verb == CrudHttpVerb.POST) {
                trackProduct(r.getBody().getId());
            }
        }

        @ParameterizedTest(name = "{0}")
        @MethodSource("org.example.api.product.ProductCreateCrudApi#postAndPut")
        void rejectsSixPhotoKeys(CrudHttpVerb verb) {
            Long putId = putProductId(verb);
            List<String> keys = new ArrayList<>();
            for (int i = 0; i < 6; i++) {
                keys.add("dummy-" + verb + "-" + i);
            }
            Map<String, Object> body =
                    productBody(
                            unique("шестьФото-" + verb),
                            keys,
                            10,
                            3,
                            3,
                            3,
                            null,
                            ProductCategory.SPICES.name(),
                            DegreeReadiness.READY_TO_EAT.name(),
                            Set.of());
            ResponseEntity<String> r =
                    executeProduct(verb, putId, body, String.class);
            assertThat(r.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        }
    }

    @Nested
    @DisplayName("КБЖУ по одному полю: границы 0.1 ниже нуля, 0, 0.1, 99.9, 100, 100.1 выше сотни")
    class Macros {

        @ParameterizedTest(name = "{0} {1}={2}")
        @MethodSource("org.example.api.product.ProductCreateCrudApi#macroVerbFieldAndValue")
        void macroValue(CrudHttpVerb verb, ProductApiSupport.MacroField field, double value) {
            Long putId = putProductId(verb);
            Map<String, Object> body =
                    productBodyWithMacro(
                            field,
                            value,
                            unique("кбжу-" + verb),
                            List.of(),
                            null,
                            ProductCategory.SWEETS.name(),
                            DegreeReadiness.READY_TO_EAT.name(),
                            Set.of());
            boolean expectBadRequest = value < 0.0 || value > 100.0;
            if (expectBadRequest) {
                ResponseEntity<String> r =
                        executeProduct(verb, putId, body, String.class);
                assertThat(r.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
            } else {
                ResponseEntity<ProductResponse> r =
                        executeProduct(verb, putId, body, ProductResponse.class);
                assertThat(r.getStatusCode())
                        .isEqualTo(verb == CrudHttpVerb.POST ? HttpStatus.CREATED : HttpStatus.OK);
                if (verb == CrudHttpVerb.POST) {
                    trackProduct(r.getBody().getId());
                }
            }
        }

        @ParameterizedTest(name = "{0}")
        @MethodSource("org.example.api.product.ProductCreateCrudApi#postAndPut")
        void rejectsWhenBjuSumExceeds100(CrudHttpVerb verb) {
            Long putId = putProductId(verb);
            Map<String, Object> body =
                    productBody(
                            unique("бжу101-" + verb),
                            List.of(),
                            10,
                            40,
                            30,
                            31,
                            null,
                            ProductCategory.GRAINS.name(),
                            DegreeReadiness.REQUIRES_COOKING.name(),
                            Set.of());
            ResponseEntity<String> r =
                    executeProduct(verb, putId, body, String.class);
            if (verb == CrudHttpVerb.POST) {
                assertDefaultSpringError(r, 500, "/api/products");
            } else {
                assertDefaultSpringError(r, 500, "/api/products/" + putId);
            }
        }
    }

    @Nested
    @DisplayName("Состав (composition)")
    class Composition {

        @ParameterizedTest(name = "{0}")
        @MethodSource("org.example.api.product.ProductCreateCrudApi#postAndPut")
        void acceptsNullComposition(CrudHttpVerb verb) {
            Long putId = putProductId(verb);
            Map<String, Object> body =
                    productBody(
                            unique("compositionNull-" + verb),
                            List.of(),
                            verb == CrudHttpVerb.POST ? 15 : 10,
                            10,
                            10,
                            10,
                            null,
                            ProductCategory.MEAT.name(),
                            DegreeReadiness.READY_TO_EAT.name(),
                            Set.of());
            ResponseEntity<ProductResponse> r =
                    executeProduct(verb, putId, body, ProductResponse.class);
            assertThat(r.getStatusCode())
                    .isEqualTo(verb == CrudHttpVerb.POST ? HttpStatus.CREATED : HttpStatus.OK);
            assertThat(r.getBody().getComposition()).isNull();
            if (verb == CrudHttpVerb.POST) {
                trackProduct(r.getBody().getId());
            }
        }

        @ParameterizedTest(name = "{0}")
        @MethodSource("org.example.api.product.ProductCreateCrudApi#postAndPut")
        void acceptsNonEmptyComposition(CrudHttpVerb verb) {
            Long putId = putProductId(verb);
            String text =
                    verb == CrudHttpVerb.POST
                            ? "Вода, соль, перец — по вкусу."
                            : "Обновлённое описание состава.";
            Map<String, Object> body =
                    productBody(
                            unique("compositionText-" + verb),
                            List.of(),
                            verb == CrudHttpVerb.POST ? 18 : 10,
                            10,
                            10,
                            10,
                            text,
                            ProductCategory.CANNED.name(),
                            DegreeReadiness.REQUIRES_COOKING.name(),
                            Set.of());
            ResponseEntity<ProductResponse> r =
                    executeProduct(verb, putId, body, ProductResponse.class);
            assertThat(r.getStatusCode())
                    .isEqualTo(verb == CrudHttpVerb.POST ? HttpStatus.CREATED : HttpStatus.OK);
            assertThat(r.getBody().getComposition()).isEqualTo(text);
            if (verb == CrudHttpVerb.POST) {
                trackProduct(r.getBody().getId());
            }
        }
    }

    @Nested
    @DisplayName("Категория продукта")
    class Category {

        @ParameterizedTest(name = "{0} {1}")
        @MethodSource("org.example.api.product.ProductCreateCrudApi#categoryAndVerb")
        void acceptsEach(CrudHttpVerb verb, String category) {
            Long putId = putProductId(verb);
            Map<String, Object> body =
                    productBody(
                            unique("категории-" + verb + "-" + category),
                            List.of(),
                            30,
                            10,
                            10,
                            10,
                            null,
                            category,
                            DegreeReadiness.READY_TO_EAT.name(),
                            Set.of());
            ResponseEntity<ProductResponse> r =
                    executeProduct(verb, putId, body, ProductResponse.class);
            assertThat(r.getStatusCode())
                    .isEqualTo(verb == CrudHttpVerb.POST ? HttpStatus.CREATED : HttpStatus.OK);
            assertThat(r.getBody().getCategory().name()).isEqualTo(category);
            if (verb == CrudHttpVerb.POST) {
                trackProduct(r.getBody().getId());
            }
        }
    }

    @Nested
    @DisplayName("Степень готовности")
    class Readiness {

        @ParameterizedTest(name = "{0} {1}")
        @MethodSource("org.example.api.product.ProductCreateCrudApi#degreeAndVerb")
        void acceptsEach(CrudHttpVerb verb, DegreeReadiness readiness) {
            Long putId = putProductId(verb);
            Map<String, Object> body =
                    productBody(
                            unique("гот-" + verb + "-" + readiness.name()),
                            List.of(),
                            verb == CrudHttpVerb.POST ? 22 : 25,
                            10,
                            10,
                            10,
                            null,
                            ProductCategory.LIQUID.name(),
                            readiness.name(),
                            Set.of());
            ResponseEntity<ProductResponse> r =
                    executeProduct(verb, putId, body, ProductResponse.class);
            assertThat(r.getStatusCode())
                    .isEqualTo(verb == CrudHttpVerb.POST ? HttpStatus.CREATED : HttpStatus.OK);
            assertThat(r.getBody().getDegreeReadiness()).isEqualTo(readiness);
            if (verb == CrudHttpVerb.POST) {
                trackProduct(r.getBody().getId());
            }
        }
    }

    @Nested
    @DisplayName("Метки (flags)")
    class Flags {

        @ParameterizedTest(name = "{0} {1}")
        @MethodSource("org.example.api.product.ProductCreateCrudApi#flagAndVerb")
        void acceptsEachFlagAlone(CrudHttpVerb verb, String flag) {
            Long putId = putProductId(verb);
            Map<String, Object> body =
                    productBody(
                            unique("флаг-" + verb + "-" + flag),
                            List.of(),
                            10,
                            10,
                            10,
                            10,
                            null,
                            ProductCategory.SWEETS.name(),
                            DegreeReadiness.READY_TO_EAT.name(),
                            Set.of(flag));
            ResponseEntity<ProductResponse> r =
                    executeProduct(verb, putId, body, ProductResponse.class);
            assertThat(r.getStatusCode())
                    .isEqualTo(verb == CrudHttpVerb.POST ? HttpStatus.CREATED : HttpStatus.OK);
            assertThat(r.getBody().getFlags()).containsExactlyInAnyOrderElementsOf(
                    Set.of(Flag.valueOf(flag)));
            if (verb == CrudHttpVerb.POST) {
                trackProduct(r.getBody().getId());
            }
        }

        @ParameterizedTest(name = "{0}")
        @MethodSource("org.example.api.product.ProductCreateCrudApi#postAndPut")
        void acceptsAllFlagsTogether(CrudHttpVerb verb) {
            Long putId = putProductId(verb);
            Map<String, Object> body =
                    productBody(
                            unique("всеМетки-" + verb),
                            List.of(),
                            10,
                            10,
                            10,
                            10,
                            null,
                            ProductCategory.GREENS.name(),
                            DegreeReadiness.READY_TO_EAT.name(),
                            Set.of("VEGAN", "GLUTEN_FREE", "SUGAR_FREE"));
            ResponseEntity<ProductResponse> r =
                    executeProduct(verb, putId, body, ProductResponse.class);
            assertThat(r.getStatusCode())
                    .isEqualTo(verb == CrudHttpVerb.POST ? HttpStatus.CREATED : HttpStatus.OK);
            assertThat(r.getBody().getFlags()).containsExactlyInAnyOrder(
                    Flag.VEGAN, Flag.GLUTEN_FREE, Flag.SUGAR_FREE);
            if (verb == CrudHttpVerb.POST) {
                trackProduct(r.getBody().getId());
            }
        }
    }
}
