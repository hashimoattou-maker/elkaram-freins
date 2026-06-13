import React, { useState, useEffect } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { products as productsApi } from "@/lib/api";
import type { Product } from "@/types";

interface ProductSearchSelectProps {
  onSelect: (product: Product) => void;
  value?: Product | null;
}

export default function ProductSearchSelect({ onSelect, value }: ProductSearchSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (search.length < 1) {
      setResults([]);
      return;
    }
    setLoading(true);
    productsApi
      .getProducts({ search, limit: 10 })
      .then((r) => setResults(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [search]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
          {value ? (
            <span>
              {value.reference} - {value.name}
            </span>
          ) : (
            <span className="text-muted-foreground">Rechercher un produit...</span>
          )}
          <Search className="h-4 w-4 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-2" align="start">
        <Input
          placeholder="Nom, référence ou code-barres..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-2"
          autoFocus
        />
        <div className="max-h-60 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : results.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Aucun produit trouvé
            </p>
          ) : (
            results.map((product) => (
              <button
                key={product.id}
                className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm hover:bg-muted transition-colors"
                onClick={() => {
                  onSelect(product);
                  setOpen(false);
                  setSearch("");
                }}
              >
                <div className="text-left">
                  <p className="font-medium">{product.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {product.reference} - Stock: {product.stock} {product.unit}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">
                  {product.barcode || ""}
                </span>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
