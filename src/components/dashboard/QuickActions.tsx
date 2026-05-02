
import { Receipt, ShoppingCart, ShoppingBag, Ship, Wallet, ChevronRight } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

const actions = [
  { label: "فاتورة مبيعات", icon: Receipt, href: "/invoices/new", color: "bg-primary" },
  { label: "شراء أسماك", icon: ShoppingBag, href: "/purchases/new", color: "bg-orange-600" },
  { label: "مصروف جديد", icon: ShoppingCart, href: "/expenses/new", color: "bg-accent" },
  { label: "إضافة حملة جديدة", icon: Ship, href: "/campaigns/new", color: "bg-blue-600" },
  { label: "سداد دين (لك أو عليك)", icon: Wallet, href: "/debts", color: "bg-purple-600" },
]

export function QuickActions() {
  return (
    <div className="flex flex-col gap-3 px-4">
      {actions.map((action) => (
        <Link key={action.label} href={action.href} className="w-full">
          <Button
            variant="ghost"
            className="flex items-center justify-between h-16 w-full bg-white border border-border shadow-sm rounded-2xl px-4 hover:bg-secondary/50 transition-all active:scale-[0.98]"
          >
            <div className="flex items-center gap-4">
              <div className={`p-2.5 rounded-xl text-white ${action.color} shadow-sm`}>
                <action.icon className="w-5 h-5" />
              </div>
              <span className="text-sm font-bold text-foreground">{action.label}</span>
            </div>
            {/* تم عكس اتجاه السهم باستخدام rotate-180 ليشير لجهة اليسار في الواجهة العربية */}
            <ChevronRight className="w-4 h-4 text-muted-foreground rotate-180" />
          </Button>
        </Link>
      ))}
    </div>
  )
}
