package org.example.api;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

public final class ApiTestPayloads {

    private ApiTestPayloads() {}

    public static Map<String, Object> product(
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
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("name", name);
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

    public static Map<String, Object> dish(
            String name,
            List<String> photos,
            Double calories,
            Double proteins,
            Double fats,
            Double carbs,
            List<Map<String, Object>> composition,
            double portionSize,
            String category,
            Set<String> flags) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("name", name);
        m.put("photos", photos == null ? List.of() : photos);
        if (calories != null) {
            m.put("calories", calories);
        }
        if (proteins != null) {
            m.put("proteins", proteins);
        }
        if (fats != null) {
            m.put("fats", fats);
        }
        if (carbs != null) {
            m.put("carbs", carbs);
        }
        m.put("composition", composition);
        m.put("portionSize", portionSize);
        m.put("category", category);
        m.put("flags", flags == null ? Set.of() : flags);
        return m;
    }

    public static Map<String, Object> compositionLine(long productId, double amountGrams) {
        Map<String, Object> line = new LinkedHashMap<>();
        line.put("productId", productId);
        line.put("amount", amountGrams);
        return line;
    }
}