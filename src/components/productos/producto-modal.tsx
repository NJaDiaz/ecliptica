"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Producto } from "@/types";
import { X, Upload, Image, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { STOCK_MINIMO_DEFAULT } from "@/lib/utils";

type Props = {
  producto: Producto | null;
  onClose: () => void;
  onSave: () => void;
};

const CATEGORIAS = ["Remeras", "Buzos", "Jeans", "Pantalones", "Vestidos", "Faldas", "Camperas", "Abrigos", "Accesorios", "Calzado", "Otro"];

export default function ProductoModal({ producto, onClose, onSave }: Props) {
  const supabase = createClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(producto?.imagen_url || null);

  const [form, setForm] = useState({
    nombre: producto?.nombre || "",
    costo_compra: producto?.costo_compra?.toString() || "",
    precio_venta: producto?.precio_venta?.toString() || "",
    stock_actual: producto?.stock_actual?.toString() || "0",
    stock_minimo: producto?.stock_minimo?.toString() || STOCK_MINIMO_DEFAULT.toString(),
    categoria: producto?.categoria || "",
    marca: producto?.marca || "",
    talle: producto?.talle || "",
    color: producto?.color || "",
    descripcion: producto?.descripcion || "",
    codigo_barras: producto?.codigo_barras || "",
    imagen_url: producto?.imagen_url || "",
  });

  function handleChange(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }));
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `productos/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("productos").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("productos").getPublicUrl(path);
      setForm(f => ({ ...f, imagen_url: data.publicUrl }));
      setImagePreview(data.publicUrl);
      toast.success("Imagen subida");
    } catch {
      toast.error("Error al subir imagen");
    }
    setUploading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nombre || !form.costo_compra || !form.precio_venta) {
      toast.error("Nombre, costo y precio son obligatorios");
      return;
    }
    setSaving(true);
    const payload = {
      nombre: form.nombre,
      costo_compra: parseFloat(form.costo_compra),
      precio_venta: parseFloat(form.precio_venta),
      stock_actual: parseInt(form.stock_actual) || 0,
      stock_minimo: parseInt(form.stock_minimo) || STOCK_MINIMO_DEFAULT,
      categoria: form.categoria || null,
      marca: form.marca || null,
      talle: form.talle || null,
      color: form.color || null,
      descripcion: form.descripcion || null,
      codigo_barras: form.codigo_barras || null,
      imagen_url: form.imagen_url || null,
    };

    let error;
    if (producto) {
      ({ error } = await supabase.from("productos").update(payload).eq("id", producto.id));
    } else {
      ({ error } = await supabase.from("productos").insert(payload));
    }

    if (error) {
      toast.error("Error al guardar");
    } else {
      toast.success(producto ? "Producto actualizado" : "Producto creado");
      onSave();
    }
    setSaving(false);
  }

  const ganancia = form.precio_venta && form.costo_compra
    ? parseFloat(form.precio_venta) - parseFloat(form.costo_compra)
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full sm:max-w-lg bg-card rounded-t-2xl sm:rounded-2xl border border-border max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border px-5 py-4 flex items-center justify-between z-10">
          <h2 className="font-bold text-foreground">{producto ? "Editar producto" : "Nuevo producto"}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary transition-all">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Image */}
          <div className="flex items-center gap-4">
            <div
              onClick={() => fileRef.current?.click()}
              className="w-20 h-20 rounded-xl border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:border-primary transition-all overflow-hidden bg-muted"
            >
              {imagePreview ? (
                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
              ) : uploading ? (
                <Loader2 size={20} className="animate-spin text-muted-foreground" />
              ) : (
                <div className="flex flex-col items-center gap-1">
                  <Image size={20} className="text-muted-foreground" />
                  <span className="text-[9px] text-muted-foreground">Foto</span>
                </div>
              )}
            </div>
            <div>
              <button type="button" onClick={() => fileRef.current?.click()} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary text-secondary-foreground text-xs font-medium hover:bg-muted transition-all">
                <Upload size={14} /> {imagePreview ? "Cambiar foto" : "Subir foto"}
              </button>
              <p className="text-[10px] text-muted-foreground mt-1">Opcional • JPG, PNG</p>
              {imagePreview && (
                <button type="button" onClick={() => { setImagePreview(null); setForm(f => ({ ...f, imagen_url: "" })); }}
                  className="text-[10px] text-destructive mt-0.5">Eliminar foto</button>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          </div>

          {/* Nombre */}
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">Nombre *</label>
            <input value={form.nombre} onChange={e => handleChange("nombre", e.target.value)}
              placeholder="Ej: Remera Oversize Negra"
              className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>

          {/* Precios */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Costo de compra *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <input type="number" value={form.costo_compra} onChange={e => handleChange("costo_compra", e.target.value)}
                  placeholder="0"
                  className="w-full pl-7 pr-3 py-2.5 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Precio de venta *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <input type="number" value={form.precio_venta} onChange={e => handleChange("precio_venta", e.target.value)}
                  placeholder="0"
                  className="w-full pl-7 pr-3 py-2.5 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
            </div>
          </div>

          {/* Ganancia preview */}
          {ganancia !== null && (
            <div className={`px-3 py-2 rounded-lg text-xs font-medium ${ganancia >= 0 ? "bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400" : "bg-red-50 dark:bg-red-950/20 text-red-600"}`}>
              Ganancia por unidad: ${ganancia.toLocaleString("es-AR")}
              {form.costo_compra && ganancia > 0 && (
                <span className="ml-2 opacity-70">({((ganancia / parseFloat(form.costo_compra)) * 100).toFixed(0)}% margen)</span>
              )}
            </div>
          )}

          {/* Stock */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Stock actual *</label>
              <input type="number" value={form.stock_actual} onChange={e => handleChange("stock_actual", e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Stock mínimo (alerta)</label>
              <input type="number" value={form.stock_minimo} onChange={e => handleChange("stock_minimo", e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
          </div>

          {/* Opcional */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Categoría</label>
              <select value={form.categoria} onChange={e => handleChange("categoria", e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                <option value="">Sin categoría</option>
                {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Marca</label>
              <input value={form.marca} onChange={e => handleChange("marca", e.target.value)}
                placeholder="Ej: Nike"
                className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Talle</label>
              <input value={form.talle} onChange={e => handleChange("talle", e.target.value)}
                placeholder="Ej: M, 42, Único"
                className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Color</label>
              <input value={form.color} onChange={e => handleChange("color", e.target.value)}
                placeholder="Ej: Negro"
                className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground mb-1">Código de barras</label>
            <input value={form.codigo_barras} onChange={e => handleChange("codigo_barras", e.target.value)}
              placeholder="Escanear o ingresar"
              className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground mb-1">Descripción</label>
            <textarea value={form.descripcion} onChange={e => handleChange("descripcion", e.target.value)}
              rows={2} placeholder="Descripción opcional..."
              className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none" />
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl border border-border text-sm font-medium hover:bg-secondary transition-all">
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-all disabled:opacity-50">
              {saving ? "Guardando..." : producto ? "Guardar cambios" : "Crear producto"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
