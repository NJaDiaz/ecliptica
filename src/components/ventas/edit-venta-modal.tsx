"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Venta, MetodoPago } from "@/types";
import { METODOS_PAGO, formatCurrency } from "@/lib/utils";
import { X } from "lucide-react";
import { toast } from "sonner";

type Props = { venta: Venta; onClose: () => void; onSave: () => void };
const METODOS: MetodoPago[] = ["efectivo", "transferencia", "mercado_pago_qr", "debito", "credito"];

export default function EditVentaModal({ venta, onClose, onSave }: Props) {
  const supabase = createClient();
  const [metodo, setMetodo] = useState<MetodoPago>(venta.metodo_pago);
  const [precio, setPrecio] = useState(venta.precio_unitario.toString());
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    const p = parseFloat(precio);
    const total = p * venta.cantidad;
    const ganancia = total - Number(venta.costo_total);
    const { error } = await supabase.from("ventas").update({
      metodo_pago: metodo,
      precio_unitario: p,
      total,
      ganancia,
    }).eq("id", venta.id);
    if (error) toast.error("Error al guardar");
    else { toast.success("Venta actualizada"); onSave(); }
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full sm:max-w-sm bg-card rounded-t-2xl sm:rounded-2xl border border-border">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="font-bold text-foreground">Editar venta</h2>
          <button onClick={onClose}><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <p className="text-sm font-medium text-foreground mb-1">{venta.producto?.nombre}</p>
            <p className="text-xs text-muted-foreground">Cantidad: {venta.cantidad}</p>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Precio por unidad</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
              <input type="number" value={precio} onChange={e => setPrecio(e.target.value)}
                className="w-full pl-7 pr-3 py-2.5 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-2">Método de pago</label>
            <div className="grid grid-cols-2 gap-2">
              {METODOS.map(m => (
                <button key={m} onClick={() => setMetodo(m)}
                  className={`py-2 px-3 rounded-xl text-xs font-medium transition-all ${metodo === m ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
                  {METODOS_PAGO[m]}
                </button>
              ))}
            </div>
          </div>
          <div className="bg-accent rounded-xl p-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total</span>
              <span className="font-bold">{formatCurrency(parseFloat(precio || "0") * venta.cantidad)}</span>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-border text-sm font-medium">Cancelar</button>
            <button onClick={handleSave} disabled={saving} className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50">
              {saving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
