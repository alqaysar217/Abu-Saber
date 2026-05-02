
"use client"

import { useMemo } from "react"
import { BottomNav } from "@/components/layout/BottomNav"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Filter, FileText, Download, TrendingUp, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, orderBy } from "firebase/firestore"

export default function ReportsPage() {
  const { user } = useUser()
  const db = useFirestore()

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
    <div className="flex flex-col min-h-screen bg-background pb-20">
      <header className="p-6 bg-white border-b sticky top-0 z-10">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">التقارير المالية</h1>
          <Button variant="outline" size="icon" className="rounded-full">
            <Filter className="w-5 h-5" />
          </Button>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar" dir="rtl">
          {["اليوم", "الأسبوع", "الشهر", "٣ أشهر", "السنة"].map((period) => (
            <Button key={period} variant={period === 'الشهر' ? 'default' : 'secondary'} size="sm" className="rounded-full px-5 h-9 shrink-0 font-bold">
              {period}
            </Button>
          ))}
        </div>
      </header>

      <div className="p-4 space-y-6">
        <Card className="border-none shadow-md rounded-3xl overflow-hidden bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-muted-foreground flex items-center gap-2" dir="rtl">
              <TrendingUp className="w-4 h-4 text-primary" />
              نمو المبيعات (حسب البيانات المسجلة)
            </CardTitle>
          </CardHeader>
          <CardContent className="h-64 px-2">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fill: '#888', fontWeight: 'bold' }} 
                    dy={10}
                  />
                  <Tooltip 
                    cursor={{ fill: '#f8f8f8' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', textAlign: 'right' }}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} fill="hsl(var(--primary))">
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === chartData.length - 1 ? 'hsl(var(--primary))' : 'hsl(var(--secondary))'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-2 opacity-50">
                <TrendingUp className="w-10 h-10" />
                <p className="text-xs font-bold">لا توجد بيانات كافية لعرض المخطط</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <h3 className="text-lg font-black px-2 text-right">أدوات استخراج التقارير</h3>
          <div className="grid gap-3">
            {[
              { label: "كشف حساب العملاء (PDF/Excel)", icon: FileText },
              { label: "سجل المصاريف والتشغيل", icon: TrendingUp },
              { label: "جرد مبيعات الأصناف التفصيلي", icon: FileText },
            ].map((report, idx) => (
              <button key={idx} className="w-full flex items-center justify-between p-5 bg-white rounded-2xl border border-border/50 shadow-sm active:scale-95 transition-transform">
                 <Download className="w-4 h-4 text-muted-foreground" />
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold">{report.label}</span>
                  <div className="p-2 bg-primary/5 text-primary rounded-xl">
                    <report.icon className="w-5 h-5" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <Card className="border-none bg-orange-50/50 rounded-3xl border border-orange-100 p-6">
          <div className="flex flex-col items-center text-center gap-3">
            <AlertCircle className="w-8 h-8 text-orange-500" />
            <h4 className="font-black text-orange-900">تنبيه التقارير</h4>
            <p className="text-xs text-orange-700 font-bold leading-relaxed">
              هذه الصفحة تعرض تحليلات بناءً على العمليات التي تقوم بإدخالها يدوياً. تأكد من تسجيل كافة الفواتير والمصاريف للحصول على نتائج دقيقة.
            </p>
          </div>
        </Card>
      </div>
      <BottomNav />
    </div>
  )
}
