
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, Plus, Trash2, ChevronLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BottomNav } from "@/components/layout/BottomNav"
import { AIInvoiceParser } from "@/components/invoice/AIInvoiceParser"
import { useToast } from "@/hooks/use-toast"

export default function NewInvoicePage() {
  const router = useRouter()
  const { toast } = useToast()
  const [useAI, setUseAI] = useState(false)
  const [customer, setCustomer] = useState("")
  const [items, setItems] = useState([{ type: "", quantity: 0, price: 0 }])

  const addItem = () => setItems([...items, { type: "", quantity: 0, price: 0 }])
  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx))

  const handleAISave = (data: any) => {
    toast({ title: "تم استيراد البيانات بنجاح" })
    router.push("/")
  }

  const total = items.reduce((acc, item) => acc + (item.quantity * item.price), 0)

  return (
    <div className="flex flex-col min-h-screen bg-background pb-20">
      <header className="p-4 flex items-center justify-between border-b bg-white sticky top-0 z-10">
        <button onClick={() => router.back()} className="p-2 -mr-2">
          <ChevronLeft className="w-6 h-6 rotate-180" />
        </button>
        <h1 className="text-lg font-bold">فاتورة مبيعات جديدة</h1>
        <div className="w-6" />
      </header>

      <div className="p-4 space-y-6">
        <div className="flex items-center gap-2 p-1 bg-muted rounded-xl">
          <button
            onClick={() => setUseAI(false)}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${!useAI ? 'bg-white shadow-sm text-primary' : 'text-muted-foreground'}`}
          >
            إدخال يدوي
          </button>
          <button
            onClick={() => setUseAI(true)}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${useAI ? 'bg-white shadow-sm text-primary' : 'text-muted-foreground'}`}
          >
            استخدام الذكاء الاصطناعي
          </button>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>العميل</Label>
            <Select onValueChange={setCustomer} value={customer}>
              <SelectTrigger className="h-12 rounded-xl bg-white">
                <SelectValue placeholder="اختر العميل" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ahmed">أحمد محمد</SelectItem>
                <SelectItem value="sami">سامي صالح</SelectItem>
                <SelectItem value="nasr">نصر علي</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {useAI ? (
            <AIInvoiceParser onSave={handleAISave} />
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center px-2">
                <Label className="font-bold">أصناف السمك</Label>
                <Button variant="ghost" size="sm" onClick={addItem} className="text-primary gap-1">
                  <Plus className="w-4 h-4" />
                  إضافة صنف
                </Button>
              </div>

              {items.map((item, idx) => (
                <div key={idx} className="p-4 bg-white rounded-2xl border border-border/50 shadow-sm space-y-3">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-bold text-muted-foreground">صنف #{idx + 1}</span>
                    {items.length > 1 && (
                      <button onClick={() => removeItem(idx)} className="text-destructive p-1">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Input placeholder="نوع السمك (تونة، بياض...)" className="h-11 rounded-xl" />
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-[10px] mr-2">الكمية (كجم)</Label>
                        <Input 
                          type="number" 
                          placeholder="0" 
                          className="h-11 rounded-xl"
                          onChange={(e) => {
                            const newItems = [...items]
                            newItems[idx].quantity = parseFloat(e.target.value) || 0
                            setItems(newItems)
                          }}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] mr-2">سعر الكيلو</Label>
                        <Input 
                          type="number" 
                          placeholder="0" 
                          className="h-11 rounded-xl"
                          onChange={(e) => {
                            const newItems = [...items]
                            newItems[idx].price = parseFloat(e.target.value) || 0
                            setItems(newItems)
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              <div className="p-4 bg-primary text-white rounded-2xl flex justify-between items-center shadow-lg">
                <span className="font-bold">إجمالي الفاتورة:</span>
                <span className="text-xl font-black tabular-nums">{total.toLocaleString()} ر.ي</span>
              </div>

              <Button className="w-full h-14 rounded-2xl text-lg font-bold shadow-lg" onClick={() => router.push("/")}>
                حفظ وإصدار الفاتورة
              </Button>
            </div>
          )}
        </div>
      </div>
      <BottomNav />
    </div>
  )
}
