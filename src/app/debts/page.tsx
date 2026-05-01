
"use client"

import { Search, User, Phone, Wallet, ArrowDownToLine, ArrowUpFromLine } from "lucide-react"
import { BottomNav } from "@/components/layout/BottomNav"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const customers = [
  { id: 1, name: "أحمد العولقي", amount: "١٥٠,٠٠٠ ر.ي", phone: "٧٧٧٠٠٠٠٠٠", lastUpdate: "قبل يومين" },
  { id: 2, name: "مطعم الميناء", amount: "٤٢٠,٠٠٠ ر.ي", phone: "٧٧٧١١١٢٢٢", lastUpdate: "قبل ٥ ساعات" },
  { id: 3, name: "سامي البحري", amount: "٨٥,٠٠٠ ر.ي", phone: "٧٧٧٣٣٣٤٤٤", lastUpdate: "أمس" },
]

const suppliers = [
  { id: 1, name: "شركة الثلج الحديثة", amount: "٤٥,٠٠٠ ر.ي", lastUpdate: "منذ أسبوع" },
  { id: 2, name: "محطة الوقود المركزية", amount: "١٢٠,٠٠٠ ر.ي", lastUpdate: "أمس" },
]

export default function DebtsPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background pb-20">
      <header className="p-6 bg-white border-b">
        <h1 className="text-2xl font-bold mb-4">إدارة الديون</h1>
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="بحث عن اسم..." className="pr-10 h-11 rounded-xl bg-muted/50 border-none" />
        </div>
      </header>

      <div className="p-4">
        <Tabs defaultValue="suppliers" className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-12 rounded-2xl p-1 mb-6">
            <TabsTrigger value="suppliers" className="rounded-xl font-bold">ديون عليك (موردين)</TabsTrigger>
            <TabsTrigger value="customers" className="rounded-xl font-bold">ديون لك (عملاء)</TabsTrigger>
          </TabsList>
          
          <TabsContent value="suppliers" className="space-y-4">
            <div className="p-4 bg-red-50 text-red-700 rounded-2xl flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <ArrowUpFromLine className="w-6 h-6" />
                <span className="font-bold">إجمالي ديونك</span>
              </div>
              <span className="text-xl font-black">١٦٥,٠٠٠ ر.ي</span>
            </div>

            {suppliers.map((s) => (
              <div key={s.id} className="flex justify-between items-center p-4 bg-white rounded-2xl border border-border/50 shadow-sm">
                <div className="flex gap-4 items-center">
                  <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-500">
                    <Wallet className="w-6 h-6" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold">{s.name}</span>
                    <span className="text-[10px] text-muted-foreground">{s.lastUpdate}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <span className="font-bold text-red-600">{s.amount}</span>
                  <button className="text-[10px] text-primary font-bold mt-1">تسجيل سداد</button>
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="customers" className="space-y-4">
            <div className="p-4 bg-green-50 text-green-700 rounded-2xl flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <ArrowDownToLine className="w-6 h-6" />
                <span className="font-bold">إجمالي مستحقاتك</span>
              </div>
              <span className="text-xl font-black">٦٥٥,٠٠٠ ر.ي</span>
            </div>
            
            {customers.map((c) => (
              <div key={c.id} className="flex justify-between items-center p-4 bg-white rounded-2xl border border-border/50 shadow-sm active:bg-secondary/20 transition-colors">
                <div className="flex gap-4 items-center">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <User className="w-6 h-6" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold">{c.name}</span>
                    <span className="text-[10px] text-muted-foreground">آخر سداد: {c.lastUpdate}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <span className="font-bold text-green-600">{c.amount}</span>
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Phone className="w-3 h-3" />
                    <span>{c.phone}</span>
                  </div>
                </div>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </div>
      <BottomNav />
    </div>
  )
}
