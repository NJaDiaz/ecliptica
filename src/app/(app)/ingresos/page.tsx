"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Producto } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { PackagePlus, Plus, Trash2, Search, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

type LineaIngreso = { producto_id: string; producto?: Producto; cantidad: number; costo_unitario: number };

type IngresoRecord = {
  id: string; fecha: string; proveedor: string;
  costo_envio: number; observaciones: string;
  total_productos: number; created_at: string;
  detalle_ingreso?: { cantidad: number; costo_unitario: number; producto?: { nombre: string } }[];
};

export default function IngresosPage() {
  const supabase = createClient();
  const [tab, setTab] = useState<"nuevo" | "historial">("historial");
  const [productos, setProductos] = useState<Producto[]>([]);
  const [ingresos, setIngresos] = useState<IngresoRecord[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchProd, setSearchProd] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  const [form, setForm] = useState({
    fecha: new Date().toISOString().split("T")[0],
    proveedor: "", costo_envio: "", observaciones: "",
  });
  const [lineas, setLineas] = useState<LineaIngreso[]>([]);

  const loadData = useCallback(async () => {
    const [{ data: prods }, { data: incs }] = await Promise.all([
      supabase.from("productos").select("*").order("nombre"),
      supabase.from("ingresos_stock").select("*, detalle_ingreso(cantidad, costo_unitario, producto:producto_id(nombre))").order("created_at", { ascending: false }).limit(30),
    ]);
    setProductos(prods || []);
    setIngresos((incs as unknown as IngresoRecord[]) || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { loadData(); }, [loadData]);

  function addProducto(p: Producto) {
    const existe = lineas.find(l => l.producto_id === p.id);
    if (existe) {
      setLineas(l => l.map(x => x.producto_id === p.id ? { ...x, cantidad: x.cantidad + 1 } : x));
    } else {
      setLineas(l => [...l, { producto_id: p.id, producto: p, cantidad: 1, costo_unitario: p.costo_compra }]);
    }
    setShowSearch(false);
    setSearchProd("");
  }

  function removeLinea(idx: number) { setLineas(l => l.filter((_, i) => i !== idx)); }
  function updateLinea(idx: number, field: string, value: string) {
    setLineas(l => l.map((x, i) => i === idx ? { ...x, [field]: field === "cantidad" ? parseInt(value) || 1 : parseFloat(value) || 0 } : x));
  }

  const totalUnidades = lineas.reduce((a, l) => a + l.cantidad, 0);
  const costoEnvio = parseFloat(form.costo_envio) || 0;
  const envioPorUnidad = totalUnidades > 0 ? costoEnvio / totalUnidades : 0;
  const totalCompra = lineas.reduce((a, l) => a + (l.cantidad * l.costo_unitario), 0) + costoEnvio;

  async function handleSubmit() {
    if (lineas.length === 0) { toast.error("Agregá al menos un producto"); return; }
    setSaving(true);

    const { data: ingreso, error: ie } = await supabase.from("ingresos_stock").insert({
      fecha: form.fecha,
      proveedor: form.proveedor || null,
      costo_envio: costoEnvio,
      observaciones: form.observaciones || null,
      total_productos: totalUnidades,
    }).select().single();

    if (ie || !ingreso) { toast.error("Error al registrar ingreso"); setSaving(false); return; }

    for (const l of lineas) {
      const envioProp = envioPorUnidad * l.cantidad;
      await supabase.from("detalle_ingreso").insert({
        ingreso_id: ingreso.id,
        producto_id: l.producto_id,
        cantidad: l.cantidad,
        costo_unitario: l.costo_unitario,
        costo_envio_proporcional: envioProp,
      });
      // Update stock
      const prod = productos.find(p => p.id === l.producto_id);
      if (prod) {
        const nuevoStock = prod.stock_actual + l.cantidad;
        const nuevoCosto = l.costo_unitario + (envioPorUnidad);
        await supabase.from("productos").update({ stock_actual: nuevoStock, costo_compra: nuevoCosto }).eq("id", l.producto_id);
      }
    }

    toast.success("Ingreso registrado y stock actualizado");
    setLineas([]);
    setForm({ fecha: new Date().toISOString().split("T")[0], proveedor: "", costo_envio: "", observaciones: "" });
    setTab("historial");
    loadData();
    setSaving(false);
  }

  const filteredProds = productos.filter(p =>
    p.nombre.toLowerCase().includes(searchProd.toLowerCase()) ||
    p.categoria?.toLowerCase().includes(searchProd.toLowerCase())
  ).slice(0, 10);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Ingresos de mercadería</h1>
        </div>
        <button onClick={() => setTab("nuevo")} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90">
          <Plus size={16} /> Nuevo
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {(["historial", "nuevo"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${tab === t ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
            {t === "historial" ? "Historial" : "Nuevo ingreso"}
          </button>
        ))}
      </div>

      {tab === "nuevo" && (
        <div className="space-y-4">
          {/* Form header */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Fecha</label>
              <input type="date" value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl border border-input bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Proveedor</label>
              <input value={form.proveedor} onChange={e => setForm(f => ({ ...f, proveedor: e.target.value }))}
                placeholder="Nombre del proveedor"
                className="w-full px-3 py-2.5 rounded-xl border border-input bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Costo de envío</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <input type="number" value={form.costo_envio} onChange={e => setForm(f => ({ ...f, costo_envio: e.target.value }))}
                  placeholder="0"
                  className="w-full pl-7 pr-3 py-2.5 rounded-xl border border-input bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Observaciones</label>
              <input value={form.observaciones} onChange={e => setForm(f => ({ ...f, observaciones: e.target.value }))}
                placeholder="Opcional"
                className="w-full px-3 py-2.5 rounded-xl border border-input bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
          </div>

          {/* Productos */}
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm text-foreground">Productos recibidos</h3>
              <button onClick={() => setShowSearch(!showSearch)} className="flex items-center gap-1 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium">
                <Plus size={13} /> Agregar
              </button>
            </div>

            {showSearch && (
              <div className="mb-3">
                <div className="relative">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input value={searchProd} onChange={e => setSearchProd(e.target.value)} autoFocus
                    placeholder="Buscar producto..."
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
                {searchProd && (
                  <div className="mt-1 bg-card border border-border rounded-xl overflow-hidden shadow-lg max-h-48 overflow-y-auto">
                    {filteredProds.map(p => (
                      <button key={p.id} onClick={() => addProducto(p)} className="w-full px-3 py-2.5 text-left text-sm hover:bg-secondary flex items-center justify-between">
                        <span className="font-medium text-foreground">{p.nombre}</span>
                        <span className="text-xs text-muted-foreground">Stock: {p.stock_actual}</span>
                      </button>
                    ))}
                    {filteredProds.length === 0 && <p className="px-3 py-3 text-sm text-muted-foreground">No encontrado</p>}
                  </div>
                )}
              </div>
            )}

            {lineas.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Agregá productos al ingreso</p>
            ) : (
              <div className="space-y-2">
                {lineas.map((l, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 bg-secondary rounded-xl">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{l.producto?.nombre}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-center">
                        <p className="text-[9px] text-muted-foreground">Cant.</p>
                        <input type="number" value={l.cantidad} onChange={e => updateLinea(i, "cantidad", e.target.value)} min={1}
                          className="w-14 text-center px-1 py-1 rounded-lg border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                      </div>
                      <div className="text-center">
                        <p className="text-[9px] text-muted-foreground">Costo u.</p>
                        <input type="number" value={l.costo_unitario} onChange={e => updateLinea(i, "costo_unitario", e.target.value)}
                          className="w-20 text-center px-1 py-1 rounded-lg border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                      </div>
                      <button onClick={() => removeLinea(i)} className="p-1 text-muted-foreground hover:text-destructive">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Resumen */}
          {lineas.length > 0 && (
            <div className="bg-accent rounded-xl p-4 space-y-2">
              <h3 className="font-semibold text-sm text-foreground">Resumen del ingreso</h3>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between"><span className="text-muted-foreground">Total unidades</span><span>{totalUnidades}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Costo envío</span><span>{formatCurrency(costoEnvio)}</span></div>
                {costoEnvio > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Envío por unidad</span><span>{formatCurrency(envioPorUnidad)}</span></div>}
                <div className="flex justify-between font-semibold text-sm border-t border-border pt-1 mt-1">
                  <span>Total inversión</span><span>{formatCurrency(totalCompra)}</span>
                </div>
              </div>
            </div>
          )}

          <button onClick={handleSubmit} disabled={saving || lineas.length === 0}
            className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-all disabled:opacity-50">
            {saving ? "Registrando..." : "Registrar ingreso y actualizar stock"}
          </button>
        </div>
      )}

      {tab === "historial" && (
        loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
          </div>
        ) : ingresos.length === 0 ? (
          <div className="text-center py-16">
            <PackagePlus size={40} className="mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Sin ingresos registrados</p>
          </div>
        ) : (
          <div className="space-y-2">
            {ingresos.map(i => (
              <div key={i.id} className="bg-card border border-border rounded-xl overflow-hidden">
                <button onClick={() => setExpanded(expanded === i.id ? null : i.id)}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-secondary/50 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center">
                      <PackagePlus size={16} className="text-primary" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium text-foreground">{i.proveedor || "Sin proveedor"}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(i.fecha)} · {i.total_productos} unidades</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      {i.costo_envio > 0 && <p className="text-xs text-muted-foreground">Envío: {formatCurrency(i.costo_envio)}</p>}
                    </div>
                    {expanded === i.id ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
                  </div>
                </button>
                {expanded === i.id && i.detalle_ingreso && (
                  <div className="px-4 pb-3 border-t border-border">
                    {i.observaciones && <p className="text-xs text-muted-foreground mt-2 mb-2">{i.observaciones}</p>}
                    <div className="space-y-1 mt-2">
                      {i.detalle_ingreso.map((d, idx) => (
                        <div key={idx} className="flex justify-between text-xs">
                          <span className="text-foreground">{d.producto?.nombre}</span>
                          <span className="text-muted-foreground">x{d.cantidad} · {formatCurrency(d.costo_unitario)} c/u</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
