"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Gasto, CategoriaGasto } from "@/types";
import { formatCurrency, formatDate, CATEGORIAS_GASTO } from "@/lib/utils";
import { Receipt, Plus, Edit2, Trash2, X } from "lucide-react";
import { toast } from "sonner";

export default function GastosPage() {
  const supabase = createClient();
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editGasto, setEditGasto] = useState<Gasto | null>(null);
  const [form, setForm] = useState({ fecha: new Date().toISOString().split("T")[0], descripcion: "", categoria: "otros" as CategoriaGasto, monto: "" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.from("gastos").select("*").order("fecha", { ascending: false }).order("created_at", { ascending: false });
    setGastos(data || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  function openEdit(g: Gasto) {
    setEditGasto(g);
    setForm({ fecha: g.fecha, descripcion: g.descripcion, categoria: g.categoria, monto: g.monto.toString() });
    setShowForm(true);
  }

  function resetForm() { setForm({ fecha: new Date().toISOString().split("T")[0], descripcion: "", categoria: "otros", monto: "" }); setEditGasto(null); setShowForm(false); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.descripcion || !form.monto) { toast.error("Descripción y monto son obligatorios"); return; }
    setSaving(true);
    const payload = { fecha: form.fecha, descripcion: form.descripcion, categoria: form.categoria, monto: parseFloat(form.monto) };
    let error;
    if (editGasto) {
      ({ error } = await supabase.from("gastos").update(payload).eq("id", editGasto.id));
    } else {
      ({ error } = await supabase.from("gastos").insert(payload));
    }
    if (error) toast.error("Error al guardar");
    else { toast.success(editGasto ? "Gasto actualizado" : "Gasto registrado"); resetForm(); load(); }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar este gasto?")) return;
    await supabase.from("gastos").delete().eq("id", id);
    toast.success("Gasto eliminado");
    load();
  }

  const totalMes = gastos
    .filter(g => g.fecha.startsWith(new Date().toISOString().slice(0, 7)))
    .reduce((a, g) => a + Number(g.monto), 0);

  const CATEGORIA_COLORS: Record<CategoriaGasto, string> = {
    publicidad: "bg-purple-100 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400",
    bolsas: "bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400",
    etiquetas: "bg-cyan-100 dark:bg-cyan-950/30 text-cyan-700 dark:text-cyan-400",
    envios: "bg-orange-100 dark:bg-orange-950/30 text-orange-700 dark:text-orange-400",
    servicios: "bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400",
    otros: "bg-secondary text-secondary-foreground",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gastos</h1>
          <p className="text-muted-foreground text-sm">Este mes: {formatCurrency(totalMes)}</p>
        </div>
        <button onClick={() => { setEditGasto(null); setShowForm(true); }} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90">
          <Plus size={16} /> Nuevo
        </button>
      </div>

      {/* Modal form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/50" onClick={resetForm} />
          <div className="relative w-full sm:max-w-sm bg-card rounded-t-2xl sm:rounded-2xl border border-border">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h2 className="font-bold text-foreground">{editGasto ? "Editar gasto" : "Nuevo gasto"}</h2>
              <button onClick={resetForm}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Fecha</label>
                  <input type="date" value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Monto *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                    <input type="number" value={form.monto} onChange={e => setForm(f => ({ ...f, monto: e.target.value }))}
                      placeholder="0"
                      className="w-full pl-7 pr-3 py-2.5 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Descripción *</label>
                <input value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
                  placeholder="Ej: Compra de bolsas para envíos"
                  className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Categoría</label>
                <select value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value as CategoriaGasto }))}
                  className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                  {Object.entries(CATEGORIAS_GASTO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={resetForm} className="flex-1 py-3 rounded-xl border border-border text-sm font-medium">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50">
                  {saving ? "Guardando..." : editGasto ? "Actualizar" : "Registrar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
        </div>
      ) : gastos.length === 0 ? (
        <div className="text-center py-16">
          <Receipt size={40} className="mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Sin gastos registrados</p>
        </div>
      ) : (
        <div className="space-y-2">
          {gastos.map(g => (
            <div key={g.id} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground text-sm">{g.descripcion}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-muted-foreground">{formatDate(g.fecha)}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${CATEGORIA_COLORS[g.categoria]}`}>
                    {CATEGORIAS_GASTO[g.categoria]}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="font-bold text-foreground">{formatCurrency(Number(g.monto))}</span>
                <button onClick={() => openEdit(g)} className="p-1.5 rounded-lg hover:bg-secondary"><Edit2 size={13} className="text-muted-foreground" /></button>
                <button onClick={() => handleDelete(g.id)} className="p-1.5 rounded-lg hover:bg-destructive/10"><Trash2 size={13} className="text-muted-foreground hover:text-destructive" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
