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
  LayoutDashboard, 
  Calendar,
  Receipt,
  ShoppingCart,
  ChevronLeft,
  Ship
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query } from "firebase/firestore"
import { format, startOfMonth, subMonths, isSameMonth } from "date-fns"
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
  const invoicesQuery = useMemoFirebase(() => user ? collection(db!, "users", user.uid, "invoices") : null, [db, user])
  const purchasesQuery = useMemoFirebase(() => user ? collection(db!, "users", user.uid, "purchases") : null, [db, user])
  const expensesQuery = useMemoFirebase(() => user ? collection(db!, "users", user.uid, "expenses") : null, [db, user])
  const customersQuery = useMemoFirebase(() => user ? collection(db!, "users", user.uid, "customers") : null, [db, user])
  const suppliersQuery = useMemoFirebase(() => user ? collection(db!, "users", user.uid, "suppliers") : null, [db, user])

  const { data: invoices } = useCollection(invoicesQuery)
  const { data: purchases } = useCollection(purchasesQuery)
  const { data: expenses } = useCollection(expensesQuery)
  const { data: customers } = useCollection(customersQuery)
  const { data: suppliers } = useCollection(suppliersQuery)

  // Real Monthly Profit Growth Logic
  const monthlyProfitData = useMemo(() => {
    if (!invoices || !purchases || !expenses) return []

    const last6Months = Array.from({ length: 6 }).map((_, i) => {
      const monthDate = subMonths(new Date(), 5 - i)
      return {
        date: monthDate,
        name: format(monthDate, "MMM", { locale: ar }),
        profit: 0
      }
    })

    last6Months.forEach(month => {
      const mInvoices = invoices.filter(inv => isSameMonth(new Date(inv.invoiceDate), month.date))
      const mPurchases = purchases.filter(p => isSameMonth(new Date(p.purchaseDate), month.date))
      const mExpenses = expenses.filter(e => isSameMonth(new Date(e.expenseDate), month.date))

      const revenue = mInvoices.reduce((acc, inv) => acc + (inv.totalAmount || 0), 0)
      const costs = mPurchases.reduce((acc, p) => acc + (p.totalAmount || 0), 0) + mExpenses.reduce((acc, e) => acc + (e.amount || 0), 0)
      
      month.profit = revenue - costs
    })

    return last6Months
  }, [invoices, purchases, expenses])

  // Real Customer Debt Concentration
  const customerDebtsData = useMemo(() => {
    if (!invoices || !customers) return []
    
    const debtorList = customers.map(c => {
      const debt = invoices.filter(inv => inv.customerId === c.id).reduce((acc, inv) => acc + (inv.remainingAmount || 0), 0)
      return { name: c.name, value: debt }
    }).filter(d => d.value > 0).sort((a, b) => b.value - a.value).slice(0, 5)

    return debtorList
  }, [invoices, customers])

  // Real Supplier Debt Concentration
  const supplierDebtsData = useMemo(() => {
    if (!purchases || !expenses || !suppliers) return []

    const creditorList = suppliers.map(s => {
      const pDebt = purchases.filter(p => p.supplierId === s.id).reduce((acc, p) => acc + (p.remainingAmount || 0), 0)
      const eDebt = expenses.filter(e => e.payeeId === s.id).reduce((acc, e) => acc + (e.remainingAmount || 0), 0)
      return { name: s.name, value: pDebt + eDebt }
    }).filter(d => d.value > 0).sort((a, b) => b.value - a.value).slice(0, 5)

    return creditorList
  }, [purchases, expenses, suppliers])

  const isLoading = !invoices || !purchases || !expenses

  const hasPerformanceData = monthlyProfitData.some(d => d.profit !== 0)
  const hasDebtData = customerDebtsData.length > 0 || supplierDebtsData.length > 0

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
            <Loader2 className="w-12 h-12 animate-spin mb-2" />
            <p className="font-bold">جاري تحليل البيانات الفعلية...</p>
          </div>
        ) : activeView === "performance" ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {!hasPerformanceData ? (
              <Card className="border-none shadow-md rounded-[2.5rem] p-12 flex flex-col items-center text-center gap-4 bg-white/50 border-2 border-dashed">
                <TrendingUp className="w-16 h-16 text-muted-foreground/20" />
                <div className="space-y-1">
                  <p className="font-black text-muted-foreground">لا توجد بيانات نمو حالياً</p>
                  <p className="text-[10px] text-muted-foreground/60 font-bold">ابدأ بتسجيل المبيعات والمشتريات لعرض منحنى الأرباح</p>
                </div>
              </Card>
            ) : (
              <Card className="border-none shadow-xl rounded-[2.5rem] overflow-hidden bg-white">
                <CardHeader className="p-6 pb-2 text-right">
                  <CardTitle className="text-sm font-black text-primary flex items-center justify-start gap-2" dir="rtl">
                    <TrendingUp className="w-5 h-5 text-accent" />
                    منحنى نمو الأرباح الصافي (6 شهور)
                  </CardTitle>
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
            )}
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {!hasDebtData ? (
              <Card className="border-none shadow-md rounded-[2.5rem] p-12 flex flex-col items-center text-center gap-4 bg-white/50 border-2 border-dashed">
                <Banknote className="w-16 h-16 text-muted-foreground/20" />
                <div className="space-y-1">
                  <p className="font-black text-muted-foreground">سجل الديون فارغ</p>
                  <p className="text-[10px] text-muted-foreground/60 font-bold">لا يوجد مبالغ مستحقة للتحصيل أو السداد حالياً</p>
                </div>
              </Card>
            ) : (
              <>
                {customerDebtsData.length > 0 && (
                  <Card className="border-none shadow-xl rounded-[2rem] overflow-hidden bg-white">
                    <CardHeader className="p-6 pb-2 text-right border-b border-green-50">
                      <CardTitle className="text-sm font-black text-green-700 flex items-center justify-start gap-2" dir="rtl">
                        <Users className="w-5 h-5" />
                        أكبر مدينين لك (تحصيل مالي)
                      </CardTitle>
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
                )}

                {supplierDebtsData.length > 0 && (
                  <Card className="border-none shadow-xl rounded-[2rem] overflow-hidden bg-white">
                    <CardHeader className="p-6 pb-2 text-right border-b border-orange-50">
                      <CardTitle className="text-sm font-black text-orange-700 flex items-center justify-start gap-2" dir="rtl">
                        <ShoppingBag className="w-5 h-5" />
                        مديونياتك للموردين (سداد آجـل)
                      </CardTitle>
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
                )}
              </>
            )}
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
      </main>
      <BottomNav />
    </div>
  )
}
