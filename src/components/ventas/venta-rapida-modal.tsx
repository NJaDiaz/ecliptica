"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Producto, MetodoPago } from "@/types";
import { formatCurrency, METODOS_PAGO } from "@/lib/utils";
import { X, ShoppingCart, Minus, Plus, Info } from "lucide-react";
import { toast } from "sonner";

type Props = {
  producto: Producto;
  onClose: () => void;
  onSave: () => void;
};

const METODOS: MetodoPago[] = ["efectivo", "transferencia", "mercado_pago_qr", "debito", "credito"];

// Métodos donde MP cobra comisión → el usuario ingresa lo que realmente recibió
const METODOS_CON_COMISION: MetodoPago[] = ["mercado_pago_qr", "debito", "credito"];

export default function VentaRapidaModal({ producto, onClose, onSave }: Props) {
  const supabase = createClient();
  const [cantidad, setCantidad] = useState(1);
  const [metodo, setMetodo] = useState<MetodoPago>("efectivo");
  const [montoRecibido, setMontoRecibido] = useState("");
  const [saving, setSaving] = useState(false);

  const precioTotal = cantidad * producto.precio_venta;
  const costo = cantidad * producto.costo_compra;

  // ¿Este método tiene comisión?
  const tieneComision = METODOS_CON_COMISION.includes(metodo);

  // Lo que realmente ingresó a la caja
  const montoReal = tieneComision && montoRecibido !== ""
    ? parseFloat(montoRecibido) || 0
    : precioTotal;

  // Comisión que se llevó MP
  const comision = tieneComision ? precioTotal - montoReal : 0;

  // Ganancia real = lo que entró a la caja - costo del producto
  const gananciaReal = montoReal - costo;

  function handleMetodoChange(m: MetodoPago) {
    setMetodo(m);
    setMontoRecibido(""); // reset al cambiar método
  }

  async function handleVenta() {
    if (cantidad > producto.stock_actual) {
      toast.error(`Stock insuficiente. Disponible: ${producto.stock_actual}`);
      return;
    }
    if (tieneComision && montoRecibido === "") {
      toast.error("Ingresá el monto que recibiste de Mercado Pago");
      return;
    }
    setSaving(true);

    const { error: ventaError } = await supabase.from("ventas").insert({
      fecha: new Date().toISOString(),
      producto_id: producto.id,
      cantidad,
      precio_unitario: producto.precio_venta,
      total: montoReal,          // lo que realmente entró
      metodo_pago: metodo,
      costo_total: costo,
      ganancia: gananciaReal,    // ganancia real descontando comisión
    });

    if (ventaError) {
      toast.error("Error al registrar venta");
      setSaving(false);
      return;
    }

    const { error: stockError } = await supabase
      .from("productos")
      .update({ stock_actual: producto.stock_actual - cantidad })
      .eq("id", producto.id);

    if (stockError) {
      toast.error("Venta registrada pero error al actualizar stock");
    } else {
      toast.success(`Venta registrada — Recibiste ${formatCurrency(montoReal)}`);
    }
    onSave();
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full sm:max-w-sm bg-card rounded-t-2xl sm:rounded-2xl border border-border">

        {/* Header */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart size={18} className="text-primary" />
            <h2 className="font-bold text-foreground">Registrar venta</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">

          {/* Producto */}
          <div className="flex items-center gap-3 p-3 bg-secondary rounded-xl">
            <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
              {producto.imagen_url ? (
                <img src={producto.imagen_url} alt={producto.nombre} className="w-full h-full object-cover" />
              ) : (
                <ShoppingCart size={18} className="text-muted-foreground/40" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground text-sm truncate">{producto.nombre}</p>
              <p className="text-xs text-muted-foreground">Stock: {producto.stock_actual} u.</p>
            </div>
            <div className="text-right">
              <p className="font-bold text-primary text-sm">{formatCurrency(producto.precio_venta)}</p>
              <p className="text-[10px] text-muted-foreground">por unidad</p>
            </div>
          </div>

          {/* Cantidad */}
          <div>
            <label className="block text-xs font-medium text-foreground mb-2">Cantidad</label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setCantidad(c => Math.max(1, c - 1))}
                className="w-10 h-10 rounded-xl border border-border flex items-center justify-center hover:bg-secondary transition-all"
              ><Minus size={16} /></button>
              <input
                type="number"
                value={cantidad}
                onChange={e => setCantidad(Math.max(1, Math.min(producto.stock_actual, parseInt(e.target.value) || 1)))}
                className="flex-1 text-center text-xl font-bold py-2 rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                onClick={() => setCantidad(c => Math.min(producto.stock_actual, c + 1))}
                className="w-10 h-10 rounded-xl border border-border flex items-center justify-center hover:bg-secondary transition-all"
              ><Plus size={16} /></button>
            </div>
          </div>

          {/* Método de pago */}
          <div>
            <label className="block text-xs font-medium text-foreground mb-2">Método de pago</label>
            <div className="grid grid-cols-2 gap-2">
              {METODOS.map(m => (
                <button
                  key={m}
                  onClick={() => handleMetodoChange(m)}
                  className={`py-2.5 px-3 rounded-xl text-xs font-medium transition-all relative ${
                    metodo === m
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground hover:bg-muted"
                  }`}
                >
                  {METODOS_PAGO[m]}
                  {METODOS_CON_COMISION.includes(m) && (
                    <span className={`ml-1 text-[9px] ${metodo === m ? "opacity-70" : "text-muted-foreground"}`}>
                      MP
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Campo monto recibido — solo para métodos con comisión */}
          {tieneComision && (
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3 space-y-2">
              <div className="flex items-start gap-2">
                <Info size={14} className="text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  Precio cobrado: <strong>{formatCurrency(precioTotal)}</strong>. Ingresá lo que
                  te acreditó Mercado Pago después de la comisión.
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Monto recibido de MP *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                  <input
                    type="number"
                    value={montoRecibido}
                    onChange={e => setMontoRecibido(e.target.value)}
                    placeholder={precioTotal.toString()}
                    className="w-full pl-7 pr-3 py-2.5 rounded-xl border border-input bg-background text-foreground text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Resumen */}
          <div className="bg-accent rounded-xl p-3 space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Precio cobrado</span>
              <span className="font-semibold text-foreground">{formatCurrency(precioTotal)}</span>
            </div>

            {tieneComision && montoRecibido !== "" && (
              <>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Monto recibido</span>
                  <span className="font-semibold text-foreground">{formatCurrency(montoReal)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Comisión MP</span>
                  <span className="text-red-500 font-medium">−{formatCurrency(comision)}</span>
                </div>
                <div className="border-t border-border/50 pt-1" />
              </>
            )}

            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Ganancia real</span>
              <span className={`font-bold text-base ${gananciaReal >= 0 ? "text-green-600 dark:text-green-400" : "text-red-500"}`}>
                {gananciaReal >= 0 ? "+" : ""}{formatCurrency(gananciaReal)}
              </span>
            </div>

            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Método</span>
              <span className="text-foreground">{METODOS_PAGO[metodo]}</span>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-border text-sm font-medium hover:bg-secondary transition-all">
              Cancelar
            </button>
            <button
              onClick={handleVenta}
              disabled={saving || (tieneComision && montoRecibido === "")}
              className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Guardando..." : "Confirmar venta"}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
