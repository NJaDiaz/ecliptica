"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, getDateRange, METODOS_PAGO } from "@/lib/utils";
import { FiltroFecha } from "@/types";
import { BarChart3, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line
} from "recharts";
import { format, eachDayOfInterval } from "date-fns";

const FILTROS: { key: FiltroFecha; label: string }[] = [
  { key: "hoy", label: "Hoy" },
  { key: "semana", label: "Semana" },
  { key: "mes", label: "Mes" },
  { key: "año", label: "Año" },
];

const COLORS = ["#6B1010", "#8B1A1A", "#C01414", "#E01B1B", "#94a3b8"];

export default function ReportesPage() {
  const supabase = createClient();
  const [filtro, setFiltro] = useState<FiltroFecha>("mes");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total_vendido: 0, total_gastado: 0, ganancia_neta: 0 });
  const [topProductos, setTopProductos] = useState<{ nombre: string; cantidad: number; total: number }[]>([]);
  const [metodosPago, setMetodosPago] = useState<{ metodo: string; value: number }[]>([]);
  const [evolucion, setEvolucion] = useState<{ fecha: string; ventas: number; ganancia: number }[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const { desde, hasta } = getDateRange(filtro);

    const [{ data: ventas }, { data: gastos }] = await Promise.all([
      supabase.from("ventas").select("*, producto:producto_id(nombre)").gte("fecha", desde.toISOString()).lte("fecha", hasta.toISOString()),
      supabase.from("gastos").select("monto").gte("fecha", desde.toISOString().split("T")[0]).lte("fecha", hasta.toISOString().split("T")[0]),
    ]);

    const totalVendido = ventas?.reduce((a, v) => a + Number(v.total), 0) || 0;
    const totalGanancia = ventas?.reduce((a, v) => a + Number(v.ganancia), 0) || 0;
    const totalGastado = gastos?.reduce((a, g) => a + Number(g.monto), 0) || 0;
    setStats({ total_vendido: totalVendido, total_gastado: totalGastado, ganancia_neta: totalGanancia - totalGastado });

    // Top productos
    const prodMap: Record<string, { nombre: string; cantidad: number; total: number }> = {};
    ventas?.forEach(v => {
      const nombre = (v.producto as any)?.nombre || "Producto";
      if (!prodMap[nombre]) prodMap[nombre] = { nombre, cantidad: 0, total: 0 };
      prodMap[nombre].cantidad += Number(v.cantidad);
      prodMap[nombre].total += Number(v.total);
    });
    setTopProductos(Object.values(prodMap).sort((a, b) => b.cantidad - a.cantidad).slice(0, 8));

    // Métodos pago
    const metMap: Record<string, number> = {};
    ventas?.forEach(v => { metMap[v.metodo_pago] = (metMap[v.metodo_pago] || 0) + Number(v.total); });
    setMetodosPago(Object.entries(metMap).map(([k, v]) => ({ metodo: METODOS_PAGO[k as keyof typeof METODOS_PAGO] || k, value: v })));

    // Evolución
    const days = eachDayOfInterval({ start: desde, end: hasta });
    const evMap: Record<string, { ventas: number; ganancia: number }> = {};
    days.forEach(d => { evMap[format(d, "yyyy-MM-dd")] = { ventas: 0, ganancia: 0 }; });
    ventas?.forEach(v => {
      const key = v.fecha.split("T")[0];
      if (evMap[key]) { evMap[key].ventas += Number(v.total); evMap[key].ganancia += Number(v.ganancia); }
    });
    const evolucionData = Object.entries(evMap).map(([fecha, data]) => ({
      fecha: filtro === "año" ? fecha.slice(5, 7) + "/" + fecha.slice(0, 4) : fecha.slice(8) + "/" + fecha.slice(5, 7),
      ...data,
    }));
    // Aggregate by month if year
    if (filtro === "año") {
      const monthly: Record<string, { ventas: number; ganancia: number }> = {};
      evolucionData.forEach(d => {
        if (!monthly[d.fecha]) monthly[d.fecha] = { ventas: 0, ganancia: 0 };
        monthly[d.fecha].ventas += d.ventas;
        monthly[d.fecha].ganancia += d.ganancia;
      });
      setEvolucion(Object.entries(monthly).map(([fecha, data]) => ({ fecha, ...data })));
    } else {
      setEvolucion(evolucionData);
    }
    setLoading(false);
  }, [filtro, supabase]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Reportes</h1>
      </div>

      <div className="flex gap-2">
        {FILTROS.map(f => (
          <button key={f.key} onClick={() => setFiltro(f.key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${filtro === f.key ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Vendido", value: formatCurrency(stats.total_vendido), icon: TrendingUp, color: "text-blue-500" },
              { label: "Gastado", value: formatCurrency(stats.total_gastado), icon: TrendingDown, color: "text-red-500" },
              { label: "Ganancia", value: formatCurrency(stats.ganancia_neta), icon: DollarSign, color: stats.ganancia_neta >= 0 ? "text-green-500" : "text-red-500" },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="bg-card border border-border rounded-xl p-3">
                <Icon size={15} className={`${color} mb-1`} />
                <div className="text-sm font-bold text-foreground">{value}</div>
                <div className="text-[10px] text-muted-foreground">{label}</div>
              </div>
            ))}
          </div>

          {/* Evolución ventas */}
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="font-semibold text-sm text-foreground mb-4">Evolución de ventas</h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={evolucion}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="fecha" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => formatCurrency(Number(v))} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                <Line type="monotone" dataKey="ventas" name="Ventas" stroke="#6B1010" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="ganancia" name="Ganancia" stroke="#22c55e" strokeWidth={2} dot={false} />
                <Legend wrapperStyle={{ fontSize: "12px" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Top productos */}
          {topProductos.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-4">
              <h3 className="font-semibold text-sm text-foreground mb-4">Productos más vendidos</h3>
              <ResponsiveContainer width="100%" height={Math.min(topProductos.length * 40 + 20, 240)}>
                <BarChart data={topProductos} layout="vertical" margin={{ left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis type="category" dataKey="nombre" width={110} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip formatter={(v, name) => name === "cantidad" ? [`${v} u.`, "Cantidad"] : [formatCurrency(Number(v)), "Total"]} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                  <Bar dataKey="cantidad" name="Cantidad" fill="#6B1010" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Métodos de pago */}
          {metodosPago.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-4">
              <h3 className="font-semibold text-sm text-foreground mb-4">Métodos de pago</h3>
              <div className="flex items-center justify-center">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={metodosPago} dataKey="value" nameKey="metodo" cx="50%" cy="50%" outerRadius={75} label={({ metodo, percent }) => `${metodo} ${(percent * 100).toFixed(0)}%`} labelLine={{ stroke: "hsl(var(--muted-foreground))" }} fontSize={11}>
                      {metodosPago.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v) => formatCurrency(Number(v))} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {topProductos.length === 0 && (
            <div className="text-center py-16">
              <BarChart3 size={40} className="mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">Sin datos para este período</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
