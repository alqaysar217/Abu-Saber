
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
  ChevronRight,
  Banknote,
  CheckCircle2,
  Plus
} from "lucide-react"
import { BottomNav } from "@/components/layout/BottomNav"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useFirestore, useCollection, useUser, useMemoFirebase } from "@/firebase"
import { collection, query, where, doc, updateDoc, serverTimestamp } from "firebase/firestore"
import { cn } from "@/lib/utils"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { ar } from "date-fns/locale"
import { useToast } from "@/hooks/use-toast"
import { errorEmitter } from '@/firebase/error-emitter'
import { FirestorePermissionError } from '@/firebase/errors'

export default function DebtsPage() {
  const router = useRouter()
  const db = useFirestore()
  const { user } = useUser()
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedEntity, setSelectedEntity] = useState<{ id: string, name: string, type: 'customer' | 'supplier' } | null>(null)
  
  // Repayment State
  const [paymentTarget, setPaymentTarget] = useState<any>(null)
  const [paymentAmount, setPaymentAmount] = useState("")
  const [submittingPayment, setSubmittingPayment] = useState(false)

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
      const remaining = p.remainingAmount !== undefined ? p.remainingAmount : ((p.totalAmount || 0) - (p.paidAmount || 0))
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
        .filter(p => p.supplierId === selectedEntity.id && (p.remainingAmount !== undefined ? p.remainingAmount > 0 : ((p.totalAmount || 0) - (p.paidAmount || 0)) > 0))
        .map(tr => ({ 
          ...tr, 
          trType: 'purchase',
          remainingAmount: tr.remainingAmount !== undefined ? tr.remainingAmount : ((tr.totalAmount || 0) - (tr.paidAmount || 0))
        }))
      trs.push(...relevantPurchases)

      const relevantExpenses = (expenses || [])
        .filter(e => e.payeeId === selectedEntity.id && (e.remainingAmount || 0) > 0)
        .map(tr => ({ ...tr, trType: 'expense' }))
      trs.push(...relevantExpenses)

      return trs.sort((a, b) => new Date(b.purchaseDate || b.expenseDate || b.createdAt || 0).getTime() - new Date(a.purchaseDate || a.expenseDate || a.createdAt || 0).getTime())
    }
  }, [selectedEntity, invoices, purchases, expenses])

  const handleSettleDebt = async () => {
    if (!db || !user || !paymentTarget) return
    const amount = parseFloat(paymentAmount.replace(/,/g, ""))
    if (isNaN(amount) || amount <= 0 || amount > paymentTarget.remainingAmount) {
      toast({ variant: "destructive", title: "مبلغ السداد غير صالح", description: `يجب أن يكون المبلغ بين 1 و ${paymentTarget.remainingAmount.toLocaleString()}` })
      return
    }

    setSubmittingPayment(true)
    
    let collectionName = ""
    if (paymentTarget.trType === 'sale') collectionName = "invoices"
    else if (paymentTarget.trType === 'purchase') collectionName = "purchases"
    else if (paymentTarget.trType === 'expense') collectionName = "expenses"

    const docRef = doc(db, "users", user.uid, collectionName, paymentTarget.id)
    
    const newPaidAmount = (paymentTarget.paidAmount || 0) + amount
    const newRemainingAmount = paymentTarget.remainingAmount - amount
    const newStatus = newRemainingAmount <= 0 ? "مدفوعة" : "جزئي"

    const updateData = {
      paidAmount: newPaidAmount,
      remainingAmount: newRemainingAmount,
      status: newStatus,
      updatedAt: serverTimestamp()
    }

    updateDoc(docRef, updateData)
      .then(() => {
        toast({ title: "تم تسجيل السداد بنجاح" })
        setPaymentTarget(null)
        setPaymentAmount("")
      })
      .catch((err) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: docRef.path,
          operation: 'update',
          requestResourceData: updateData
        }))
      })
      .finally(() => setSubmittingPayment(false))
  }

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
            <TabsList className="grid w-full grid-cols-2 h-14 rounded-2xl p-1 mb-6 bg-muted/50 border border-border/50 shadow-inner">
              <TabsTrigger 
                value="customers" 
                className="rounded-xl font-black text-xs h-full transition-all data-[state=active]:bg-gradient-to-br data-[state=active]:from-[#123524] data-[state=active]:to-[#236045] data-[state=active]:text-white data-[state=active]:shadow-lg"
              >
                ديون لك (عملاء)
              </TabsTrigger>
              <TabsTrigger 
                value="suppliers" 
                className="rounded-xl font-black text-xs h-full transition-all data-[state=active]:bg-gradient-to-br data-[state=active]:from-[#123524] data-[state=active]:to-[#236045] data-[state=active]:text-white data-[state=active]:shadow-lg"
              >
                ديون عليك (موردين)
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="customers" className="space-y-4 outline-none">
              <div className="p-6 bg-green-50 text-green-700 rounded-[2rem] border border-green-100 flex items-center justify-between shadow-sm">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">إجمالي مستحقاتك</p>
                  <span className="text-2xl font-black tabular-nums">{totalCustomerDebts.toLocaleString('en-US')} ر.ي</span>
                </div>
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-md text-green-600">
                  <ArrowDownToLine className="w-6 h-6" />
                </div>
              </div>

              {customerDebts.length > 0 ? (
                customerDebts.map((c) => (
                  <div 
                    key={c.id} 
                    onClick={() => setSelectedEntity({ id: c.id, name: c.name, type: 'customer' })}
                    className="flex flex-row-reverse justify-between items-center p-5 bg-white rounded-[2rem] border border-border/40 shadow-sm active:scale-[0.98] transition-all group cursor-pointer"
                  >
                    <div className="flex gap-4 items-center flex-row-reverse">
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

                    <div className="flex flex-col items-start gap-1">
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

            <TabsContent value="suppliers" className="space-y-4 outline-none">
              <div className="p-6 bg-red-50 text-red-700 rounded-[2rem] border border-red-100 flex items-center justify-between shadow-sm">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">إجمالي ديونك للموردين</p>
                  <span className="text-2xl font-black tabular-nums">{totalSupplierDebts.toLocaleString('en-US')} ر.ي</span>
                </div>
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-md text-red-600">
                  <ArrowUpFromLine className="w-6 h-6" />
                </div>
              </div>

              {supplierDebts.length > 0 ? (
                supplierDebts.map((s) => (
                  <div 
                    key={s.id} 
                    onClick={() => setSelectedEntity({ id: s.id, name: s.name, type: 'supplier' })}
                    className="flex flex-row-reverse justify-between items-center p-5 bg-white rounded-[2rem] border border-border/40 shadow-sm active:scale-[0.98] transition-all group cursor-pointer"
                  >
                    <div className="flex gap-4 items-center flex-row-reverse">
                      <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center text-red-500 shadow-inner">
                        <Wallet className="w-6 h-6" />
                      </div>
                      <div className="flex flex-col text-right">
                        <span className="font-black text-sm">{s.name}</span>
                        <span className="text-[10px] text-muted-foreground font-bold">مورد معتمد</span>
                      </div>
                    </div>

                    <div className="flex flex-col items-start gap-1">
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

      {/* Account Statement Sheet */}
      <Sheet open={!!selectedEntity} onOpenChange={() => setSelectedEntity(null)}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-[2.5rem] p-0 overflow-hidden border-none shadow-2xl [&>button]:hidden">
          <SheetHeader className="p-6 bg-primary text-white relative">
             <div className="flex flex-col gap-1 text-right">
              <SheetTitle className="text-xl font-black text-white">{selectedEntity?.name}</SheetTitle>
              <p className="text-xs text-white/70 font-bold">كشف العمليات غير المسددة</p>
            </div>
            <button 
              onClick={() => setSelectedEntity(null)}
              className="absolute left-6 top-6 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </SheetHeader>

          <div className="h-full overflow-y-auto p-4 space-y-3 pb-24 bg-muted/20" dir="rtl">
            {entityTransactions.length > 0 ? (
              entityTransactions.map((tr: any) => {
                const campaign = campaigns?.find(c => c.id === tr.campaignId)
                const date = tr.invoiceDate || tr.purchaseDate || tr.expenseDate || (tr.createdAt?.toDate ? tr.createdAt.toDate() : tr.createdAt)
                const remaining = tr.remainingAmount || 0

                return (
                  <div 
                    key={tr.id} 
                    className="p-4 bg-white rounded-2xl border border-border/60 shadow-sm space-y-3 relative overflow-hidden"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex flex-col gap-1 text-right">
                        <div className="flex items-center gap-1.5 text-primary">
                          <Ship className="w-3.5 h-3.5" />
                          <span className="text-[11px] font-black max-w-[150px] truncate">{campaign?.name || "حملة غير معروفة"}</span>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {(tr.items && tr.items.length > 0) ? (
                            tr.items.slice(0, 2).map((item: any, idx: number) => (
                              <span key={idx} className="text-[8px] px-1.5 py-0.5 bg-muted rounded font-bold text-muted-foreground">
                                {item.fishType}
                              </span>
                            ))
                          ) : (
                            tr.trType === 'expense' && <span className="text-[9px] font-bold text-muted-foreground">مصروف: {tr.type}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        <Badge className={cn(
                          "rounded-lg px-2 py-0.5 text-[8px] font-bold border-none",
                          tr.trType === 'sale' ? "bg-green-50 text-green-600" : (tr.trType === 'purchase' ? "bg-orange-50 text-orange-600" : "bg-accent/10 text-accent")
                        )}>
                          {tr.trType === 'sale' ? "مبيعات" : tr.trType === 'purchase' ? "مشتريات" : "مصروف"}
                        </Badge>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <span className="text-[9px] font-bold">{date ? format(new Date(date), "dd/MM/yyyy", { locale: ar }) : "-"}</span>
                          <Calendar className="w-2.5 h-2.5" />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 py-2 border-t border-dashed border-border/50">
                       <div className="flex flex-col text-right">
                          <span className="text-[8px] text-muted-foreground font-bold">المتبقي</span>
                          <span className="text-[11px] font-black tabular-nums text-red-600">{remaining.toLocaleString()}</span>
                       </div>
                       <div className="flex flex-col text-center border-x border-border/30">
                          <span className="text-[8px] text-muted-foreground font-bold">المدفوع</span>
                          <span className="text-[11px] font-black tabular-nums text-green-600">{tr.paidAmount?.toLocaleString()}</span>
                       </div>
                       <div className="flex flex-col text-left">
                          <span className="text-[8px] text-muted-foreground font-bold">الإجمالي</span>
                          <span className="text-[11px] font-black tabular-nums">{(tr.totalAmount || tr.amount)?.toLocaleString()}</span>
                       </div>
                    </div>

                    <div className="flex gap-2 pt-1">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="flex-1 h-8 rounded-lg text-[10px] font-bold gap-1 border-primary/20 text-primary hover:bg-primary/5"
                        onClick={() => handleTransactionClick(tr)}
                      >
                        <ChevronRight className="w-3 h-3" />
                        التفاصيل
                      </Button>
                      <Button 
                        size="sm" 
                        className="flex-1 h-8 rounded-lg text-[10px] font-bold gap-1 lux-gradient"
                        onClick={() => {
                          setPaymentTarget({ ...tr, remainingAmount: remaining });
                          setPaymentAmount(remaining.toString());
                        }}
                      >
                        <Banknote className="w-3 h-3" />
                        تسجيل سداد
                      </Button>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center space-y-3 opacity-40">
                <CheckCircle2 className="w-12 h-12 text-green-600" />
                <p className="text-sm font-bold">الحساب مُصفر تماماً</p>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Repayment Dialog */}
      <Dialog open={!!paymentTarget} onOpenChange={() => setPaymentTarget(null)}>
        <DialogContent className="max-w-[90%] rounded-3xl mx-auto p-0 overflow-hidden border-none shadow-2xl">
          <DialogHeader className="p-6 bg-gradient-to-br from-primary to-accent text-white">
            <DialogTitle className="text-lg font-black text-right flex items-center justify-end gap-2">
              تسجيل عملية سداد
              <Banknote className="w-5 h-5" />
            </DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-5" dir="rtl">
            <div className="p-4 bg-muted/30 rounded-2xl border border-dashed space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-muted-foreground">المديونية الحالية:</span>
                <span className="text-sm font-black tabular-nums">{paymentTarget?.remainingAmount?.toLocaleString()} ر.ي</span>
              </div>
              <div className="flex justify-between items-center text-primary">
                <span className="text-xs font-bold">الحملة:</span>
                <span className="text-[11px] font-black">{campaigns?.find(c => c.id === paymentTarget?.campaignId)?.name}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-black mr-1">المبلغ المراد سداده الآن</Label>
              <Input 
                type="text" 
                inputMode="decimal"
                className="h-14 rounded-2xl text-center text-xl font-black tabular-nums focus:ring-accent"
                value={paymentAmount}
                onChange={(e) => {
                  const val = e.target.value.replace(/,/g, "");
                  if (val === "" || /^\d*\.?\d*$/.test(val)) setPaymentAmount(val);
                }}
              />
              <div className="flex gap-2 mt-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-[10px] font-bold h-7 px-3 bg-primary/5 text-primary rounded-full"
                  onClick={() => setPaymentAmount(paymentTarget?.remainingAmount.toString())}
                >
                  سداد المبلغ كاملاً
                </Button>
                {paymentTarget?.remainingAmount > 1000 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-[10px] font-bold h-7 px-3 bg-accent/5 text-accent rounded-full"
                    onClick={() => setPaymentAmount((paymentTarget?.remainingAmount / 2).toString())}
                  >
                    سداد النصف
                  </Button>
                )}
              </div>
            </div>
          </div>
          <DialogFooter className="p-6 bg-muted/20 border-t flex-row gap-3">
            <Button 
              variant="outline" 
              className="flex-1 rounded-xl h-12 font-bold border-muted-foreground/20"
              onClick={() => setPaymentTarget(null)}
              disabled={submittingPayment}
            >
              إلغاء
            </Button>
            <Button 
              className="flex-1 rounded-xl h-12 font-black lux-gradient gap-2"
              onClick={handleSettleDebt}
              disabled={submittingPayment}
            >
              {submittingPayment ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
              تأكيد السداد
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  )
}
