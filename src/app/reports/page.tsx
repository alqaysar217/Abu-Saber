
"use client"

import { useMemo, useState } from "react"
import { BottomNav } from "@/components/layout/BottomNav"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Filter, FileText, Download, TrendingUp, AlertCircle, Calendar, Banknote, PieChart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, orderBy } from "firebase/firestore"
import { cn } from "@/lib/utils"

export default function ReportsPage() {
  const { user } = useUser()
  const db = useFirestore()
  const [selectedPeriod, setSelectedPeriod] = useState("الشهر")

  const invoicesQuery = useMemoFirebase(() => {
    if (!db || !user) return null
    return query(collection(db, "users", user.uid, "invoices"), orderBy("invoiceDate", "asc"))
  }, [db, user])

  const { data: invoices, isLoading } = useCollection(invoicesQuery)

  // تجميع البيانات الحقيقية للرسم البياني (شهرياً)
  const chartData = useMemo(() => {
    if (!invoices || invoices.length === 0) return []
    
    const monthsMap: Record<string, number> = {}
    const months = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"]

    invoices.forEach(inv => {
      if (!inv.invoiceDate) return
      const date = new Date(inv.invoiceDate)
      const monthName = months[date.getMonth()]
      monthsMap[monthName] = (monthsMap[monthName] || 0) + (inv.totalAmount || 0)
    })

    return Object.entries(monthsMap).map(([name, value]) => ({ name, value }))
  }, [invoices])

  return (
    <div className="flex flex-col min-h-screen bg-background pb-24">
      <header className="p-6 bg-white border-b sticky top-0 z-20 shadow-sm space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-black text-primary">التحليلات والتقارير</h1>
          <div className="p-2 bg-primary/5 rounded-xl text-primary">
            <PieChart className="w-6 h-6" />
          </div>
        </div>
        
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar" dir="rtl">
          {["اليوم", "الأسبوع", "الشهر", "السنة"].map((period) => (
            <Button 
              key={period} 
              variant={selectedPeriod === period ? 'default' : 'secondary'} 
              size="sm" 
              onClick={() => setSelectedPeriod(period)}
              className={cn(
                "rounded-xl px-6 h-10 font-black text-xs transition-all",
                selectedPeriod === period ? "lux-gradient shadow-md" : "bg-muted/50 text-muted-foreground"
              )}
            >
              {period}
            </Button>
          ))}
        </div>
      </header>

      <div className="p-4 space-y-6">
        {/* بطاقة الرسم البياني الرئيسية */}
        <Card className="border-none shadow-xl rounded-[2rem] overflow-hidden bg-white">
          <CardHeader className="p-6 pb-2 text-right">
            <CardTitle className="text-sm font-black text-primary flex items-center justify-start gap-2" dir="rtl">
              <TrendingUp className="w-5 h-5" />
              أداء المبيعات (حسب الأشهر)
            </CardTitle>
            <p className="text-[10px] text-muted-foreground font-bold mt-1">يتم احتساب البيانات من واقع فواتير المبيعات المسجلة</p>
          </CardHeader>
          <CardContent className="h-72 p-4 pt-0">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fill: '#666', fontWeight: 'bold' }} 
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 9, fill: '#999', fontWeight: 'bold' }}
                  />
                  <Tooltip 
                    cursor={{ fill: '#f8f8f8' }}
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', textAlign: 'right', direction: 'rtl' }}
                    formatter={(value: number) => [value.toLocaleString() + " ر.ي", "إجمالي المبيعات"]}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={30}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === chartData.length - 1 ? '#123524' : '#23604533'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-3 opacity-30">
                <TrendingUp className="w-16 h-16" />
                <p className="text-xs font-black">لا توجد فواتير مبيعات مسجلة لعرضها</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* أدوات التصدير */}
        <div className="space-y-4">
          <h3 className="text-lg font-black px-2 text-right text-primary">أدوات إدارية</h3>
          <div className="grid gap-3">
            {[
              { label: "كشف حساب العملاء (PDF)", icon: FileText, color: "bg-blue-50 text-blue-600" },
              { label: "جرد مبيعات الأصناف", icon: Calendar, color: "bg-green-50 text-green-600" },
              { label: "تقرير مديونيات الموردين", icon: Banknote, color: "bg-orange-50 text-orange-600" },
            ].map((report, idx) => (
              <button key={idx} className="w-full flex items-center justify-between p-5 bg-white rounded-[1.5rem] border border-border/40 shadow-sm active:scale-[0.98] transition-all group">
                 <Download className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                <div className="flex items-center gap-4">
                  <span className="text-sm font-black text-foreground/90">{report.label}</span>
                  <div className={cn("p-3 rounded-2xl shadow-inner", report.color)}>
                    <report.icon className="w-5 h-5" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* رسالة توضيحية */}
        <Card className="border-none bg-orange-50 rounded-[2rem] border border-orange-100 p-6 shadow-inner">
          <div className="flex flex-col items-center text-center gap-3">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-orange-500 shadow-sm">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h4 className="font-black text-orange-900">ملاحظة محاسبية</h4>
            <p className="text-[11px] text-orange-800 font-bold leading-relaxed px-4">
              التقارير أعلاه هي انعكاس مباشر للفواتير والمصروفات التي تقوم بتسجيلها. لضمان دقة التحليل، احرص على توثيق كافة العمليات المالية فور حدوثها.
            </p>
          </div>
        </Card>
      </div>
      <BottomNav />
    </div>
  )
}
