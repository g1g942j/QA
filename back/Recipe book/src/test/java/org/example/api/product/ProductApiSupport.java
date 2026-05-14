package org.example.api.product;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Stream;

import org.example.DTOs.product.ProductPhotoUploadResponse;
import org.example.DTOs.product.ProductResponse;
import org.example.api.AbstractRecipeBookApi;
import org.example.api.ApiTestPayloads;
import org.example.entity.enums.DegreeReadiness;
import org.example.entity.enums.ProductCategory;
import org.junit.jupiter.params.provider.Arguments;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;

import static org.assertj.core.api.Assertions.assertThat;

public abstract class ProductApiSupport extends AbstractRecipeBookApi {

    private static final double[] PRODUCT_BJU_OUT_OF_RANGE = {-0.1, 100.1};
    private static final double[] PRODUCT_BJU_IN_RANGE = {0.0, 0.1, 99.9, 100.0};

    /** Источники аргументов для {@code @MethodSource} в тестах create/update. */
    public static Stream<Arguments> productMacroOutOfRange() {
        return Stream.of(MacroField.PROTEINS, MacroField.FATS, MacroField.CARBS)
                .flatMap(
                        field ->
                                Arrays.stream(PRODUCT_BJU_OUT_OF_RANGE)
                                        .mapToObj(v -> Arguments.of(field, v)));
    }

    public static Stream<Arguments> productMacroInRange() {
        return Stream.of(MacroField.PROTEINS, MacroField.FATS, MacroField.CARBS)
                .flatMap(
                        field ->
                                Arrays.stream(PRODUCT_BJU_IN_RANGE)
                                        .mapToObj(v -> Arguments.of(field, v)));
    }

    public static Stream<Arguments> productCategorySamples() {
        return Stream.of(
                        ProductCategory.MEAT.name(),
                        ProductCategory.SWEETS.name(),
                        ProductCategory.LIQUID.name())
                .map(Arguments::of);
    }

    public static Stream<Arguments> productDegreeSamples() {
        return Stream.of(DegreeReadiness.READY_TO_EAT, DegreeReadiness.REQUIRES_COOKING)
                .map(Arguments::of);
    }

    public static Stream<Arguments> productFlagSamples() {
        return Stream.of("VEGAN", "GLUTEN_FREE").map(Arguments::of);
    }

    protected String unique(String prefix) {
        return prefix + "-" + UUID.randomUUID().toString().substring(0, 8);
    }

    protected Map<String, Object> productBody(
            String name,
            List<String> photos,
            double calories,
            double proteins,
            double fats,
            double carbs,
            String composition,
            String category,
            String degreeReadiness,
            Set<String> flags) {
        return ApiTestPayloads.product(
                name, photos, calories, proteins, fats, carbs, composition, category, degreeReadiness, flags);
    }

    protected Map<String, Object> productBodyWithoutName(
            List<String> photos,
            double calories,
            double proteins,
            double fats,
            double carbs,
            String composition,
            String category,
            String degreeReadiness,
            Set<String> flags) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("photos", photos == null ? List.of() : photos);
        m.put("calories", calories);
        m.put("proteins", proteins);
        m.put("fats", fats);
        m.put("carbs", carbs);
        m.put("composition", composition);
        m.put("category", category);
        m.put("degreeReadiness", degreeReadiness);
        m.put("flags", flags == null ? Set.of() : flags);
        return m;
    }

    protected Map<String, Object> productBodyWithoutCompositionKey(
            String name,
            List<String> photos,
            double calories,
            double proteins,
            double fats,
            double carbs,
            String category,
            String degreeReadiness,
            Set<String> flags) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("name", name);
        m.put("photos", photos == null ? List.of() : photos);
        m.put("calories", calories);
        m.put("proteins", proteins);
        m.put("fats", fats);
        m.put("carbs", carbs);
        m.put("category", category);
        m.put("degreeReadiness", degreeReadiness);
        m.put("flags", flags == null ? Set.of() : flags);
        return m;
    }

    protected Map<String, Object> productBodyWithMacro(
            MacroField field,
            double value,
            String name,
            List<String> photos,
            String composition,
            String category,
            String degreeReadiness,
            Set<String> flags) {
        double cal = 0.0;
        double p = 0.0;
        double fat = 0.0;
        double carb = 0.0;
        switch (field) {
            case CALORIES -> {
                cal = value;
                p = 15.0;
                fat = 15.0;
                carb = 15.0;
            }
            case PROTEINS -> {
                cal = 40.0;
                p = value;
                fat = 0.0;
                carb = 0.0;
            }
            case FATS -> {
                cal = 40.0;
                p = 0.0;
                fat = value;
                carb = 0.0;
            }
            case CARBS -> {
                cal = 40.0;
                p = 0.0;
                fat = 0.0;
                carb = value;
            }
        }
        return productBody(name, photos, cal, p, fat, carb, composition, category, degreeReadiness, flags);
    }

    protected List<String> uploadPendingProductPhotoKeys(int count) {
        List<String> keys = new ArrayList<>();
        HttpHeaders outer = new HttpHeaders();
        outer.setContentType(MediaType.MULTIPART_FORM_DATA);
        byte[] png = new byte[] {(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A};
        for (int i = 0; i < count; i++) {
            final int idx = i;
            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            ByteArrayResource pngResource =
                    new ByteArrayResource(png) {
                        @Override
                        public String getFilename() {
                            return "p-one-" + idx + ".png";
                        }
                    };
            HttpHeaders partHeaders = new HttpHeaders();
            partHeaders.setContentType(MediaType.IMAGE_PNG);
            body.add("file", new HttpEntity<>(pngResource, partHeaders));
            HttpEntity<MultiValueMap<String, Object>> req = new HttpEntity<>(body, outer);
            ResponseEntity<ProductPhotoUploadResponse> r =
                    rest.postForEntity("/api/product-photos", req, ProductPhotoUploadResponse.class);
            assertThat(r.getStatusCode()).isEqualTo(HttpStatus.OK);
            assertThat(r.getBody()).isNotNull();
            assertThat(r.getBody().getStorageKey()).isNotBlank();
            keys.add(r.getBody().getStorageKey());
        }
        return keys;
    }

    protected Long createBaseProduct() {
        Map<String, Object> body =
                productBody(
                        unique("базаПр"),
                        List.of(),
                        20,
                        10,
                        10,
                        10,
                        "старый",
                        ProductCategory.MEAT.name(),
                        DegreeReadiness.READY_TO_EAT.name(),
                        Set.of());
        Long id =
                rest.postForEntity("/api/products", json(body), ProductResponse.class).getBody().getId();
        trackProduct(id);
        return id;
    }

    protected <T> ResponseEntity<T> postProduct(Map<String, Object> body, Class<T> responseType) {
        return rest.postForEntity("/api/products", json(body), responseType);
    }

    protected <T> ResponseEntity<T> putProduct(long id, Map<String, Object> body, Class<T> responseType) {
        return rest.exchange("/api/products/" + id, HttpMethod.PUT, json(body), responseType);
    }

    protected Long createStandaloneProductInDishBlocked(String nameSuffix) {
        var body =
                productBody(
                        unique(nameSuffix),
                        List.of(),
                        30,
                        10,
                        10,
                        10,
                        null,
                        ProductCategory.MEAT.name(),
                        DegreeReadiness.READY_TO_EAT.name(),
                        Set.of());
        Long id =
                rest.postForEntity("/api/products", json(body), ProductResponse.class).getBody().getId();
        trackProduct(id);
        return id;
    }

    public enum MacroField {
        CALORIES,
        PROTEINS,
        FATS,
        CARBS
    }
}
