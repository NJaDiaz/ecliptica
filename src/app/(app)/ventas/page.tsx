"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Producto } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { ShoppingCart, Search, X, Image } from "lucide-react";
import VentaRapidaModal from "@/components/ventas/venta-rapida-modal";

export default function VentasPage() {
  const supabase = createClient();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Producto | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.from("productos").select("*").gt("stock_actual", 0).order("nombre");
    setProductos(data || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  const filtered = productos.filter(p =>
    p.nombre.toLowerCase().includes(search.toLowerCase()) ||
    p.categoria?.toLowerCase().includes(search.toLowerCase()) ||
    p.marca?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Registrar venta</h1>
        <p className="text-muted-foreground text-sm">Seleccioná un producto para vender</p>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar producto..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-input bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm" />
        {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"><X size={15} /></button>}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(p => (
            <button key={p.id} onClick={() => setSelected(p)}
              className="w-full bg-card border border-border rounded-xl p-3 flex items-center gap-3 hover:border-primary hover:shadow-sm transition-all text-left group">
              <div className="w-14 h-14 rounded-xl bg-muted overflow-hidden flex-shrink-0 flex items-center justify-center">
                {p.imagen_url ? (
                  <img src={p.imagen_url} alt={p.nombre} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                ) : (
                  <Image size={20} className="text-muted-foreground/40" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground text-sm truncate">{p.nombre}</p>
                {(p.categoria || p.talle || p.color) && (
                  <p className="text-xs text-muted-foreground">{[p.categoria, p.talle, p.color].filter(Boolean).join(" · ")}</p>
                )}
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.stock_actual <= p.stock_minimo ? "bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400" : "bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400"}`}>
                    {p.stock_actual} en stock
                  </span>
                </div>
              </div>
              <div className="flex-shrink-0 text-right">
                <p className="font-bold text-primary text-lg">{formatCurrency(p.precio_venta)}</p>
                <div className="flex items-center gap-1 justify-end mt-1">
                  <ShoppingCart size={13} className="text-muted-foreground group-hover:text-primary transition-colors" />
                  <span className="text-xs text-muted-foreground group-hover:text-primary transition-colors">Vender</span>
                </div>
              </div>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-16">
              <ShoppingCart size={40} className="mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No hay productos con stock disponible</p>
            </div>
          )}
        </div>
      )}

      {selected && (
        <VentaRapidaModal
          producto={selected}
          onClose={() => setSelected(null)}
          onSave={() => { setSelected(null); load(); }}
        />
      )}
    </div>
  );
}
