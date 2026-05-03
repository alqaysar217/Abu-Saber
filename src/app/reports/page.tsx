
"use client"

import { useMemo, useState } from "react"
import { BottomNav } from "@/components/layout/BottomNav"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, BarChart, Bar } from 'recharts'
import { TrendingUp, AlertCircle, Banknote, PieChart, Users, ShoppingBag, Ship, LayoutDashboard, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, orderBy } from "firebase/firestore"
import { format } from "date-fns"
import { ar } from "date-fns/locale"
import { cn } from "@/lib/utils"

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

  const purchasesQuery = useMemoFirebase(() => {
    if (!db || !user) return null
    return query(collection(db, "users", user.uid, "purchases"))
  }, [db, user])
  const { data: purchases } = useCollection(purchasesQuery)

  const expensesQuery = useMemoFirebase(() => {
    if (!db || !user) return null
    return query(collection(db, "users", user.uid, "expenses"))
  }, [db, user])
  const { data: expenses } = useCollection(expensesQuery)

  const customersQuery = useMemoFirebase(() => {
    if (!db || !user) return null
    return query(collection(db, "users", user.uid, "customers"))
  }, [db, user])
  const { data: customers } = useCollection(customersQuery)

  const suppliersQuery = useMemoFirebase(() => {
    if (!db || !user) return null
    return query(collection(db, "users", user.uid, "suppliers"))
  }, [db, user])
  const { data: suppliers } = useCollection(suppliersQuery)

  // 1. Monthly Profit Growth Logic
  const monthlyProfitData = useMemo(() => {
    if (!invoices || !purchases || !expenses) return []
    
    const monthlyMap: Record<string, { sales: number, costs: number }> = {}
    
    const processItem = (dateSource: any, amount: number, isSale: boolean) => {
      if (!dateSource) return;
      const d = dateSource?.toDate ? dateSource.toDate() : new Date(dateSource);
      if (isNaN(d.getTime())) return;
      const key = format(d, 'yyyy-MM');
      if (!monthlyMap[key]) monthlyMap[key] = { sales: 0, costs: 0 };
      if (isSale) monthlyMap[key].sales += amount;
      else monthlyMap[key].costs += amount;
    }

    invoices.forEach(inv => processItem(inv.invoiceDate || inv.createdAt, inv.totalAmount || 0, true));
    purchases.forEach(p => processItem(p.purchaseDate || p.createdAt, p.totalAmount || 0, false));
    expenses.forEach(e => processItem(e.expenseDate || e.createdAt, e.amount || 0, false));

    return Object.entries(monthlyMap)
      .map(([key, data]) => ({
        key,
        name: format(new Date(key + '-01'), 'MMM yyyy', { locale: ar }),
        profit: data.sales - data.costs
      }))
      .sort((a, b) => a.key.localeCompare(b.key))
      .slice(-6); // Last 6 months
  }, [invoices, purchases, expenses])

  // 2. Customer Debt Concentration (Top 5 debtors)
  const customerDebtsData = useMemo(() => {
    if (!invoices || !customers) return []
    
    const debtMap: Record<string, number> = {}
    invoices.forEach(inv => {
      const remaining = inv.remainingAmount !== undefined ? inv.remainingAmount : ((inv.totalAmount || 0) - (inv.paidAmount || 0))
      if (remaining > 0) {
        debtMap[inv.customerId] = (debtMap[inv.customerId] || 0) + remaining
      }
    })

    return Object.entries(debtMap).map(([id, amount]) => {
      const cust = customers.find(c => c.id === id)
      return { name: cust?.name || "عميل غير معروف", value: amount }
    }).sort((a, b) => b.value - a.value).slice(0, 5)
  }, [invoices, customers])

  // 3. Supplier Debt Concentration (Top 5 to pay)
  const supplierDebtsData = useMemo(() => {
    if (!purchases || !expenses || !suppliers) return []
    
    const debtMap: Record<string, number> = {}
    
    purchases.forEach(p => {
      const remaining = p.remainingAmount !== undefined ? p.remainingAmount : ((p.totalAmount || 0) - (p.paidAmount || 0))
      if (remaining > 0) {
        debtMap[p.supplierId] = (debtMap[p.supplierId] || 0) + remaining
      }
    })

    expenses.forEach(e => {
      const remaining = e.remainingAmount || 0
      if (remaining > 0 && e.payeeId) {
        debtMap[e.payeeId] = (debtMap[e.payeeId] || 0) + remaining
      }
    })

    return Object.entries(debtMap).map(([id, amount]) => {
      const sup = suppliers.find(s => s.id === id)
      return { name: sup?.name || "مورد غير معروف", value: amount }
    }).sort((a, b) => b.value - a.value).slice(0, 5)
  }, [purchases, expenses, suppliers])

  const isLoading = !campaigns || !invoices

  return (
    <div className="flex flex-col min-h-screen bg-background pb-24">
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

      <main className="p-4 space-y-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 opacity-30">
            <TrendingUp className="w-12 h-12 animate-pulse mb-2" />
            <p className="font-bold">جاري تحليل البيانات الحية...</p>
          </div>
        ) : activeView === "performance" ? (
          <div className="space-y-6 animate-in fade-in duration-500">
            {/* بطاقة نمو الأرباح الشهرية */}
            <Card className="border-none shadow-xl rounded-[2rem] overflow-hidden bg-white">
              <CardHeader className="p-6 pb-2 text-right">
                <CardTitle className="text-sm font-black text-primary flex items-center justify-start gap-2" dir="rtl">
                  <TrendingUp className="w-5 h-5 text-accent" />
                  منحنى نمو الأرباح (شهرياً)
                </CardTitle>
                <p className="text-[10px] text-muted-foreground font-bold">صافي الربح الفعلي بعد خصم كافة التكاليف والمشتريات</p>
              </CardHeader>
              <CardContent className="h-80 p-4">
                {monthlyProfitData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlyProfitData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#999' }} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', textAlign: 'right' }}
                        formatter={(value: any) => [value.toLocaleString() + " ر.ي", "صافي الربح"]}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="profit" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={4}
                        fillOpacity={1} 
                        fill="url(#colorProfit)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground text-xs font-bold opacity-30">لا توجد بيانات كافية لتحليل الشهور</div>
                )}
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-4">
              <Card className="border-none shadow-md rounded-[1.5rem] bg-green-50 text-green-700">
                <CardContent className="p-5 flex flex-col gap-1 items-center text-center">
                  <LayoutDashboard className="w-5 h-5 mb-1 opacity-60" />
                  <span className="text-[9px] font-black uppercase">إجمالي مبيعاتك</span>
                  <span className="text-sm font-black tabular-nums">{invoices?.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0).toLocaleString()}</span>
                </CardContent>
              </Card>
              <Card className="border-none shadow-md rounded-[1.5rem] bg-primary text-white">
                <CardContent className="p-5 flex flex-col gap-1 items-center text-center">
                  <Calendar className="w-5 h-5 mb-1 opacity-60" />
                  <span className="text-[9px] font-black uppercase">الشهور النشطة</span>
                  <span className="text-sm font-black tabular-nums">{monthlyProfitData.length}</span>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in duration-500">
            {/* تحليل ديون العملاء */}
            <Card className="border-none shadow-xl rounded-[2rem] overflow-hidden bg-white">
              <CardHeader className="p-6 pb-2 text-right border-b border-green-50">
                <CardTitle className="text-sm font-black text-green-700 flex items-center justify-start gap-2" dir="rtl">
                  <Users className="w-5 h-5" />
                  أكبر 5 مدينين لك (عملاء)
                </CardTitle>
                <p className="text-[10px] text-muted-foreground font-bold">العملاء الذين لديهم أكبر أرصدة متبقية غير مسددة</p>
              </CardHeader>
              <CardContent className="h-64 p-4">
                {customerDebtsData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart layout="vertical" data={customerDebtsData} margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f5f5f5" />
                      <XAxis type="number" hide />
                      <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} width={80} />
                      <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '12px', textAlign: 'right' }} formatter={(v) => v.toLocaleString() + " ر.ي"} />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={25}>
                        {customerDebtsData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={index === 0 ? '#123524' : '#236045aa'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground text-xs font-bold opacity-30">لا توجد ديون عملاء حالية</div>
                )}
              </CardContent>
            </Card>

            {/* تحليل ديون الموردين */}
            <Card className="border-none shadow-xl rounded-[2rem] overflow-hidden bg-white">
              <CardHeader className="p-6 pb-2 text-right border-b border-orange-50">
                <CardTitle className="text-sm font-black text-orange-700 flex items-center justify-start gap-2" dir="rtl">
                  <ShoppingBag className="w-5 h-5" />
                  أكبر مديونياتك لـ (موردين/جهات)
                </CardTitle>
                <p className="text-[10px] text-muted-foreground font-bold">الجهات التي تطالبك بأكبر مبالغ سداد</p>
              </CardHeader>
              <CardContent className="h-64 p-4">
                {supplierDebtsData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart layout="vertical" data={supplierDebtsData} margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f5f5f5" />
                      <XAxis type="number" hide />
                      <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} width={80} />
                      <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '12px', textAlign: 'right' }} formatter={(v) => v.toLocaleString() + " ر.ي"} />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={25}>
                        {supplierDebtsData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={index === 0 ? '#ea580c' : '#f97316aa'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground text-xs font-bold opacity-30">لا توجد مديونيات موردين حالية</div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* رسالة توضيحية */}
        <Card className="border-none bg-orange-50 rounded-[2rem] border border-orange-100 p-6 shadow-inner">
          <div className="flex flex-col items-center text-center gap-3">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-orange-500 shadow-sm">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h4 className="font-black text-orange-900">ملاحظة محاسبية</h4>
            <p className="text-[11px] text-orange-800 font-bold leading-relaxed px-4">
              الرسوم البيانية تعتمد على بيانات "تاريخ الفاتورة". لضمان دقة تحليل النمو الشهري، احرص على تسجيل كل عملية في تاريخها الفعلي.
            </p>
          </div>
        </Card>
      </main>
      <BottomNav />
    </div>
  )
}
