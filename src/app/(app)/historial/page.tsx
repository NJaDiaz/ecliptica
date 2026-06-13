"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Venta, FiltroFecha } from "@/types";
import { formatCurrency, formatDateTime, getDateRange, METODOS_PAGO } from "@/lib/utils";
import { History, Edit2, Trash2, Filter, TrendingUp, DollarSign } from "lucide-react";
import { toast } from "sonner";
import EditVentaModal from "@/components/ventas/edit-venta-modal";

const FILTROS: { key: FiltroFecha; label: string }[] = [
  { key: "hoy", label: "Hoy" },
  { key: "semana", label: "Semana" },
  { key: "mes", label: "Mes" },
  { key: "año", label: "Año" },
];

export default function HistorialPage() {
  const supabase = createClient();
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<FiltroFecha>("mes");
  const [editVenta, setEditVenta] = useState<Venta | null>(null);

  const load = useCallback(async () => {
    const { desde, hasta } = getDateRange(filtro);
    const { data } = await supabase
      .from("ventas")
      .select("*, producto:producto_id(id, nombre, imagen_url)")
      .gte("fecha", desde.toISOString())
      .lte("fecha", hasta.toISOString())
      .order("fecha", { ascending: false });
    setVentas((data as unknown as Venta[]) || []);
    setLoading(false);
  }, [filtro, supabase]);

  useEffect(() => { load(); }, [load]);

  async function handleDelete(id: string) {
    const venta = ventas.find(v => v.id === id);
    if (!venta || !confirm("¿Eliminar esta venta?")) return;
    // Restore stock
    const { data: prod } = await supabase.from("productos").select("stock_actual").eq("id", venta.producto_id).single();
    if (prod) await supabase.from("productos").update({ stock_actual: prod.stock_actual + venta.cantidad }).eq("id", venta.producto_id);
    await supabase.from("ventas").delete().eq("id", id);
    toast.success("Venta eliminada y stock restaurado");
    load();
  }

  const totals = ventas.reduce(
    (acc, v) => ({ total: acc.total + Number(v.total), ganancia: acc.ganancia + Number(v.ganancia) }),
    { total: 0, ganancia: 0 }
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Historial de ventas</h1>
          <p className="text-muted-foreground text-sm">{ventas.length} ventas</p>
        </div>
        <Filter size={18} className="text-muted-foreground" />
      </div>

      {/* Filtros */}
      <div className="flex gap-2">
        {FILTROS.map(f => (
          <button key={f.key} onClick={() => setFiltro(f.key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${filtro === f.key ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-muted"}`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign size={15} className="text-primary" />
            <span className="text-xs text-muted-foreground">Total cobrado</span>
          </div>
          <div className="text-xl font-bold text-foreground">{formatCurrency(totals.total)}</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={15} className="text-green-500" />
            <span className="text-xs text-muted-foreground">Ganancia neta</span>
          </div>
          <div className="text-xl font-bold text-green-600 dark:text-green-400">{formatCurrency(totals.ganancia)}</div>
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
        </div>
      ) : ventas.length === 0 ? (
        <div className="text-center py-16">
          <History size={40} className="mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Sin ventas en este período</p>
        </div>
      ) : (
        <div className="space-y-2">
          {ventas.map(v => (
            <div key={v.id} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-muted overflow-hidden flex-shrink-0 flex items-center justify-center">
                {v.producto?.imagen_url ? (
                  <img src={v.producto.imagen_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-muted-foreground/40 text-xs">📦</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground text-sm truncate">{v.producto?.nombre || "Producto"}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-muted-foreground">{formatDateTime(v.fecha)}</span>
                  <span className="text-[10px] bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded-md">{METODOS_PAGO[v.metodo_pago]}</span>
                  <span className="text-[10px] text-muted-foreground">x{v.cantidad}</span>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="font-bold text-foreground text-sm">{formatCurrency(Number(v.total))}</p>
                <p className="text-[10px] text-green-600 dark:text-green-400">+{formatCurrency(Number(v.ganancia))}</p>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button onClick={() => setEditVenta(v)} className="p-1.5 rounded-lg hover:bg-secondary transition-all">
                  <Edit2 size={13} className="text-muted-foreground" />
                </button>
                <button onClick={() => handleDelete(v.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 transition-all">
                  <Trash2 size={13} className="text-muted-foreground hover:text-destructive" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editVenta && (
        <EditVentaModal
          venta={editVenta}
          onClose={() => setEditVenta(null)}
          onSave={() => { setEditVenta(null); load(); }}
        />
      )}
    </div>
  );
}
