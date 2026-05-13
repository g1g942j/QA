package org.example.api.product;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.Map;
import java.util.Set;

import org.example.DTOs.product.ProductResponse;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import org.example.entity.enums.DegreeReadiness;
import org.example.entity.enums.ProductCategory;

@DisplayName("Продукт: получение списка и по id (GET)")
class ProductRetriveCrudApi extends ProductApiSupport {

    @Test
    void getAllProducts() {
        ResponseEntity<List<ProductResponse>> r =
                rest.exchange("/api/products", HttpMethod.GET, null, new ParameterizedTypeReference<>() {});
        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(r.getBody()).isNotNull();
    }

    @Test
    void getUnknownProductById() {
        ResponseEntity<String> r = rest.getForEntity("/api/products/999999999", String.class);
        assertDefaultSpringError(r, 500, "/api/products/999999999");
    }

    @Test
    void getByIdMatchesCreatedProduct() {
        String name = unique("чтениеId");
        String composition = "Крупа, масло.";
        Map<String, Object> create =
                productBody(
                        name,
                        List.of(),
                        100.5,
                        12,
                        13,
                        14,
                        composition,
                        ProductCategory.GRAINS.name(),
                        DegreeReadiness.SEMI_FINISHED.name(),
                        Set.of("GLUTEN_FREE"));
        ProductResponse created =
                rest.postForEntity("/api/products", json(create), ProductResponse.class).getBody();
        trackProduct(created.getId());

        ResponseEntity<ProductResponse> r =
                rest.getForEntity("/api/products/" + created.getId(), ProductResponse.class);
        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(r.getBody().getId()).isEqualTo(created.getId());
    }
}
