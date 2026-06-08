import { useState } from "react";
import { useLocation, useSearch } from "wouter";
import { useListStoreProducts, useListStoreCategories, useListStoreBrands, useGetStoreSettings } from "@workspace/api-client-react";
import { ProductCard } from "@/components/ProductCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Filter, X } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export default function Products() {
  const [_location, setLocation] = useLocation();
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  
  const search = params.get("search") || "";
  const categoryId = params.get("categoryId") ? Number(params.get("categoryId")) : undefined;
  const brandId = params.get("brandId") ? Number(params.get("brandId")) : undefined;
  const sort = params.get("sort") || "";
  const page = params.get("page") ? Number(params.get("page")) : 1;
  const minPrice = params.get("minPrice") || "";
  const maxPrice = params.get("maxPrice") || "";

  const [localSearch, setLocalSearch] = useState(search);
  const [localMinPrice, setLocalMinPrice] = useState(minPrice);
  const [localMaxPrice, setLocalMaxPrice] = useState(maxPrice);

  const { data: settings } = useGetStoreSettings();
  const { data: categories } = useListStoreCategories();
  const { data: brands } = useListStoreBrands();
  
  const { data: productsPage, isLoading } = useListStoreProducts({
    search: search || undefined,
    categoryId,
    brandId,
    minPrice: minPrice ? Number(minPrice) : undefined,
    maxPrice: maxPrice ? Number(maxPrice) : undefined,
    page,
    limit: 24,
  });

  // Basic client-side sorting for now since backend sort param might vary, 
  // but if backend supports it, we'd pass it.
  const products = [...(productsPage?.data || [])];
  if (sort === "price_asc") products.sort((a, b) => a.salePrice - b.salePrice);
  if (sort === "price_desc") products.sort((a, b) => b.salePrice - a.salePrice);
  if (sort === "new") products.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const currency = settings?.currency || "Rs.";

  const updateParams = (updates: Record<string, string | number | null>) => {
    const newParams = new URLSearchParams(searchString);
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === undefined || value === "") {
        newParams.delete(key);
      } else {
        newParams.set(key, value.toString());
      }
    });
    // Reset page to 1 when filters change
    if (!updates.page) {
      newParams.set("page", "1");
    }
    setLocation(`/products?${newParams.toString()}`);
  };

  const clearFilters = () => {
    setLocation("/products");
    setLocalSearch("");
    setLocalMinPrice("");
    setLocalMaxPrice("");
  };

  const applyPriceFilter = () => {
    updateParams({ minPrice: localMinPrice || null, maxPrice: localMaxPrice || null });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateParams({ search: localSearch });
  };

  const FilterContent = () => (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold mb-3">Categories</h3>
        <div className="space-y-1">
          {categories?.map((cat) => (
            <Button
              key={cat.id}
              variant={categoryId === cat.id ? "default" : "ghost"}
              size="sm"
              className="w-full justify-start font-normal"
              onClick={() => updateParams({ categoryId: categoryId === cat.id ? null : cat.id })}
            >
              {cat.name}
            </Button>
          ))}
        </div>
      </div>

      <Separator />

      <div>
        <h3 className="font-semibold mb-3">Brands</h3>
        <div className="space-y-1">
          {brands?.map((brand) => (
            <Button
              key={brand.id}
              variant={brandId === brand.id ? "default" : "ghost"}
              size="sm"
              className="w-full justify-start font-normal"
              onClick={() => updateParams({ brandId: brandId === brand.id ? null : brand.id })}
            >
              {brand.name}
            </Button>
          ))}
        </div>
      </div>

      <Separator />

      <div>
        <h3 className="font-semibold mb-3">Price Range ({currency})</h3>
        <div className="space-y-3">
          <div className="flex gap-2 items-center">
            <Input
              type="number"
              placeholder="Min"
              value={localMinPrice}
              onChange={(e) => setLocalMinPrice(e.target.value)}
              className="h-8 text-sm"
              min={0}
            />
            <span className="text-muted-foreground text-sm shrink-0">to</span>
            <Input
              type="number"
              placeholder="Max"
              value={localMaxPrice}
              onChange={(e) => setLocalMaxPrice(e.target.value)}
              className="h-8 text-sm"
              min={0}
            />
          </div>
          <Button size="sm" variant="outline" className="w-full" onClick={applyPriceFilter}>
            Apply Price Filter
          </Button>
        </div>
      </div>
    </div>
  );

  const activeFilterCount = (categoryId ? 1 : 0) + (brandId ? 1 : 0) + (search ? 1 : 0) + (minPrice || maxPrice ? 1 : 0);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row gap-8">
        
        {/* Sidebar Filters (Desktop) */}
        <aside className="hidden md:block w-64 shrink-0">
          <div className="sticky top-24 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-lg">Filters</h2>
              {activeFilterCount > 0 && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
                  Clear all
                </Button>
              )}
            </div>
            <FilterContent />
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center mb-8">
            <h1 className="text-2xl font-bold">
              {search ? `Search results for "${search}"` : "All Products"}
              {productsPage?.total ? <span className="text-muted-foreground text-base font-normal ml-2">({productsPage.total})</span> : null}
            </h1>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <form onSubmit={handleSearch} className="relative flex-1 sm:w-64">
                <Input
                  placeholder="Search..."
                  value={localSearch}
                  onChange={(e) => setLocalSearch(e.target.value)}
                  className="pl-9"
                />
                <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
              </form>

              <Select value={sort} onValueChange={(val) => updateParams({ sort: val })}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">Newest First</SelectItem>
                  <SelectItem value="price_asc">Price: Low to High</SelectItem>
                  <SelectItem value="price_desc">Price: High to Low</SelectItem>
                </SelectContent>
              </Select>

              {/* Mobile Filter Button */}
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" className="md:hidden shrink-0 relative">
                    <Filter className="h-4 w-4" />
                    {activeFilterCount > 0 && (
                      <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] font-bold text-primary-foreground flex items-center justify-center">
                        {activeFilterCount}
                      </span>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[300px]">
                  <SheetHeader className="mb-6">
                    <SheetTitle className="flex justify-between items-center">
                      Filters
                      {activeFilterCount > 0 && (
                        <Button variant="ghost" size="sm" onClick={clearFilters}>
                          Clear all
                        </Button>
                      )}
                    </SheetTitle>
                  </SheetHeader>
                  <ScrollArea className="h-[calc(100vh-100px)]">
                    <FilterContent />
                  </ScrollArea>
                </SheetContent>
              </Sheet>
            </div>
          </div>

          {activeFilterCount > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {search && (
                <Badge variant="secondary" className="px-3 py-1">
                  Search: {search}
                  <button onClick={() => updateParams({ search: null })} className="ml-2 hover:text-foreground"><X className="h-3 w-3" /></button>
                </Badge>
              )}
              {categoryId && categories?.find(c => c.id === categoryId) && (
                <Badge variant="secondary" className="px-3 py-1">
                  Category: {categories.find(c => c.id === categoryId)?.name}
                  <button onClick={() => updateParams({ categoryId: null })} className="ml-2 hover:text-foreground"><X className="h-3 w-3" /></button>
                </Badge>
              )}
              {brandId && brands?.find(b => b.id === brandId) && (
                <Badge variant="secondary" className="px-3 py-1">
                  Brand: {brands.find(b => b.id === brandId)?.name}
                  <button onClick={() => updateParams({ brandId: null })} className="ml-2 hover:text-foreground"><X className="h-3 w-3" /></button>
                </Badge>
              )}
              {(minPrice || maxPrice) && (
                <Badge variant="secondary" className="px-3 py-1">
                  Price: {minPrice ? `${currency} ${Number(minPrice).toLocaleString()}` : "0"} – {maxPrice ? `${currency} ${Number(maxPrice).toLocaleString()}` : "any"}
                  <button onClick={() => { updateParams({ minPrice: null, maxPrice: null }); setLocalMinPrice(""); setLocalMaxPrice(""); }} className="ml-2 hover:text-foreground"><X className="h-3 w-3" /></button>
                </Badge>
              )}
            </div>
          )}

          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="space-y-4">
                  <Skeleton className="h-[250px] w-full rounded-xl" />
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-20 bg-muted/30 rounded-2xl border">
              <h3 className="text-xl font-bold mb-2">No products found</h3>
              <p className="text-muted-foreground mb-6">Try adjusting your filters or search query.</p>
              <Button onClick={clearFilters}>Clear Filters</Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} currency={currency} />
                ))}
              </div>

              {productsPage && productsPage.totalPages > 1 && (
                <div className="flex justify-center mt-12 gap-2">
                  <Button
                    variant="outline"
                    disabled={page <= 1}
                    onClick={() => updateParams({ page: page - 1 })}
                  >
                    Previous
                  </Button>
                  <span className="flex items-center px-4 font-medium">
                    Page {page} of {productsPage.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    disabled={page >= productsPage.totalPages}
                    onClick={() => updateParams({ page: page + 1 })}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
