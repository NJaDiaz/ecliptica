"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Package, PackagePlus, ShoppingCart,
  History, Receipt, BarChart3, Search, LogOut, Heart, Moon, Sun
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useTheme } from "next-themes";
import { toast } from "sonner";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/productos", label: "Productos", icon: Package },
  { href: "/ingresos", label: "Ingresos", icon: PackagePlus },
  { href: "/ventas", label: "Ventas", icon: ShoppingCart },
  { href: "/historial", label: "Historial", icon: History },
  { href: "/gastos", label: "Gastos", icon: Receipt },
  { href: "/reportes", label: "Reportes", icon: BarChart3 },
  { href: "/buscar", label: "Búsqueda", icon: Search },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    toast.success("Sesión cerrada");
    router.push("/login");
  }

  return (
    <aside className="hidden md:flex w-60 flex-col bg-card border-r border-border">
      {/* Logo */}
      <div className="p-5 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-sm">
            <span className="text-primary-foreground font-black text-sm">EC</span>
          </div>
          <div>
            <div className="font-black text-foreground tracking-tight text-sm leading-none">
              ECLIPTICA<span className="text-primary">.</span>
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">Admin Panel</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
              pathname === href || pathname.startsWith(href + "/")
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            )}
          >
            <Icon size={17} />
            {label}
          </Link>
        ))}
      </nav>

      {/* Bottom */}
      <div className="p-3 border-t border-border space-y-0.5">
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary w-full transition-all"
        >
          {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
          {theme === "dark" ? "Modo claro" : "Modo oscuro"}
        </button>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 w-full transition-all"
        >
          <LogOut size={17} />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
