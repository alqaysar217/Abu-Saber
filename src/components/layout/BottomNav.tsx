"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Ship, Wallet, BarChart3, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/", label: "الرئيسية", icon: Home },
  { href: "/campaigns", label: "الحملات", icon: Ship },
  { href: "/chat", label: "الشات", icon: Sparkles, isCenter: true },
  { href: "/debts", label: "الديون", icon: Wallet },
  { href: "/reports", label: "التقارير", icon: BarChart3 },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-border safe-area-bottom z-50">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto relative">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon
          
          if (item.isCenter) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="relative -top-4 flex items-center justify-center"
              >
                <div className={cn(
                  "w-14 h-14 rounded-full flex items-center justify-center shadow-xl transition-all active:scale-90 border-4 border-background",
                  isActive ? "lux-gradient text-white" : "bg-white text-primary border-muted"
                )}>
                  <Icon className={cn("w-7 h-7", isActive && "animate-pulse")} />
                </div>
                <span className={cn(
                  "absolute -bottom-6 text-[9px] font-black uppercase tracking-tight",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}>
                  {item.label}
                </span>
              </Link>
            )
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center w-full h-full gap-1 transition-colors",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon className={cn("w-6 h-6", isActive && "stroke-[2.5px]")} />
              <span className="text-[10px] font-medium leading-none">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
