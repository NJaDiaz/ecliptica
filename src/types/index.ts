export type Producto = {
  id: string;
  nombre: string;
  costo_compra: number;
  precio_venta: number;
  stock_actual: number;
  stock_minimo: number;
  imagen_url?: string | null;
  categoria?: string | null;
  marca?: string | null;
  talle?: string | null;
  color?: string | null;
  descripcion?: string | null;
  codigo_barras?: string | null;
  created_at: string;
  updated_at: string;
};

export type IngresoStock = {
  id: string;
  fecha: string;
  proveedor?: string | null;
  costo_envio: number;
  observaciones?: string | null;
  total_productos: number;
  created_at: string;
};

export type DetalleIngreso = {
  id: string;
  ingreso_id: string;
  producto_id: string;
  cantidad: number;
  costo_unitario: number;
  costo_envio_proporcional: number;
  producto?: Producto;
};

export type Venta = {
  id: string;
  fecha: string;
  producto_id: string;
  cantidad: number;
  precio_unitario: number;
  total: number;
  metodo_pago: MetodoPago;
  costo_total: number;
  ganancia: number;
  created_at: string;
  producto?: Producto;
};

export type Gasto = {
  id: string;
  fecha: string;
  descripcion: string;
  categoria: CategoriaGasto;
  monto: number;
  created_at: string;
};

export type MetodoPago =
  | "efectivo"
  | "transferencia"
  | "mercado_pago_qr"
  | "debito"
  | "credito";

export type CategoriaGasto =
  | "publicidad"
  | "bolsas"
  | "etiquetas"
  | "envios"
  | "servicios"
  | "otros";

export type DashboardStats = {
  ventas_hoy: number;
  ventas_mes: number;
  ganancia_neta_mes: number;
  productos_vendidos_mes: number;
  stock_total: number;
  productos_stock_bajo: number;
  ultimos_movimientos: MovimientoReciente[];
};

export type MovimientoReciente = {
  id: string;
  tipo: "venta" | "ingreso" | "gasto";
  descripcion: string;
  monto: number;
  fecha: string;
};

export type FiltroFecha = "hoy" | "semana" | "mes" | "año" | "personalizado";

export type ReporteData = {
  total_vendido: number;
  total_gastado: number;
  ganancia_neta: number;
  productos_mas_vendidos: { nombre: string; cantidad: number; total: number }[];
  metodos_pago: { metodo: string; total: number; cantidad: number }[];
  evolucion_ventas: { fecha: string; ventas: number; ganancias: number }[];
};
