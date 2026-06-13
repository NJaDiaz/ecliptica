"use client";

import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Producto } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { Search, X, Image, ShoppingCart } from "lucide-react";
import VentaRapidaModal from "@/components/ventas/venta-rapida-modal";
import ProductoModal from "@/components/productos/producto-modal";

export default function BuscarPage() {
  const supabase = createClient();
  const [query, setQuery] = useState("");
  const [resultados, setResultados] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(false);
  const [ventaProducto, setVentaProducto] = useState<Producto | null>(null);
  const [editProducto, setEditProducto] = useState<Producto | null>(null);

  const buscar = useCallback(async (q: string) => {
    if (!q.trim()) { setResultados([]); return; }
    setLoading(true);
    const { data } = await supabase.from("productos").select("*")
      .or(`nombre.ilike.%${q}%,categoria.ilike.%${q}%,marca.ilike.%${q}%,codigo_barras.ilike.%${q}%`)
      .order("nombre").limit(30);
    setResultados(data || []);
    setLoading(false);
  }, [supabase]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setQuery(val);
    buscar(val);
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Búsqueda rápida</h1>
        <p className="text-muted-foreground text-sm">Buscá por nombre, categoría, marca o código</p>
      </div>

      <div className="relative">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={handleChange}
          autoFocus
          placeholder="Escribí para buscar..."
          className="w-full pl-11 pr-10 py-3.5 rounded-xl border border-input bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary text-base"
        />
        {query && (
          <button onClick={() => { setQuery(""); setResultados([]); }} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X size={16} />
          </button>
        )}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
        </div>
      )}

      {!loading && query && resultados.length === 0 && (
        <div className="text-center py-12">
          <Search size={36} className="mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Sin resultados para "{query}"</p>
        </div>
      )}

      {resultados.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">{resultados.length} resultado{resultados.length > 1 ? "s" : ""}</p>
          {resultados.map(p => (
            <div key={p.id} className="bg-card border border-border rounded-xl p-3 flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-muted overflow-hidden flex-shrink-0 flex items-center justify-center">
                {p.imagen_url ? (
                  <img src={p.imagen_url} alt={p.nombre} className="w-full h-full object-cover" />
                ) : (
                  <Image size={18} className="text-muted-foreground/40" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground text-sm truncate">{p.nombre}</p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  {p.categoria && <span className="text-[10px] bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded">{p.categoria}</span>}
                  {p.marca && <span className="text-[10px] text-muted-foreground">{p.marca}</span>}
                  {p.talle && <span className="text-[10px] text-muted-foreground">T: {p.talle}</span>}
                  <span className={`text-[10px] font-medium ${p.stock_actual === 0 ? "text-red-500" : p.stock_actual <= p.stock_minimo ? "text-amber-500" : "text-green-600 dark:text-green-400"}`}>
                    Stock: {p.stock_actual}
                  </span>
                </div>
              </div>
              <div className="flex-shrink-0 flex items-center gap-2">
                <span className="font-bold text-primary text-sm">{formatCurrency(p.precio_venta)}</span>
                <button
                  onClick={() => setVentaProducto(p)}
                  disabled={p.stock_actual === 0}
                  className="p-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  <ShoppingCart size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {ventaProducto && (
        <VentaRapidaModal
          producto={ventaProducto}
          onClose={() => setVentaProducto(null)}
          onSave={() => { setVentaProducto(null); buscar(query); }}
        />
      )}
      {editProducto && (
        <ProductoModal
          producto={editProducto}
          onClose={() => setEditProducto(null)}
          onSave={() => { setEditProducto(null); buscar(query); }}
        />
      )}
    </div>
  );
}
