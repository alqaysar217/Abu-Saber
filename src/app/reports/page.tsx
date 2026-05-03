"use client"

import { useMemo, useState } from "react"
import { BottomNav } from "@/components/layout/BottomNav"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, BarChart, Bar } from 'recharts'
import { 
  TrendingUp, 
  AlertCircle, 
  Banknote, 
  PieChart, 
  Users, 
  ShoppingBag, 
  Ship, 
  LayoutDashboard, 
  Calendar,
  Receipt,
  ShoppingCart,
  ChevronLeft,
  ArrowRight
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, orderBy } from "firebase/firestore"
import { format } from "date-fns"
import { ar } from "date-fns/locale"
import { cn } from "@/lib/utils"
import Link from "next/link"

const reportTools = [
  { label: "كشف حساب العملاء", icon: Users, href: "/admin/all-debts", color: "bg-green-600", desc: "مطالبة الديون ومتابعة التحصيل" },
  { label: "سجل المصروفات", icon: ShoppingCart, href: "/admin/expenses", color: "bg-accent", desc: "تحليل تكاليف التشغيل اليومية" },
  { label: "جرد المبيعات", icon: Receipt, href: "/admin/sales", color: "bg-primary", desc: "مراجعة كافة الفواتير الصادرة" },
  { label: "سجل المشتريات", icon: ShoppingBag, href: "/admin/purchases", color: "bg-orange-600", desc: "توثيق التوريدات من الموردين" },
]

export default function ReportsPage() {
  const { user } = useUser()
  const db = useFirestore()
  const [activeView, setActiveView] = useState<"performance" | "debts">("performance")

  // Data Subscriptions
  const campaignsQuery = useMemoFirebase(() => {
    if (!db || !user) return null
    return query(collection(db, "users", user.uid, "campaigns"))
  }, [db, user])
  const { data: campaigns } = useCollection(campaignsQuery)

  const invoicesQuery = useMemoFirebase(() => {
    if (!db || !user) return null
    return query(collection(db, "users", user.uid, "invoices"))
  }, [db, user])
  const { data: invoices } = useCollection(invoicesQuery)

  // Monthly Profit Growth Logic (Demo for Visualization)
  const monthlyProfitData = useMemo(() => {
    return [
      { name: 'يناير', profit: 12500000 },
      { name: 'فبراير', profit: 18900000 },
      { name: 'مارس', profit: 14200000 },
      { name: 'أبريل', profit: 24500000 },
      { name: 'مايو', profit: 31000000 },
      { name: 'يونيو', profit: 42800000 },
    ]
  }, [])

  // Customer Debt Concentration (Demo Fallback)
  const customerDebtsData = useMemo(() => {
    return [
      { name: 'مطعم السلمون', value: 8500000 },
      { name: 'شركة التوريد', value: 6200000 },
      { name: 'فندق الخليج', value: 4800000 },
      { name: 'أسماك الطازج', value: 3100000 },
      { name: 'مطعم الشاطئ', value: 1200000 },
    ]
  }, [])

  // Supplier Debt Concentration (Demo Fallback)
  const supplierDebtsData = useMemo(() => {
    return [
      { name: 'مصنع الثلج', value: 5400000 },
      { name: 'محطة بترول', value: 3200000 },
      { name: 'مورد الرئيسي', value: 2800000 },
      { name: 'ورشة صيانة', value: 950000 },
      { name: 'شركة أكياس', value: 450000 },
    ]
  }, [])

  const isLoading = !campaigns || !invoices

  return (
    <div className="flex flex-col min-h-screen bg-background pb-32">
      <header className="p-6 bg-white border-b sticky top-0 z-20 shadow-sm space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-black text-primary">مركز التحليلات المالي</h1>
          <div className="p-2 bg-primary/5 rounded-xl text-primary">
            <PieChart className="w-6 h-6" />
          </div>
        </div>
        
        <div className="flex gap-2 p-1 bg-muted/50 rounded-2xl border" dir="rtl">
          <Button 
            variant="ghost" 
            onClick={() => setActiveView("performance")}
            className={cn(
              "flex-1 h-11 rounded-xl font-black text-xs transition-all",
              activeView === "performance" ? "lux-gradient text-white shadow-lg" : "text-muted-foreground"
            )}
          >
            <TrendingUp className="w-4 h-4 ml-2" />
            نمو الأرباح
          </Button>
          <Button 
            variant="ghost" 
            onClick={() => setActiveView("debts")}
            className={cn(
              "flex-1 h-11 rounded-xl font-black text-xs transition-all",
              activeView === "debts" ? "lux-gradient text-white shadow-lg" : "text-muted-foreground"
            )}
          >
            <Banknote className="w-4 h-4 ml-2" />
            تـوزع الـديـون
          </Button>
        </div>
      </header>

      <main className="p-4 space-y-8">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 opacity-30">
            <TrendingUp className="w-12 h-12 animate-pulse mb-2" />
            <p className="font-bold">جاري تحليل البيانات...</p>
          </div>
        ) : activeView === "performance" ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <Card className="border-none shadow-xl rounded-[2.5rem] overflow-hidden bg-white">
              <CardHeader className="p-6 pb-2 text-right">
                <CardTitle className="text-sm font-black text-primary flex items-center justify-start gap-2" dir="rtl">
                  <TrendingUp className="w-5 h-5 text-accent" />
                  منحنى نمو الأرباح الصافي
                </CardTitle>
                <p className="text-[10px] text-muted-foreground font-bold italic">ملاحظة: تظهر بيانات تجريبية لتوضيح شكل المنحنى</p>
              </CardHeader>
              <CardContent className="h-80 p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyProfitData} margin={{ top: 20, right: 30, left: 10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold', fill: '#666' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#999' }} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', textAlign: 'right', direction: 'rtl' }}
                      formatter={(value: any) => [value.toLocaleString() + " ر.ي", "صافي الربح"]}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="profit" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={4}
                      fillOpacity={1} 
                      fill="url(#colorProfit)" 
                      animationDuration={1500}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-4">
              <Card className="border-none shadow-md rounded-[1.5rem] bg-green-50 text-green-700">
                <CardContent className="p-5 flex flex-col gap-1 items-center text-center">
                  <LayoutDashboard className="w-5 h-5 mb-1 opacity-60" />
                  <span className="text-[9px] font-black uppercase">أداء المبيعات</span>
                  <span className="text-sm font-black tabular-nums">ممتاز</span>
                </CardContent>
              </Card>
              <Card className="border-none shadow-md rounded-[1.5rem] bg-primary text-white">
                <CardContent className="p-5 flex flex-col gap-1 items-center text-center">
                  <Calendar className="w-5 h-5 mb-1 opacity-60" />
                  <span className="text-[9px] font-black uppercase">الشهور المكتملة</span>
                  <span className="text-sm font-black tabular-nums">6 شهور</span>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {/* تحليل ديون العملاء */}
            <Card className="border-none shadow-xl rounded-[2rem] overflow-hidden bg-white">
              <CardHeader className="p-6 pb-2 text-right border-b border-green-50">
                <CardTitle className="text-sm font-black text-green-700 flex items-center justify-start gap-2" dir="rtl">
                  <Users className="w-5 h-5" />
                  أكبر 5 مدينين لك (عملاء)
                </CardTitle>
                <p className="text-[10px] text-muted-foreground font-bold">العملاء الذين لديهم أكبر أرصدة آجلة</p>
              </CardHeader>
              <CardContent className="h-72 p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={customerDebtsData} margin={{ top: 20, right: 10, left: 10, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fontWeight: '900', fill: '#123524' }}
                      interval={0}
                      angle={-35}
                      textAnchor="end"
                      height={50}
                    />
                    <YAxis hide />
                    <Tooltip cursor={{fill: 'rgba(0,0,0,0.03)'}} contentStyle={{ borderRadius: '12px', textAlign: 'right' }} formatter={(v) => v.toLocaleString() + " ر.ي"} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={35}>
                      {customerDebtsData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={index === 0 ? '#123524' : '#236045cc'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* تحليل ديون الموردين */}
            <Card className="border-none shadow-xl rounded-[2rem] overflow-hidden bg-white">
              <CardHeader className="p-6 pb-2 text-right border-b border-orange-50">
                <CardTitle className="text-sm font-black text-orange-700 flex items-center justify-start gap-2" dir="rtl">
                  <ShoppingBag className="w-5 h-5" />
                  أكبر مديونياتك لـ (موردين)
                </CardTitle>
                <p className="text-[10px] text-muted-foreground font-bold">الجهات المستحقة للسداد الآجل</p>
              </CardHeader>
              <CardContent className="h-72 p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={supplierDebtsData} margin={{ top: 20, right: 10, left: 10, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fontWeight: '900', fill: '#ea580c' }}
                      interval={0}
                      angle={-35}
                      textAnchor="end"
                      height={50}
                    />
                    <YAxis hide />
                    <Tooltip cursor={{fill: 'rgba(0,0,0,0.03)'}} contentStyle={{ borderRadius: '12px', textAlign: 'right' }} formatter={(v) => v.toLocaleString() + " ر.ي"} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={35}>
                      {supplierDebtsData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={index === 0 ? '#ea580c' : '#f97316cc'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        )}

        {/* قسم الخيارات والأدوات التفصيلية */}
        <section className="space-y-4">
          <h2 className="text-lg font-black text-primary px-2 flex items-center gap-2" dir="rtl">
            <LayoutDashboard className="w-5 h-5" />
            أدوات وتقارير تفصيلية
          </h2>
          <div className="grid grid-cols-1 gap-3">
            {reportTools.map((tool) => (
              <Link key={tool.label} href={tool.href}>
                <Card className="border border-border/60 shadow-sm rounded-2xl hover:bg-muted/30 transition-all active:scale-[0.98] overflow-hidden">
                  <CardContent className="p-4 flex items-center justify-between" dir="rtl">
                    <div className="flex items-center gap-4">
                      <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-md", tool.color)}>
                        <tool.icon className="w-6 h-6" />
                      </div>
                      <div className="flex flex-col text-right">
                        <span className="text-sm font-black text-foreground">{tool.label}</span>
                        <span className="text-[10px] text-muted-foreground font-bold">{tool.desc}</span>
                      </div>
                    </div>
                    <ChevronLeft className="w-5 h-5 text-muted-foreground/30" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>

        {/* رسالة توضيحية */}
        <Card className="border-none bg-orange-50 rounded-[2rem] border border-orange-100 p-6 shadow-inner">
          <div className="flex flex-col items-center text-center gap-3">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-orange-500 shadow-sm">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h4 className="font-black text-orange-900">نظام محاكاة البيانات</h4>
            <p className="text-[11px] text-orange-800 font-bold leading-relaxed px-4">
              الرسومات المعروضة حالياً تستخدم بيانات تجريبية ممتدة لـ 6 أشهر لتوضيح الشكل النهائي. ستختفي هذه البيانات وتظهر أرقامك الحقيقية بمجرد بدئك في تسجيل العمليات.
            </p>
          </div>
        </Card>
      </main>
      <BottomNav />
    </div>
  )
}
