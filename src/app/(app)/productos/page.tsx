"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Producto } from "@/types";
import { formatCurrency } from "@/lib/utils";
import {
  Plus, Search, Edit2, Trash2, ShoppingCart, Package,
  AlertTriangle, Filter, X, Image
} from "lucide-react";
import ProductoModal from "@/components/productos/producto-modal";
import VentaRapidaModal from "@/components/ventas/venta-rapida-modal";
import { toast } from "sonner";

export default function ProductosPage() {
  const supabase = createClient();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filtro, setFiltro] = useState<"todos" | "stock_bajo" | "sin_stock">("todos");
  const [selectedProducto, setSelectedProducto] = useState<Producto | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showVentaModal, setShowVentaModal] = useState(false);
  const [ventaProducto, setVentaProducto] = useState<Producto | null>(null);

  const loadProductos = useCallback(async () => {
    const { data } = await supabase.from("productos").select("*").order("nombre");
    setProductos(data || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { loadProductos(); }, [loadProductos]);

  const filtered = productos.filter(p => {
    const matchSearch = p.nombre.toLowerCase().includes(search.toLowerCase()) ||
      p.categoria?.toLowerCase().includes(search.toLowerCase()) ||
      p.marca?.toLowerCase().includes(search.toLowerCase()) ||
      p.codigo_barras?.includes(search);
    const matchFiltro =
      filtro === "todos" ? true :
      filtro === "stock_bajo" ? p.stock_actual <= p.stock_minimo && p.stock_actual > 0 :
      p.stock_actual === 0;
    return matchSearch && matchFiltro;
  });

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar este producto?")) return;
    const { error } = await supabase.from("productos").delete().eq("id", id);
    if (error) {
      toast.error("No se puede eliminar, tiene ventas o ingresos asociados");
    } else {
      toast.success("Producto eliminado");
      loadProductos();
    }
  }

  function handleEdit(p: Producto) {
    setSelectedProducto(p);
    setShowModal(true);
  }

  function handleNew() {
    setSelectedProducto(null);
    setShowModal(true);
  }

  function handleVenta(p: Producto) {
    setVentaProducto(p);
    setShowVentaModal(true);
  }

  const stockBajoCount = productos.filter(p => p.stock_actual <= p.stock_minimo && p.stock_actual > 0).length;
  const sinStockCount = productos.filter(p => p.stock_actual === 0).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Productos</h1>
          <p className="text-muted-foreground text-sm">{productos.length} productos en total</p>
        </div>
        <button onClick={handleNew} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90 transition-all">
          <Plus size={16} /> Nuevo
        </button>
      </div>

      {/* Alertas filtros rápidos */}
      {(stockBajoCount > 0 || sinStockCount > 0) && (
        <div className="flex gap-2 flex-wrap">
          {stockBajoCount > 0 && (
            <button onClick={() => setFiltro(filtro === "stock_bajo" ? "todos" : "stock_bajo")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filtro === "stock_bajo" ? "bg-amber-500 text-white" : "bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800"}`}>
              <AlertTriangle size={13} /> {stockBajoCount} stock bajo
            </button>
          )}
          {sinStockCount > 0 && (
            <button onClick={() => setFiltro(filtro === "sin_stock" ? "todos" : "sin_stock")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filtro === "sin_stock" ? "bg-red-500 text-white" : "bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800"}`}>
              <X size={13} /> {sinStockCount} sin stock
            </button>
          )}
          {filtro !== "todos" && (
            <button onClick={() => setFiltro("todos")} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground bg-secondary">
              <Filter size={13} /> Mostrar todos
            </button>
          )}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nombre, categoría, marca..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-input bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
        />
        {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X size={15} /></button>}
      </div>

      {/* Products grid */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Package size={40} className="mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No hay productos</p>
          <button onClick={handleNew} className="mt-3 text-primary text-sm underline">Crear el primero</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map(p => (
            <div key={p.id} className="bg-card border border-border rounded-xl overflow-hidden hover:shadow-md transition-all group">
              {/* Image */}
              <div className="h-36 bg-muted flex items-center justify-center relative overflow-hidden">
                {p.imagen_url ? (
                  <img src={p.imagen_url} alt={p.nombre} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : (
                  <div className="flex flex-col items-center gap-1">
                    <Image size={28} className="text-muted-foreground/40" />
                    <span className="text-[10px] text-muted-foreground/40">Sin imagen</span>
                  </div>
                )}
                {/* Stock badge */}
                <div className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  p.stock_actual === 0 ? "bg-red-500 text-white" :
                  p.stock_actual <= p.stock_minimo ? "bg-amber-500 text-white" :
                  "bg-green-500 text-white"
                }`}>
                  {p.stock_actual === 0 ? "Sin stock" : `${p.stock_actual} u.`}
                </div>
              </div>

              {/* Info */}
              <div className="p-3">
                <div className="mb-1">
                  <h3 className="font-semibold text-foreground text-sm leading-tight line-clamp-2">{p.nombre}</h3>
                  {(p.categoria || p.marca) && (
                    <p className="text-xs text-muted-foreground mt-0.5">{[p.marca, p.categoria].filter(Boolean).join(" · ")}</p>
                  )}
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div>
                    <div className="text-base font-bold text-primary">{formatCurrency(p.precio_venta)}</div>
                    <div className="text-[10px] text-muted-foreground">Costo: {formatCurrency(p.costo_compra)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-medium text-green-600 dark:text-green-400">
                      +{formatCurrency(p.precio_venta - p.costo_compra)}
                    </div>
                    <div className="text-[10px] text-muted-foreground">ganancia</div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-1.5 mt-3">
                  <button
                    onClick={() => handleVenta(p)}
                    disabled={p.stock_actual === 0}
                    className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ShoppingCart size={13} /> Venta
                  </button>
                  <button onClick={() => handleEdit(p)} className="p-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-muted transition-all">
                    <Edit2 size={14} />
                  </button>
                  <button onClick={() => handleDelete(p.id)} className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <ProductoModal
          producto={selectedProducto}
          onClose={() => setShowModal(false)}
          onSave={() => { setShowModal(false); loadProductos(); }}
        />
      )}

      {showVentaModal && ventaProducto && (
        <VentaRapidaModal
          producto={ventaProducto}
          onClose={() => setShowVentaModal(false)}
          onSave={() => { setShowVentaModal(false); loadProductos(); }}
        />
      )}
    </div>
  );
}
