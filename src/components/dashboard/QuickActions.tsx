
import { PlusCircle, Receipt, ShoppingCart, Truck } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

const actions = [
  { label: "فاتورة جديدة", icon: Receipt, href: "/invoices/new", color: "bg-primary" },
  { label: "مصروف جديد", icon: ShoppingCart, href: "/expenses/new", color: "bg-accent" },
  { label: "حملة جديدة", icon: Truck, href: "/campaigns/new", color: "bg-chart-5" },
]

export function QuickActions() {
  return (
    <div className="grid grid-cols-3 gap-3 p-4">
      {actions.map((action) => (
        <Link key={action.label} href={action.href} className="w-full">
          <Button
            variant="ghost"
            className="flex flex-col items-center justify-center h-24 w-full bg-white border border-border shadow-sm rounded-2xl gap-2 hover:bg-secondary/50"
          >
            <div className={`p-2 rounded-xl text-white ${action.color}`}>
              <action.icon className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-foreground">{action.label}</span>
          </Button>
        </Link>
      ))}
    </div>
  )
}
