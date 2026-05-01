
import { BottomNav } from "@/components/layout/BottomNav"
import { QuickActions } from "@/components/dashboard/QuickActions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowUpRight, ArrowDownRight, Wallet, Banknote } from "lucide-react"
import { cn } from "@/lib/utils"

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-background pb-20">
      <header className="p-6 bg-primary text-white rounded-b-[2rem] shadow-lg mb-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold font-headline">أبو صابر</h1>
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <Banknote className="w-6 h-6" />
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-white/80 text-sm">إجمالي الأرباح</p>
          <p className="text-4xl font-bold tabular-nums tracking-tighter">
            2,450,000 <span className="text-lg">ر.ي</span>
          </p>
        </div>
      </header>

      <section className="px-4 -mt-12 mb-6">
        <div className="grid grid-cols-2 gap-4">
          <Card className="border-none shadow-md rounded-2xl">
            <CardContent className="p-4 flex flex-col gap-2">
              <div className="flex justify-between items-start">
                <div className="p-2 bg-green-100 text-green-700 rounded-lg">
                  <ArrowUpRight className="w-5 h-5" />
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">ديون لك</p>
                <p className="text-lg font-bold text-green-700">840,000 <span className="text-[10px]">ر.ي</span></p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-md rounded-2xl">
            <CardContent className="p-4 flex flex-col gap-2">
              <div className="flex justify-between items-start">
                <div className="p-2 bg-red-100 text-red-700 rounded-lg">
                  <ArrowDownRight className="w-5 h-5" />
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">ديون عليك</p>
                <p className="text-lg font-bold text-red-700">320,000 <span className="text-[10px]">ر.ي</span></p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="px-4 mb-6">
        <Card className="border-none shadow-md rounded-2xl bg-gradient-to-br from-accent/10 to-transparent">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-accent/20 text-accent rounded-xl">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">السيولة الحالية</p>
              <p className="text-xl font-bold">1,215,000 <span className="text-sm">ر.ي</span></p>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="mb-6">
        <h2 className="px-6 text-lg font-bold mb-2">روابط سريعة</h2>
        <QuickActions />
      </section>

      <section className="px-4 mb-6">
        <div className="flex justify-between items-center mb-4 px-2">
          <h2 className="text-lg font-bold">آخر النشاطات</h2>
          <button className="text-sm text-primary font-medium">عرض الكل</button>
        </div>
        <div className="space-y-3">
          {[
            { title: "بيع تونة - حملة الحديدة", sub: "قبل ٢ ساعة", amount: "+ ٤٥,٠٠٠ ر.ي", type: "income" },
            { title: "مصاريف ديزل", sub: "قبل ٤ ساعات", amount: "- ١٢,٠٠٠ ر.ي", type: "expense" },
            { title: "شراء ثلج", sub: "أمس", amount: "- ٥,٥٠٠ ر.ي", type: "expense" },
          ].map((item, idx) => (
            <div key={idx} className="flex justify-between items-center p-4 bg-white rounded-2xl border border-border/50 shadow-sm">
              <div className="flex flex-col">
                <span className="font-bold text-sm">{item.title}</span>
                <span className="text-xs text-muted-foreground">{item.sub}</span>
              </div>
              <span className={cn(
                "font-bold text-sm tabular-nums",
                item.type === "income" ? "text-green-600" : "text-red-500"
              )}>
                {item.amount}
              </span>
            </div>
          ))}
        </div>
      </section>

      <BottomNav />
    </div>
  )
}
