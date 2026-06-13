"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import {
  TrendingUp, TrendingDown, Package, AlertTriangle,
  ShoppingCart, DollarSign, BarChart2, Clock
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Legend
} from "recharts";
import { format, subDays, startOfDay, endOfDay, startOfMonth } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";

type Stats = {
  ventas_hoy: number;
  ventas_mes: number;
  ganancia_mes: number;
  productos_vendidos_mes: number;
  stock_total: number;
  stock_bajo: number;
  gastos_mes: number;
};

type ChartData = {
  fecha: string;
  ventas: number;
  gastos: number;
  ganancia: number;
};

type Movimiento = {
  id: string;
  tipo: "venta" | "gasto" | "ingreso";
  desc: string;
  monto: number;
  fecha: string;
};

export default function DashboardPage() {
  const supabase = createClient();
  const [stats, setStats] = useState<Stats | null>(null);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [alertas, setAlertas] = useState<{ id: string; nombre: string; stock: number; minimo: number }[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDashboard = useCallback(async () => {
    const now = new Date();
    const hoyInicio = startOfDay(now).toISOString();
    const hoyFin = endOfDay(now).toISOString();
    const mesInicio = startOfMonth(now).toISOString();

    const [ventasHoy, ventasMes, gastosMes, productos] = await Promise.all([
      supabase.from("ventas").select("total, ganancia").gte("fecha", hoyInicio).lte("fecha", hoyFin),
      supabase.from("ventas").select("total, ganancia, cantidad").gte("fecha", mesInicio),
      supabase.from("gastos").select("monto").gte("fecha", mesInicio.split("T")[0]),
      supabase.from("productos").select("id, nombre, stock_actual, stock_minimo"),
    ]);

    const vh = ventasHoy.data?.reduce((a, v) => a + Number(v.total), 0) || 0;
    const vm = ventasMes.data?.reduce((a, v) => a + Number(v.total), 0) || 0;
    const gm = ventasMes.data?.reduce((a, v) => a + Number(v.ganancia), 0) || 0;
    const pm = ventasMes.data?.reduce((a, v) => a + Number(v.cantidad), 0) || 0;
    const gast = gastosMes.data?.reduce((a, g) => a + Number(g.monto), 0) || 0;
    const stockTotal = productos.data?.reduce((a, p) => a + p.stock_actual, 0) || 0;
    const stockBajo = productos.data?.filter(p => p.stock_actual <= p.stock_minimo) || [];

    setStats({
      ventas_hoy: vh, ventas_mes: vm, ganancia_mes: gm,
      productos_vendidos_mes: pm, stock_total: stockTotal,
      stock_bajo: stockBajo.length, gastos_mes: gast,
    });
    setAlertas(stockBajo.map(p => ({ id: p.id, nombre: p.nombre, stock: p.stock_actual, minimo: p.stock_minimo })));

    // Chart: últimos 7 días
    const dias: ChartData[] = [];
    for (let i = 6; i >= 0; i--) {
      const dia = subDays(now, i);
      const dInicio = startOfDay(dia).toISOString();
      const dFin = endOfDay(dia).toISOString();
      const [vDia, gDia] = await Promise.all([
        supabase.from("ventas").select("total, ganancia").gte("fecha", dInicio).lte("fecha", dFin),
        supabase.from("gastos").select("monto").eq("fecha", format(dia, "yyyy-MM-dd")),
      ]);
      dias.push({
        fecha: format(dia, "EEE", { locale: es }),
        ventas: vDia.data?.reduce((a, v) => a + Number(v.total), 0) || 0,
        gastos: gDia.data?.reduce((a, g) => a + Number(g.monto), 0) || 0,
        ganancia: vDia.data?.reduce((a, v) => a + Number(v.ganancia), 0) || 0,
      });
    }
    setChartData(dias);

    // Últimos movimientos
    const [ultVentas, ultGastos] = await Promise.all([
      supabase.from("ventas").select("id, fecha, total, ganancia, producto:producto_id(nombre)").order("fecha", { ascending: false }).limit(5),
      supabase.from("gastos").select("id, fecha, descripcion, monto").order("created_at", { ascending: false }).limit(3),
    ]);
    const movs: Movimiento[] = [
      ...(ultVentas.data?.map(v => ({
        id: v.id, tipo: "venta" as const,
        desc: `Venta: ${(v.producto as any)?.nombre || "Producto"}`,
        monto: Number(v.total), fecha: v.fecha,
      })) || []),
      ...(ultGastos.data?.map(g => ({
        id: g.id, tipo: "gasto" as const,
        desc: `Gasto: ${g.descripcion}`,
        monto: -Number(g.monto), fecha: g.fecha,
      })) || []),
    ].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()).slice(0, 8);
    setMovimientos(movs);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const statCards = [
    { label: "Ventas hoy", value: formatCurrency(stats?.ventas_hoy || 0), icon: ShoppingCart, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-950/30" },
    { label: "Ventas del mes", value: formatCurrency(stats?.ventas_mes || 0), icon: TrendingUp, color: "text-green-500", bg: "bg-green-50 dark:bg-green-950/30" },
    { label: "Ganancia neta", value: formatCurrency(stats?.ganancia_mes || 0), icon: DollarSign, color: "text-primary", bg: "bg-accent" },
    { label: "Productos vendidos", value: stats?.productos_vendidos_mes || 0, icon: BarChart2, color: "text-purple-500", bg: "bg-purple-50 dark:bg-purple-950/30" },
    { label: "Stock total", value: stats?.stock_total || 0, icon: Package, color: "text-orange-500", bg: "bg-orange-50 dark:bg-orange-950/30" },
    { label: "Gastos del mes", value: formatCurrency(stats?.gastos_mes || 0), icon: TrendingDown, color: "text-red-500", bg: "bg-red-50 dark:bg-red-950/30" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Resumen de tu negocio</p>
      </div>

      {/* Alertas */}
      {alertas.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={16} className="text-amber-600" />
            <span className="font-semibold text-amber-800 dark:text-amber-400 text-sm">
              {alertas.length} producto{alertas.length > 1 ? "s" : ""} con stock bajo
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {alertas.slice(0, 5).map(a => (
              <Link key={a.id} href={`/productos/${a.id}`}
                className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 px-2.5 py-1 rounded-lg hover:opacity-80">
                {a.nombre} ({a.stock})
              </Link>
            ))}
            {alertas.length > 5 && (
              <Link href="/productos?filtro=stock_bajo" className="text-xs text-amber-600 underline">
                +{alertas.length - 5} más
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {statCards.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-muted-foreground font-medium">{label}</span>
              <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center`}>
                <Icon size={15} className={color} />
              </div>
            </div>
            <div className="text-xl font-bold text-foreground">{value}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Area chart */}
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="font-semibold text-foreground text-sm mb-4">Ventas últimos 7 días</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6B1010" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#6B1010" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="fecha" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => formatCurrency(Number(v))} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
              <Area type="monotone" dataKey="ventas" name="Ventas" stroke="#6B1010" fill="url(#colorVentas)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Bar chart */}
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="font-semibold text-foreground text-sm mb-4">Ventas vs Gastos</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="fecha" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => formatCurrency(Number(v))} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
              <Legend wrapperStyle={{ fontSize: "12px" }} />
              <Bar dataKey="ventas" name="Ventas" fill="#6B1010" radius={[4, 4, 0, 0]} />
              <Bar dataKey="gastos" name="Gastos" fill="#94a3b8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Últimos movimientos */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground text-sm">Últimos movimientos</h3>
          <Clock size={15} className="text-muted-foreground" />
        </div>
        {movimientos.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-8">Sin movimientos todavía</p>
        ) : (
          <div className="space-y-2">
            {movimientos.map(m => (
              <div key={m.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${m.tipo === "venta" ? "bg-green-500" : "bg-red-400"}`} />
                  <div>
                    <p className="text-sm font-medium text-foreground">{m.desc}</p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(m.fecha)}</p>
                  </div>
                </div>
                <span className={`text-sm font-semibold ${m.monto >= 0 ? "text-green-600 dark:text-green-400" : "text-red-500"}`}>
                  {m.monto >= 0 ? "+" : ""}{formatCurrency(m.monto)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
