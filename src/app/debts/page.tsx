
"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { 
  Search, 
  User, 
  Phone, 
  Wallet, 
  ArrowDownToLine, 
  ArrowUpFromLine, 
  Loader2, 
  ChevronLeft, 
  X, 
  Calendar, 
  Ship, 
  Receipt, 
  ShoppingBag,
  Info,
  Fish,
  ExternalLink,
  ChevronRight
} from "lucide-react"
import { BottomNav } from "@/components/layout/BottomNav"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useFirestore, useCollection, useUser, useMemoFirebase } from "@/firebase"
import { collection, query, where } from "firebase/firestore"
import { cn } from "@/lib/utils"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { ar } from "date-fns/locale"

export default function DebtsPage() {
  const router = useRouter()
  const db = useFirestore()
  const { user } = useUser()
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedEntity, setSelectedEntity] = useState<{ id: string, name: string, type: 'customer' | 'supplier' } | null>(null)

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
    if (!purchases || !suppliers || !expenses) return []
    
    const debtsMap = new Map()
    
    purchases.forEach(p => {
      const remaining = (p.totalAmount || 0) - (p.paidAmount || 0)
      if (remaining > 0 && p.supplierId) {
        const current = debtsMap.get(p.supplierId) || 0
        debtsMap.set(p.supplierId, current + remaining)
      }
    })

    expenses.forEach(e => {
      const remaining = e.remainingAmount || 0
      if (remaining > 0 && e.payeeId) {
        const current = debtsMap.get(e.payeeId) || 0
        debtsMap.set(e.payeeId, current + remaining)
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
  }, [purchases, suppliers, expenses, searchTerm])

  const totalCustomerDebts = customerDebts.reduce((acc, curr) => acc + curr.amount, 0)
  const totalSupplierDebts = supplierDebts.reduce((acc, curr) => acc + curr.amount, 0)

  const isLoading = !invoices || !purchases || !campaigns || !expenses

  // Filter specific transactions for the selected person
  const entityTransactions = useMemo(() => {
    if (!selectedEntity) return []

    if (selectedEntity.type === 'customer') {
      return (invoices || [])
        .filter(inv => inv.customerId === selectedEntity.id && (inv.remainingAmount || 0) > 0)
        .map(tr => ({ ...tr, trType: 'sale' }))
        .sort((a, b) => new Date(b.invoiceDate || 0).getTime() - new Date(a.invoiceDate || 0).getTime())
    } else {
      const trs = []
      
      const relevantPurchases = (purchases || [])
        .filter(p => p.supplierId === selectedEntity.id && ((p.totalAmount || 0) - (p.paidAmount || 0)) > 0)
        .map(tr => ({ ...tr, trType: 'purchase' }))
      trs.push(...relevantPurchases)

      const relevantExpenses = (expenses || [])
        .filter(e => e.payeeId === selectedEntity.id && (e.remainingAmount || 0) > 0)
        .map(tr => ({ ...tr, trType: 'expense' }))
      trs.push(...relevantExpenses)

      return trs.sort((a, b) => new Date(b.purchaseDate || b.expenseDate || b.createdAt || 0).getTime() - new Date(a.purchaseDate || a.expenseDate || a.createdAt || 0).getTime())
    }
  }, [selectedEntity, invoices, purchases, expenses])

  const handleTransactionClick = (tr: any) => {
    let tab = "overview"
    if (tr.trType === 'sale') tab = "sales"
    if (tr.trType === 'purchase') tab = "purchases"
    if (tr.trType === 'expense') tab = "expenses"

    router.push(`/campaigns/${tr.campaignId}?tab=${tab}`)
  }

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
            <TabsList className="grid w-full grid-cols-2 h-16 rounded-2xl p-1.5 mb-6 bg-muted/50 border border-border/50 shadow-inner overflow-hidden">
              <TabsTrigger 
                value="customers" 
                className="rounded-xl font-black text-xs h-full flex items-center justify-center transition-all data-[state=active]:bg-gradient-to-br data-[state=active]:from-[#123524] data-[state=active]:to-[#236045] data-[state=active]:text-white data-[state=active]:shadow-lg"
              >
                ديون لك (عملاء)
              </TabsTrigger>
              <TabsTrigger 
                value="suppliers" 
                className="rounded-xl font-black text-xs h-full flex items-center justify-center transition-all data-[state=active]:bg-gradient-to-br data-[state=active]:from-[#123524] data-[state=active]:to-[#236045] data-[state=active]:text-white data-[state=active]:shadow-lg"
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
                  <div 
                    key={c.id} 
                    onClick={() => setSelectedEntity({ id: c.id, name: c.name, type: 'customer' })}
                    className="flex justify-between items-center p-5 bg-white rounded-[2rem] border border-border/40 shadow-sm active:scale-[0.98] transition-all group cursor-pointer"
                  >
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

                    <div className="flex flex-col items-end gap-1">
                      <span className="text-lg font-black text-green-600 tabular-nums">{c.amount.toLocaleString('en-US')} ر.ي</span>
                      <div className="text-[9px] text-primary font-black flex items-center gap-1">
                        عرض التفاصيل
                        <ChevronLeft className="w-3 h-3" />
                      </div>
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
                  <div 
                    key={s.id} 
                    onClick={() => setSelectedEntity({ id: s.id, name: s.name, type: 'supplier' })}
                    className="flex justify-between items-center p-5 bg-white rounded-[2rem] border border-border/40 shadow-sm active:scale-[0.98] transition-all group cursor-pointer"
                  >
                    <div className="flex gap-4 items-center">
                      <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center text-red-500 shadow-inner">
                        <Wallet className="w-6 h-6" />
                      </div>
                      <div className="flex flex-col text-right">
                        <span className="font-black text-sm">{s.name}</span>
                        <span className="text-[10px] text-muted-foreground font-bold">مورد معتمد</span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <span className="text-lg font-black text-red-600 tabular-nums">{s.amount.toLocaleString('en-US')} ر.ي</span>
                      <div className="text-[9px] text-primary font-black flex items-center gap-1">
                        عرض التفاصيل
                        <ChevronLeft className="w-3 h-3" />
                      </div>
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

      <Sheet open={!!selectedEntity} onOpenChange={() => setSelectedEntity(null)}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-[3rem] p-0 overflow-hidden border-none shadow-2xl [&>button]:hidden">
          <SheetHeader className="p-6 bg-primary text-white relative">
            <button 
              onClick={() => setSelectedEntity(null)}
              className="absolute left-6 top-6 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
            <div className="flex flex-col gap-1 items-end mt-4">
              <SheetTitle className="text-xl font-black text-white">{selectedEntity?.name}</SheetTitle>
              <p className="text-xs text-white/70 font-bold">كشف العمليات غير المسددة</p>
            </div>
          </SheetHeader>

          <div className="h-full overflow-y-auto p-4 space-y-4 pb-20 bg-muted/20" dir="rtl">
            {entityTransactions.length > 0 ? (
              entityTransactions.map((tr: any) => {
                const campaign = campaigns?.find(c => c.id === tr.campaignId)
                const date = tr.invoiceDate || tr.purchaseDate || tr.expenseDate || (tr.createdAt?.toDate ? tr.createdAt.toDate() : tr.createdAt)
                const remaining = (tr.trType === 'sale' || tr.trType === 'expense')
                  ? tr.remainingAmount 
                  : (tr.totalAmount - tr.paidAmount)

                return (
                  <div 
                    key={tr.id} 
                    onClick={() => handleTransactionClick(tr)}
                    className="p-5 bg-white rounded-[2rem] border border-border/50 shadow-sm space-y-4 active:scale-[0.98] transition-all cursor-pointer hover:border-primary/30 group"
                  >
                    <div className="flex justify-between items-start border-b border-border/40 pb-3">
                      <div className="flex flex-col gap-1 items-start">
                        <div className="flex items-center gap-1.5 text-primary">
                          <Ship className="w-3.5 h-3.5" />
                          <span className="text-xs font-black">{campaign?.name || "حملة غير معروفة"}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          <span className="text-[10px] font-bold">
                            {date ? format(new Date(date), "dd MMM yyyy", { locale: ar }) : "بدون تاريخ"}
                          </span>
                        </div>
                      </div>
                      <Badge className={cn(
                        "rounded-xl px-2 py-0.5 text-[9px] font-black border-none",
                        tr.trType === 'sale' ? "bg-green-50 text-green-600" : (tr.trType === 'purchase' ? "bg-orange-50 text-orange-600" : "bg-accent/10 text-accent")
                      )}>
                        {tr.trType === 'sale' ? (
                          <span className="flex items-center gap-1"><Receipt className="w-3 h-3" /> مبيعات</span>
                        ) : tr.trType === 'purchase' ? (
                          <span className="flex items-center gap-1"><ShoppingBag className="w-3 h-3" /> مشتريات</span>
                        ) : (
                          <span className="flex items-center gap-1"><Wallet className="w-3 h-3" /> مصروف: {tr.type}</span>
                        )}
                      </Badge>
                    </div>

                    {(tr.items && tr.items.length > 0) && (
                      <div className="space-y-2">
                        <p className="text-[10px] font-bold text-muted-foreground flex items-center gap-1 justify-start">
                          <Fish className="w-3 h-3" />
                          الأصناف المسجلة
                        </p>
                        <div className="flex flex-wrap gap-2 justify-start">
                          {tr.items.map((item: any, idx: number) => (
                            <div key={idx} className="bg-muted/50 px-2.5 py-1 rounded-lg border border-border/40">
                              <span className="text-[10px] font-bold">{item.fishType} ({item.quantity} كجم)</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {tr.trType === 'expense' && tr.notes && (
                      <p className="text-[10px] text-muted-foreground text-right italic">"{tr.notes}"</p>
                    )}

                    <div className="grid grid-cols-2 gap-3 pt-2">
                       <div className="bg-muted/30 p-3 rounded-2xl flex flex-col items-center gap-1">
                          <span className="text-[9px] font-bold text-muted-foreground">المبلغ المدفوع</span>
                          <span className="text-sm font-black tabular-nums">{tr.paidAmount?.toLocaleString()}</span>
                       </div>
                       <div className="bg-muted/30 p-3 rounded-2xl flex flex-col items-center gap-1">
                          <span className="text-[9px] font-bold text-muted-foreground">إجمالي القيمة</span>
                          <span className="text-sm font-black tabular-nums">{(tr.totalAmount || tr.amount)?.toLocaleString()}</span>
                       </div>
                    </div>

                    <div className={cn(
                      "p-4 rounded-2xl flex justify-between items-center shadow-inner",
                      selectedEntity?.type === 'customer' ? "bg-green-50/50" : "bg-red-50/50"
                    )}>
                      <span className={cn(
                        "text-[11px] font-black",
                        selectedEntity?.type === 'customer' ? "text-green-700" : "text-red-700"
                      )}>المبلغ المتبقي</span>
                      <div className="flex items-center gap-2">
                         <span className="text-lg font-black tabular-nums text-foreground">{remaining.toLocaleString()} ر.ي</span>
                         <ChevronLeft className="w-4 h-4 text-primary" />
                      </div>
                    </div>
                    <p className="text-[9px] text-center font-bold text-primary/60 opacity-0 group-hover:opacity-100 transition-opacity">اضغط للانتقال لتفاصيل الحملة</p>
                  </div>
                )
              })
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center space-y-3 opacity-40">
                <Info className="w-12 h-12" />
                <p className="text-sm font-bold">لا توجد تفاصيل متاحة لهذه المديونية</p>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <BottomNav />
    </div>
  )
}
