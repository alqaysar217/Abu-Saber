"use client"

import { useState } from "react"
import { Camera, Upload, Loader2, Save, X, Trash2, Plus, CheckCircle2, AlertCircle, RefreshCcw } from "lucide-react"
import { extractInvoiceData, type ExtractInvoiceDataOutput } from "@/ai/flows/ai-invoice-data-extraction-flow"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

interface EditableItem {
  tempId: string
  fishType: string
  quantity: number | string
  pricePerKg: number | string
  totalItemPrice: number
}

// دالة لتحويل الأرقام العربية إلى إنجليزية وضمان صحة الأرقام
function parseArNum(val: any): string {
  if (val === undefined || val === null) return "0";
  const map: Record<string, string> = {'٠':'0','١':'1','٢':'2','٣':'3','٤':'4','٥':'5','٦':'6','٧':'7','٨':'8','٩':'9'};
  let str = String(val).replace(/[٠-٩]/g, d => map[d]);
  return str.replace(/[^\d.]/g, '');
}

export function AIInvoiceParser({ onSave }: { onSave: (data: ExtractInvoiceDataOutput) => void }) {
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState<EditableItem[]>([])
  const { toast } = useToast()

  const calculateGrandTotal = (currentItems: EditableItem[]) => {
    return currentItems.reduce((acc, item) => acc + (item.totalItemPrice || 0), 0)
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 10 * 1024 * 1024) {
      toast({ variant: "destructive", title: "حجم الصورة كبير جداً", description: "يرجى اختيار صورة أصغر من 10 ميجابايت." })
      return
    }

    setLoading(true)
    try {
      const reader = new FileReader()
      reader.onloadend = async () => {
        const base64String = reader.result as string
        try {
          const result = await extractInvoiceData({
            invoiceImageDataUri: base64String
          })
          
          const mappedItems = result.fishItems.map(item => ({
            ...item,
            // التأكد من تحويل أي أرقام راجعة من الذكاء الاصطناعي إلى إنجليزية
            quantity: parseArNum(item.quantity),
            pricePerKg: parseArNum(item.pricePerKg),
            tempId: Math.random().toString(36).substring(2, 9)
          }))
          
          setItems(mappedItems)
          toast({ title: "تم التحليل بنجاح", description: "تم استخراج الأرقام وتحويلها للصيغة الإنجليزية." })
        } catch (error: any) {
          toast({ variant: "destructive", title: "فشل استخراج البيانات", description: error.message })
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

  const updateItem = (tempId: string, field: keyof EditableItem, value: string) => {
    const cleanVal = field === 'fishType' ? value : parseArNum(value);
    
    setItems(prev => prev.map(item => {
      if (item.tempId === tempId) {
        const updatedItem = { ...item, [field]: cleanVal }
        
        if (field === 'quantity' || field === 'pricePerKg') {
          const qty = parseFloat(String(updatedItem.quantity)) || 0
          const price = parseFloat(String(updatedItem.pricePerKg)) || 0
          updatedItem.totalItemPrice = qty * price
        }
        
        return updatedItem
      }
      return item
    }))
  }

  const addNewRow = () => {
    const newItem: EditableItem = {
      tempId: Math.random().toString(36).substring(2, 9),
      fishType: "",
      quantity: 0,
      pricePerKg: 0,
      totalItemPrice: 0
    }
    setItems([...items, newItem])
  }

  const removeRow = (tempId: string) => {
    setItems(items.filter(item => item.tempId !== tempId))
  }

  const handleFinalSubmit = () => {
    if (items.length === 0) {
      toast({ variant: "destructive", title: "القائمة فارغة" })
      return
    }

    const output: ExtractInvoiceDataOutput = {
      fishItems: items.map(({ tempId, ...rest }) => ({
        ...rest,
        quantity: parseFloat(String(rest.quantity)) || 0,
        pricePerKg: parseFloat(String(rest.pricePerKg)) || 0
      })),
      totalInvoiceAmount: calculateGrandTotal(items)
    }
    onSave(output)
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 gap-5 bg-white rounded-3xl border-2 border-dashed border-primary/20 animate-pulse">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
        </div>
        <div className="text-center space-y-1">
          <p className="font-black text-lg">جاري القراءة بذكاء فائق...</p>
          <p className="text-xs text-muted-foreground font-bold italic">يتم الآن تحويل الأرقام ومعالجة بنود الجرد</p>
        </div>
      </div>
    )
  }

  if (items.length > 0) {
    return (
      <Card className="border-none shadow-xl rounded-[2rem] overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
        <CardHeader className="lux-gradient text-white p-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-400" />
              <CardTitle className="text-lg font-black">مراجعة الجرد الذكي</CardTitle>
            </div>
            <button onClick={() => setItems([])} className="p-2 hover:bg-white/10 rounded-full transition-colors">
              <RefreshCcw className="w-5 h-5" />
            </button>
          </div>
          <p className="text-[10px] text-white/70 font-bold mt-1">تنبيه: كافة الأرقام تظهر بالإنجليزية للحسابات الدقيقة</p>
        </CardHeader>
        
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table dir="rtl">
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="text-right text-[10px] font-black py-4 pr-6">نوع السمك</TableHead>
                  <TableHead className="text-center text-[10px] font-black">الكمية</TableHead>
                  <TableHead className="text-center text-[10px] font-black">السعر</TableHead>
                  <TableHead className="text-center text-[10px] font-black">الإجمالي</TableHead>
                  <TableHead className="text-left text-[10px] font-black pl-6"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.tempId} className="border-b-muted/20">
                    <TableCell className="pr-4 py-3">
                      <input 
                        className="w-full bg-transparent border-none text-xs font-bold focus:ring-0 text-primary"
                        value={item.fishType}
                        onChange={(e) => updateItem(item.tempId, 'fishType', e.target.value)}
                        placeholder="نوع السمك..."
                      />
                    </TableCell>
                    <TableCell className="p-0">
                      <input 
                        type="text"
                        inputMode="decimal"
                        className="w-full bg-transparent border-none text-center text-xs font-black tabular-nums focus:ring-0"
                        value={item.quantity}
                        onChange={(e) => updateItem(item.tempId, 'quantity', e.target.value)}
                      />
                    </TableCell>
                    <TableCell className="p-0">
                      <input 
                        type="text"
                        inputMode="decimal"
                        className="w-full bg-transparent border-none text-center text-xs font-black tabular-nums focus:ring-0 text-accent"
                        value={item.pricePerKg}
                        onChange={(e) => updateItem(item.tempId, 'pricePerKg', e.target.value)}
                      />
                    </TableCell>
                    <TableCell className="text-center text-[11px] font-black tabular-nums text-primary/80">
                      {(item.totalItemPrice || 0).toLocaleString('en-US')}
                    </TableCell>
                    <TableCell className="pl-4">
                      <button onClick={() => removeRow(item.tempId)} className="p-2 text-destructive/30 hover:text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="p-4 border-t border-dashed bg-muted/10 flex justify-between items-center">
            <Button variant="outline" size="sm" className="rounded-xl border-dashed border-primary/30 text-primary font-black gap-2 h-10 px-4" onClick={addNewRow}>
              <Plus className="w-4 h-4" /> إضافة صنف
            </Button>
            <div className="flex flex-col items-end">
               <span className="text-[9px] font-black text-muted-foreground uppercase">الإجمالي النهائي</span>
               <span className="text-xl font-black text-primary tabular-nums">
                 {calculateGrandTotal(items).toLocaleString('en-US')} <span className="text-[10px]">ر.ي</span>
               </span>
            </div>
          </div>

          <div className="p-6 bg-white border-t">
            <Button className="w-full h-14 rounded-2xl text-lg font-black shadow-xl lux-gradient gap-3" onClick={handleFinalSubmit}>
              <Save className="w-6 h-6" /> اعتماد وحفظ الفاتورة
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="relative group">
      <input type="file" accept="image/*" id="ai-upload-detailed" className="hidden" onChange={handleFileUpload} />
      <label
        htmlFor="ai-upload-detailed"
        className="flex flex-col items-center justify-center p-12 gap-6 bg-white rounded-[2.5rem] border-2 border-dashed border-primary/30 hover:bg-primary/5 hover:border-primary/50 transition-all cursor-pointer group shadow-inner"
      >
        <div className="w-20 h-20 rounded-[1.5rem] bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
          <Camera className="w-10 h-10 text-primary" />
        </div>
        <div className="text-center space-y-2">
          <p className="font-black text-xl text-primary">رفع صورة الفاتورة</p>
          <p className="text-sm text-muted-foreground font-medium leading-relaxed max-w-[200px] mx-auto">
            سيتعرف النظام على الأرقام العربية والخط اليدوي بدقة ويحولها لأرقام إنجليزية تلقائياً
          </p>
        </div>
        <Button variant="outline" className="rounded-2xl gap-2 pointer-events-none h-11 px-8 font-black border-primary/20 text-primary">
          <Upload className="w-4 h-4" /> اختر من الألبوم
        </Button>
      </label>
    </div>
  )
}
