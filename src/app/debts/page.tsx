
"use client"

import { useState, useMemo } from "react"
import { Search, User, Phone, Wallet, ArrowDownToLine, ArrowUpFromLine, Loader2, MessageCircle } from "lucide-react"
import { BottomNav } from "@/components/layout/BottomNav"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useFirestore, useCollection, useUser, useMemoFirebase } from "@/firebase"
import { collection, query } from "firebase/firestore"
import { cn } from "@/lib/utils"

export default function DebtsPage() {
  const db = useFirestore()
  const { user } = useUser()
  const [searchTerm, setSearchTerm] = useState("")

  // Fetch all relevant collections
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

  // Calculate Customer Debts (Money owed to me)
  const customerDebts = useMemo(() => {
    if (!invoices || !customers) return []
    
    const debtsMap = new Map()
    invoices.forEach(inv => {
      const remaining = inv.remainingAmount || 0
      if (remaining > 0) {
        const current = debtsMap.get(inv.customerId) || 0
        debtsMap.set(inv.customerId, current + remaining)
      }
    })

    return Array.from(debtsMap.entries()).map(([customerId, amount]) => {
      const customer = customers.find(c => c.id === customerId)
      return {
        id: customerId,
        name: customer?.name || "عميل غير معروف",
        phone: customer?.phone || "",
        amount: amount
      }
    }).filter(d => d.name.toLowerCase().includes(searchTerm.toLowerCase()))
  }, [invoices, customers, searchTerm])

  // Calculate Supplier Debts (Money I owe)
  const supplierDebts = useMemo(() => {
    if (!purchases || !suppliers) return []
    
    const debtsMap = new Map()
    purchases.forEach(p => {
      const remaining = (p.totalAmount || 0) - (p.paidAmount || 0)
      if (remaining > 0) {
        const current = debtsMap.get(p.supplierId) || 0
        debtsMap.set(p.supplierId, current + remaining)
      }
    })

    return Array.from(debtsMap.entries()).map(([supplierId, amount]) => {
      const supplier = suppliers.find(s => s.id === supplierId)
      return {
        id: supplierId,
        name: supplier?.name || "مورد غير معروف",
        phone: supplier?.phone || "",
        amount: amount
      }
    }).filter(d => d.name.toLowerCase().includes(searchTerm.toLowerCase()))
  }, [purchases, suppliers, searchTerm])

  const totalCustomerDebts = customerDebts.reduce((acc, curr) => acc + curr.amount, 0)
  const totalSupplierDebts = supplierDebts.reduce((acc, curr) => acc + curr.amount, 0)

  const isLoading = !invoices || !purchases

  return (
    <div className="flex flex-col min-h-screen bg-background pb-24">
      <header className="p-6 bg-white border-b sticky top-0 z-30 shadow-sm">
        <h1 className="text-2xl font-black text-primary mb-4">إدارة الديون</h1>
        <div className="relative group">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input 
            placeholder="بحث عن اسم..." 
            className="pr-11 h-12 rounded-2xl bg-muted/50 border-none focus-visible:ring-primary focus-visible:bg-white transition-all shadow-inner" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </header>

      <div className="p-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-20 gap-3">
            <Loader2 className="w-10 h-10 animate-spin text-primary opacity-50" />
            <p className="text-xs font-bold text-muted-foreground">جاري حساب الديون...</p>
          </div>
        ) : (
          <Tabs defaultValue="customers" className="w-full" dir="rtl">
            <TabsList className="grid w-full grid-cols-2 h-16 rounded-2xl p-1.5 mb-6 bg-muted/50 border border-border/50 shadow-inner">
              <TabsTrigger 
                value="customers" 
                className="rounded-xl font-black text-xs transition-all data-[state=active]:bg-gradient-to-br data-[state=active]:from-[#123524] data-[state=active]:to-[#236045] data-[state=active]:text-white data-[state=active]:shadow-lg"
              >
                ديون لك (عملاء)
              </TabsTrigger>
              <TabsTrigger 
                value="suppliers" 
                className="rounded-xl font-black text-xs transition-all data-[state=active]:bg-gradient-to-br data-[state=active]:from-[#123524] data-[state=active]:to-[#236045] data-[state=active]:text-white data-[state=active]:shadow-lg"
              >
                ديون عليك (موردين)
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="customers" className="space-y-4 outline-none animate-in fade-in duration-300">
              <div className="p-6 bg-green-50 text-green-700 rounded-[2rem] border border-green-100 flex items-center justify-between shadow-sm">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">إجمالي مستحقاتك</p>
                  <span className="text-2xl font-black tabular-nums">{totalCustomerDebts.toLocaleString('en-US')} ر.ي</span>
                </div>
                <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-md text-green-600">
                  <ArrowDownToLine className="w-7 h-7" />
                </div>
              </div>

              {customerDebts.length > 0 ? (
                customerDebts.map((c) => (
                  <div key={c.id} className="flex justify-between items-center p-5 bg-white rounded-[2rem] border border-border/40 shadow-sm active:scale-[0.98] transition-all group">
                    {/* جهة اليمين: الاسم والأيقونة */}
                    <div className="flex gap-4 items-center">
                      <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                        <User className="w-6 h-6" />
                      </div>
                      <div className="flex flex-col text-right">
                        <span className="font-black text-sm">{c.name}</span>
                        <div className="flex items-center gap-2 mt-1">
                           <Phone className="w-3 h-3 text-muted-foreground" />
                           <span className="text-[10px] font-bold text-muted-foreground">{c.phone || "بدون رقم"}</span>
                        </div>
                      </div>
                    </div>

                    {/* جهة اليسار: المبلغ والاتصال */}
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-lg font-black text-green-600 tabular-nums">{c.amount.toLocaleString('en-US')} ر.ي</span>
                      <button 
                        onClick={() => window.open(`tel:${c.phone}`, '_self')}
                        className="text-[10px] text-primary font-black flex items-center gap-1 hover:underline transition-all"
                      >
                        اتصال الآن
                        <MessageCircle className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-20 text-muted-foreground border-2 border-dashed rounded-[3rem] space-y-2">
                  <p className="font-black">لا توجد ديون مستحقة</p>
                  <p className="text-[10px] opacity-60">جميع العملاء قاموا بالسداد الكامل</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="suppliers" className="space-y-4 outline-none animate-in fade-in duration-300">
              <div className="p-6 bg-red-50 text-red-700 rounded-[2rem] border border-red-100 flex items-center justify-between shadow-sm">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">إجمالي ديونك للموردين</p>
                  <span className="text-2xl font-black tabular-nums">{totalSupplierDebts.toLocaleString('en-US')} ر.ي</span>
                </div>
                <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-md text-red-600">
                  <ArrowUpFromLine className="w-7 h-7" />
                </div>
              </div>

              {supplierDebts.length > 0 ? (
                supplierDebts.map((s) => (
                  <div key={s.id} className="flex justify-between items-center p-5 bg-white rounded-[2rem] border border-border/40 shadow-sm active:scale-[0.98] transition-all group">
                    {/* جهة اليمين: الاسم والأيقونة */}
                    <div className="flex gap-4 items-center">
                      <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center text-red-500 shadow-inner">
                        <Wallet className="w-6 h-6" />
                      </div>
                      <div className="flex flex-col text-right">
                        <span className="font-black text-sm">{s.name}</span>
                        <span className="text-[10px] text-muted-foreground font-bold">مورد معتمد</span>
                      </div>
                    </div>

                    {/* جهة اليسار: المبلغ والوصف */}
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-lg font-black text-red-600 tabular-nums">{s.amount.toLocaleString('en-US')} ر.ي</span>
                      <span className="text-[10px] text-muted-foreground font-bold italic">باقي حساب مشتريات</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-20 text-muted-foreground border-2 border-dashed rounded-[3rem] space-y-2">
                  <p className="font-black">لا توجد ديون عليك</p>
                  <p className="text-[10px] opacity-60">لقد قمت بسداد كافة التزاماتك للموردين</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
      <BottomNav />
    </div>
  )
}
