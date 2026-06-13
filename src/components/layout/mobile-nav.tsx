"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Package, ShoppingCart, History, BarChart3, Menu, Search
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useTheme } from "next-themes";
import { PackagePlus, Receipt, LogOut, Moon, Sun } from "lucide-react";
import { toast } from "sonner";

const mainNav = [
  { href: "/dashboard", label: "Inicio", icon: LayoutDashboard },
  { href: "/productos", label: "Stock", icon: Package },
  { href: "/ventas", label: "Ventas", icon: ShoppingCart },
  { href: "/historial", label: "Historial", icon: History },
  { href: "/reportes", label: "Reportes", icon: BarChart3 },
];

export function MobileNav() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    toast.success("Sesión cerrada");
    router.push("/login");
    setMenuOpen(false);
  }

  return (
    <>
      {/* Top bar mobile */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-card border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-black text-xs">EC</span>
          </div>
          <span className="font-black text-foreground tracking-tight text-sm">
            ECLIPTICA<span className="text-primary">.</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/buscar" className="p-2 rounded-lg hover:bg-secondary transition-all">
            <Search size={18} className="text-muted-foreground" />
          </Link>
          <button onClick={() => setMenuOpen(!menuOpen)} className="p-2 rounded-lg hover:bg-secondary transition-all">
            <Menu size={18} className="text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Drawer menu */}
      {menuOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMenuOpen(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-64 bg-card border-l border-border flex flex-col">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <span className="font-bold text-foreground">Menú</span>
              <button onClick={() => setMenuOpen(false)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
              {[
                { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
                { href: "/productos", label: "Productos", icon: Package },
                { href: "/ingresos", label: "Ingresos", icon: PackagePlus },
                { href: "/ventas", label: "Ventas", icon: ShoppingCart },
                { href: "/historial", label: "Historial", icon: History },
                { href: "/gastos", label: "Gastos", icon: Receipt },
                { href: "/reportes", label: "Reportes", icon: BarChart3 },
                { href: "/buscar", label: "Búsqueda", icon: Search },
              ].map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                    pathname === href ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  )}
                >
                  <Icon size={17} /> {label}
                </Link>
              ))}
            </nav>
            <div className="p-3 border-t border-border space-y-0.5">
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary w-full"
              >
                {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
                {theme === "dark" ? "Modo claro" : "Modo oscuro"}
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 w-full"
              >
                <LogOut size={17} /> Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom nav mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border">
        <div className="flex">
          {mainNav.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex-1 flex flex-col items-center gap-1 py-3 text-[10px] font-medium transition-all",
                pathname === href || pathname.startsWith(href + "/")
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
            >
              <Icon size={20} />
              {label}
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}
