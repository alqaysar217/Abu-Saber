
"use client"

import { useState } from "react"
import { Camera, Upload, Loader2, Save, X, Edit3 } from "lucide-react"
import { extractInvoiceData, type ExtractInvoiceDataOutput } from "@/ai/flows/ai-invoice-data-extraction-flow"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"

export function AIInvoiceParser({ onSave }: { onSave: (data: ExtractInvoiceDataOutput) => void }) {
  const [loading, setLoading] = useState(false)
  const [extractedData, setExtractedData] = useState<ExtractInvoiceDataOutput | null>(null)
  const { toast } = useToast()

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setLoading(true)
    try {
      const reader = new FileReader()
      reader.onloadend = async () => {
        const base64String = reader.result as string
        try {
          const result = await extractInvoiceData({
            invoiceImageDataUri: base64String
          })
          setExtractedData(result)
          toast({ title: "تم استخراج البيانات بنجاح" })
        } catch (error) {
          console.error(error)
          toast({ variant: "destructive", title: "فشل استخراج البيانات" })
        } finally {
          setLoading(false)
        }
      }
      reader.readAsDataURL(file)
    } catch (err) {
      setLoading(false)
      toast({ variant: "destructive", title: "حدث خطأ أثناء تحميل الملف" })
    }
  }

  const updateItem = (index: number, field: string, value: any) => {
    if (!extractedData) return
    const newItems = [...extractedData.fishItems]
    newItems[index] = { ...newItems[index], [field]: value }
    
    // Recalculate item total
    if (field === 'quantity' || field === 'pricePerKg') {
      newItems[index].totalItemPrice = newItems[index].quantity * newItems[index].pricePerKg
    }

    const total = newItems.reduce((acc, item) => acc + item.totalItemPrice, 0)
    setExtractedData({ ...extractedData, fishItems: newItems, totalInvoiceAmount: total })
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 gap-4 bg-white rounded-3xl border-2 border-dashed border-primary/20">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
        <p className="text-sm font-medium">جاري معالجة الفاتورة بالذكاء الاصطناعي...</p>
      </div>
    )
  }

  if (extractedData) {
    return (
      <Card className="border-primary/20 shadow-lg rounded-3xl overflow-hidden animate-in fade-in slide-in-from-bottom-4">
        <CardHeader className="bg-primary text-white p-4">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg">مراجعة البيانات المستخرجة</CardTitle>
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" onClick={() => setExtractedData(null)}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <div className="space-y-3">
            {extractedData.fishItems.map((item, idx) => (
              <div key={idx} className="p-3 border rounded-xl space-y-2 bg-secondary/20">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[10px]">نوع السمك</Label>
                    <Input 
                      value={item.fishType} 
                      onChange={(e) => updateItem(idx, 'fishType', e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px]">الكمية (كجم)</Label>
                    <Input 
                      type="number"
                      value={item.quantity} 
                      onChange={(e) => updateItem(idx, 'quantity', parseFloat(e.target.value))}
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[10px]">السعر للكيلو</Label>
                    <Input 
                      type="number"
                      value={item.pricePerKg} 
                      onChange={(e) => updateItem(idx, 'pricePerKg', parseFloat(e.target.value))}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px]">الإجمالي</Label>
                    <div className="h-8 flex items-center px-3 bg-white rounded-md border text-xs font-bold">
                      {item.totalItemPrice.toLocaleString()} ر.ي
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t flex justify-between items-center">
            <div className="text-sm font-bold">إجمالي الفاتورة:</div>
            <div className="text-xl font-black text-primary">{extractedData.totalInvoiceAmount.toLocaleString()} ر.ي</div>
          </div>

          <Button className="w-full h-12 rounded-xl gap-2 font-bold" onClick={() => onSave(extractedData)}>
            <Save className="w-5 h-5" />
            حفظ الفاتورة
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="relative">
      <input
        type="file"
        accept="image/*"
        id="ai-upload"
        className="hidden"
        onChange={handleFileUpload}
      />
      <label
        htmlFor="ai-upload"
        className="flex flex-col items-center justify-center p-8 gap-4 bg-white rounded-3xl border-2 border-dashed border-primary/30 hover:bg-primary/5 transition-colors cursor-pointer group"
      >
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
          <Camera className="w-8 h-8 text-primary" />
        </div>
        <div className="text-center">
          <p className="font-bold text-lg">تحميل صورة فاتورة</p>
          <p className="text-sm text-muted-foreground">استخراج البيانات تلقائياً بالذكاء الاصطناعي</p>
        </div>
        <Button variant="outline" className="rounded-full gap-2 pointer-events-none">
          <Upload className="w-4 h-4" />
          اختر صورة
        </Button>
      </label>
    </div>
  )
}
