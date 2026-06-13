import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, startOfDay, startOfWeek, startOfMonth, startOfYear, endOfDay } from "date-fns";
import { es } from "date-fns/locale";
import { FiltroFecha, MetodoPago, CategoriaGasto } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDate(date: string | Date): string {
  return format(new Date(date), "dd/MM/yyyy", { locale: es });
}

export function formatDateTime(date: string | Date): string {
  return format(new Date(date), "dd/MM/yyyy HH:mm", { locale: es });
}

export function getDateRange(filtro: FiltroFecha, desde?: Date, hasta?: Date) {
  const now = new Date();
  switch (filtro) {
    case "hoy":
      return { desde: startOfDay(now), hasta: endOfDay(now) };
    case "semana":
      return { desde: startOfWeek(now, { weekStartsOn: 1 }), hasta: endOfDay(now) };
    case "mes":
      return { desde: startOfMonth(now), hasta: endOfDay(now) };
    case "año":
      return { desde: startOfYear(now), hasta: endOfDay(now) };
    case "personalizado":
      return { desde: desde || startOfMonth(now), hasta: hasta ? endOfDay(hasta) : endOfDay(now) };
    default:
      return { desde: startOfMonth(now), hasta: endOfDay(now) };
  }
}

export const METODOS_PAGO: Record<MetodoPago, string> = {
  efectivo: "Efectivo",
  transferencia: "Transferencia",
  mercado_pago_qr: "Mercado Pago QR",
  debito: "Débito",
  credito: "Crédito",
};

export const CATEGORIAS_GASTO: Record<CategoriaGasto, string> = {
  publicidad: "Publicidad",
  bolsas: "Bolsas",
  etiquetas: "Etiquetas",
  envios: "Envíos",
  servicios: "Servicios",
  otros: "Otros",
};

export const STOCK_MINIMO_DEFAULT = 3;
