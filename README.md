# notebook-api
# apis-api
# apis-api
# shopo-ecom-api

## Category Filtering

### 3-Level Category Tree

`GET /product/category/filter-tree`

- Returns the full category → subcategory → child category hierarchy.
- Each node contains `id`, `name`, `level`, and `children` so the client can build multi-select UIs.

### Multi-select Product Query

`GET /product/get-all-product`

New optional query params (all accept comma-separated strings, JSON arrays, or repeated params):

- `categoryIds` – filter by one or more main category IDs.
- `subCategoryIds` – filter by one or more subcategory IDs.
- `childCategoryIds` – filter by one or more child category IDs.

Example:

```
/product/get-all-product?categoryIds=1,2&subCategoryIds=5&childCategoryIds[]=9&childCategoryIds[]=12
```

The endpoint continues to accept the legacy single-value `category`, `subCategory`, and `childCategory` params for backward compatibility.