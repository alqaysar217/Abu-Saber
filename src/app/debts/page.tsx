
"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { 
  Search, 
  User, 
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
  ChevronRight,
  Banknote,
  CheckCircle2,
  Plus,
  History,
  FileText,
  AlertCircle,
  Eye,
  Check,
  CreditCard,
  Users
} from "lucide-react"
import { BottomNav } from "@/components/layout/BottomNav"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { useFirestore, useCollection, useUser, useMemoFirebase } from "@/firebase"
import { collection, query, where, doc, updateDoc, addDoc, serverTimestamp, orderBy } from "firebase/firestore"
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
  
  const [activeTab, setActiveTab] = useState("customers")
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedEntity, setSelectedEntity] = useState<any>(null)
  
  // Repayment State
  const [paymentTarget, setPaymentTarget] = useState<any>(null)
  const [paymentAmount, setPaymentAmount] = useState("")
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0])
  const [paymentNotes, setPaymentNotes] = useState("")
  const [submittingPayment, setSubmittingPayment] = useState(false)

  // Subscriptions
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
    return query(collection(db, "users", user.uid, "invoices"), orderBy("invoiceDate", "desc"))
  }, [db, user])
  const { data: invoices } = useCollection(invoicesQuery)

  const purchasesQuery = useMemoFirebase(() => {
    if (!db || !user) return null
    return query(collection(db, "users", user.uid, "purchases"), orderBy("purchaseDate", "desc"))
  }, [db, user])
  const { data: purchases } = useCollection(purchasesQuery)

  const expensesQuery = useMemoFirebase(() => {
    if (!db || !user) return null
    return query(collection(db, "users", user.uid, "expenses"), orderBy("expenseDate", "desc"))
  }, [db, user])
  const { data: expenses } = useCollection(expensesQuery)

  // Processing: Grouping debts by Customer/Supplier
  const customerDebts = useMemo(() => {
    if (!invoices || !customers) return []
    
    // Only entities that have at least one debt (non-cash) transaction
    return customers.map(cust => {
      const entityInvoices = invoices.filter(inv => inv.customerId === cust.id && inv.paymentType !== "نقد")
      const totalRemaining = entityInvoices.reduce((acc, inv) => acc + (inv.remainingAmount !== undefined ? inv.remainingAmount : ((inv.totalAmount || 0) - (inv.paidAmount || 0))), 0)
      
      if (entityInvoices.length === 0) return null
      
      return {
        ...cust,
        totalRemaining,
        transactions: entityInvoices.map(inv => ({
          ...inv,
          trType: 'sale',
          date: inv.invoiceDate
        }))
      }
    }).filter(Boolean)
  }, [invoices, customers])

  const supplierDebts = useMemo(() => {
    if (!purchases || !suppliers || !expenses) return []
    
    return suppliers.map(sup => {
      const entityPurchases = purchases.filter(p => p.supplierId === sup.id && p.paymentType !== "نقد")
      const entityExpenses = expenses.filter(e => e.payeeId === sup.id && e.paymentType !== "نقد")
      
      const totalRemaining = 
        entityPurchases.reduce((acc, p) => acc + (p.remainingAmount !== undefined ? p.remainingAmount : ((p.totalAmount || 0) - (p.paidAmount || 0))), 0) +
        entityExpenses.reduce((acc, e) => acc + (e.remainingAmount || 0), 0)

      if (entityPurchases.length === 0 && entityExpenses.length === 0) return null

      return {
        ...sup,
        totalRemaining,
        transactions: [
          ...entityPurchases.map(p => ({ ...p, trType: 'purchase', date: p.purchaseDate })),
          ...entityExpenses.map(e => ({ ...e, trType: 'expense', date: e.expenseDate, invoiceNumber: "مصروف" }))
        ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      }
    }).filter(Boolean)
  }, [purchases, suppliers, expenses])

  const filteredList = useMemo(() => {
    const list = activeTab === "customers" ? customerDebts : supplierDebts
    return list.filter((item: any) => item.name.toLowerCase().includes(searchTerm.toLowerCase()))
  }, [activeTab, customerDebts, supplierDebts, searchTerm])

  const handleSettleDebt = async () => {
    if (!db || !user || !paymentTarget) return
    const amount = parseFloat(paymentAmount.replace(/,/g, ""))
    if (isNaN(amount) || amount <= 0 || amount > (paymentTarget.totalRemaining || paymentTarget.remainingAmount + 1)) {
      toast({ variant: "destructive", title: "مبلغ غير صالح" })
      return
    }

    setSubmittingPayment(true)
    let collectionName = paymentTarget.trType === 'sale' ? "invoices" : (paymentTarget.trType === 'purchase' ? "purchases" : "expenses")
    const docRef = doc(db, "users", user.uid, collectionName, paymentTarget.id)
    
    const previousRemaining = paymentTarget.remainingAmount
    const newPaidAmount = (paymentTarget.paidAmount || 0) + amount
    const newRemainingAmount = Math.max(0, previousRemaining - amount)
    
    const updateData = { 
      paidAmount: newPaidAmount, 
      remainingAmount: newRemainingAmount, 
      status: newRemainingAmount <= 0 ? "مدفوعة" : "جزئي", 
      updatedAt: serverTimestamp() 
    }

    const transactionData = {
      type: activeTab === 'customers' ? 'customer_payment' : 'supplier_payment',
      entityId: selectedEntity.id,
      entityName: selectedEntity.name,
      sourceType: paymentTarget.trType,
      sourceId: paymentTarget.id,
      sourceNumber: paymentTarget.invoiceNumber || null,
      campaignId: paymentTarget.campaignId,
      amount: amount,
      previousBalance: previousRemaining,
      remainingBalance: newRemainingAmount,
      transactionDate: new Date(paymentDate).toISOString(),
      notes: paymentNotes || null,
      userId: user.uid,
      createdAt: serverTimestamp()
    }

    try {
      await updateDoc(docRef, updateData)
      await addDoc(collection(db, "users", user.uid, "paymentTransactions"), transactionData)
      toast({ title: "تم تسجيل السداد بنجاح" })
      setPaymentTarget(null)
      setPaymentAmount("")
      setPaymentNotes("")
    } catch (err) {
      errorEmitter.emit('permission-error', new FirestorePermissionError({ path: docRef.path, operation: 'update', requestResourceData: updateData }))
    } finally {
      setSubmittingPayment(false)
    }
  }

  const isLoading = !invoices || !purchases || !campaigns || !expenses

  return (
    <div className="flex flex-col min-h-screen bg-background pb-24">
      <header className="p-6 bg-white border-b sticky top-0 z-30 shadow-sm space-y-4">
        <div className="flex justify-between items-center">
          <button onClick={() => router.push("/")} className="p-2 -mr-2">
            <ChevronLeft className="w-6 h-6 rotate-180" />
          </button>
          <h1 className="text-xl font-black text-primary flex items-center gap-2">
            <Wallet className="w-5 h-5" />
            إدارة مديونيات الأشخاص
          </h1>
          <div className="w-10" />
        </div>
        
        <div className="relative group" dir="rtl">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input 
            placeholder="بحث عن اسم العميل أو المورد..." 
            className="pr-11 h-12 rounded-2xl bg-muted/50 border-none focus-visible:ring-primary focus-visible:bg-white transition-all shadow-inner text-right" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </header>

      <div className="p-4 flex-1">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-10 h-10 animate-spin text-primary opacity-50" />
            <p className="text-xs font-bold text-muted-foreground">جاري تحميل الحسابات...</p>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full" dir="rtl">
            <TabsList className="grid w-full grid-cols-2 h-14 rounded-2xl p-1 mb-6 bg-muted/50 border border-border/50 shadow-inner">
              <TabsTrigger value="customers" className="rounded-xl font-black text-[10px] h-full transition-all data-[state=active]:bg-gradient-to-br data-[state=active]:from-[#123524] data-[state=active]:to-[#236045] data-[state=active]:text-white">ديون لك (عملاء)</TabsTrigger>
              <TabsTrigger value="suppliers" className="rounded-xl font-black text-[10px] h-full transition-all data-[state=active]:bg-gradient-to-br data-[state=active]:from-[#123524] data-[state=active]:to-[#236045] data-[state=active]:text-white">ديون عليك (موردين)</TabsTrigger>
            </TabsList>
            
            <div className="space-y-3">
              {filteredList.length > 0 ? (
                filteredList.map((entity: any) => (
                  <button 
                    key={entity.id} 
                    onClick={() => setSelectedEntity(entity)}
                    className="w-full flex items-center justify-between p-5 bg-white rounded-[2rem] border border-border/40 shadow-sm active:scale-[0.98] transition-all hover:shadow-md"
                  >
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "p-3 rounded-2xl",
                        activeTab === "customers" ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
                      )}>
                        <User className="w-6 h-6" />
                      </div>
                      <div className="flex flex-col text-right">
                        <span className="font-black text-sm">{entity.name}</span>
                        <span className="text-[10px] text-muted-foreground font-bold flex items-center gap-1">
                          <History className="w-3 h-3" />
                          {entity.transactions?.length || 0} معاملة آجلة
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={cn(
                        "text-lg font-black tabular-nums",
                        entity.totalRemaining > 0 ? "text-accent" : "text-green-600"
                      )}>
                        {entity.totalRemaining.toLocaleString('en-US')}
                      </span>
                      {entity.totalRemaining <= 0 ? (
                        <Badge className="bg-green-100 text-green-700 border-none font-black text-[8px] px-2 py-0.5 rounded-lg flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> حساب مُصفر
                        </Badge>
                      ) : (
                        <span className="text-[9px] font-bold text-muted-foreground uppercase opacity-60">ريال يمني</span>
                      )}
                    </div>
                  </button>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-20 opacity-30 text-center space-y-4">
                  <AlertCircle className="w-16 h-16 text-muted-foreground" />
                  <p className="font-bold text-sm">لا توجد سجلات ديون في هذا القسم</p>
                </div>
              )}
            </div>
          </Tabs>
        )}
      </div>

      {/* كشف حساب الشخص والسداد */}
      <Sheet open={!!selectedEntity} onOpenChange={() => setSelectedEntity(null)}>
        <SheetContent side="bottom" className="h-[90vh] rounded-t-[3rem] p-0 overflow-hidden border-none shadow-2xl [&>button]:left-6 [&>button]:right-auto">
          <SheetHeader className="p-8 lux-gradient text-white text-right">
             <div className="flex justify-between items-start pt-4" dir="rtl">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20">
                    <User className="w-8 h-8" />
                  </div>
                  <div className="flex flex-col">
                    <SheetTitle className="text-2xl font-black text-white">{selectedEntity?.name}</SheetTitle>
                    <p className="text-xs text-white/70 font-bold">كشف حساب ومعاملات الدفع</p>
                  </div>
                </div>
             </div>
             <div className="mt-8 flex items-center justify-between bg-white/10 p-5 rounded-[1.5rem] border border-white/10 shadow-inner">
                <div className="flex flex-col text-right">
                  <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">إجمالي المديونية الحالية</span>
                  <span className="text-3xl font-black tabular-nums">{selectedEntity?.totalRemaining?.toLocaleString('en-US')} <span className="text-xs font-normal">ر.ي</span></span>
                </div>
                {selectedEntity?.totalRemaining > 0 && <div className="animate-pulse bg-accent text-white px-3 py-1 rounded-full text-[9px] font-black uppercase">دين قائم</div>}
             </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-6 space-y-6 pb-24 bg-background">
            <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2" dir="rtl">
              <History className="w-4 h-4" />
              تفاصيل الفواتير والمعاملات
            </h3>
            
            <div className="space-y-4" dir="rtl">
              {selectedEntity?.transactions?.map((tr: any) => {
                const campaign = campaigns?.find(c => c.id === tr.campaignId)
                const isPaid = (tr.remainingAmount !== undefined ? tr.remainingAmount : ((tr.totalAmount || 0) - (tr.paidAmount || 0))) <= 0
                
                return (
                  <div key={tr.id} className="p-5 bg-white rounded-[2rem] border border-border/40 shadow-sm space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                           <Badge variant="outline" className={cn(
                             "text-[10px] font-black",
                             tr.trType === 'sale' ? "border-green-200 text-green-700 bg-green-50" : "border-orange-200 text-orange-700 bg-orange-50"
                           )}>
                            {tr.invoiceNumber || (tr.trType === 'expense' ? "مصروف" : "شراء")}
                           </Badge>
                           <span className="text-[11px] font-bold text-primary">{campaign?.name || "حملة عامة"}</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground font-bold flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3" />
                          {tr.date ? format(new Date(tr.date), "dd MMMM yyyy", { locale: ar }) : "-"}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-black tabular-nums block">{tr.totalAmount?.toLocaleString('en-US')} ر.ي</span>
                        <span className="text-[9px] font-bold text-muted-foreground">المبلغ الإجمالي</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 p-3 bg-muted/30 rounded-2xl border border-dashed">
                      <div className="flex flex-col">
                        <span className="text-[9px] font-bold text-muted-foreground uppercase">الواصل (المدفوع)</span>
                        <span className="text-xs font-black text-green-700 tabular-nums">{(tr.paidAmount || 0).toLocaleString('en-US')}</span>
                      </div>
                      <div className="flex flex-col border-r border-border/60 pr-3">
                        <span className="text-[9px] font-bold text-muted-foreground uppercase">المتبقي (الدين)</span>
                        <span className="text-xs font-black text-destructive tabular-nums">{(tr.remainingAmount !== undefined ? tr.remainingAmount : (tr.totalAmount - tr.paidAmount)).toLocaleString('en-US')}</span>
                      </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                      <Button 
                        variant="outline" 
                        className="flex-1 h-11 rounded-2xl text-[11px] font-black gap-2 border-primary/20 text-primary hover:bg-primary/5"
                        onClick={() => router.push(`/campaigns/${tr.campaignId}?tab=${tr.trType === 'sale' ? 'sales' : (tr.trType === 'purchase' ? 'purchases' : 'expenses')}`)}
                      >
                        <Eye className="w-4 h-4" />
                        التفاصيل
                      </Button>
                      {!isPaid && (
                        <Button 
                          className="flex-1 h-11 rounded-2xl text-[11px] font-black gap-2 lux-gradient shadow-lg"
                          onClick={() => {
                            setPaymentTarget(tr);
                            setPaymentAmount((tr.remainingAmount !== undefined ? tr.remainingAmount : (tr.totalAmount - tr.paidAmount)).toString());
                          }}
                        >
                          <Banknote className="w-4 h-4" />
                          تسجيل سداد
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* نافذة تسجيل السداد الموثق */}
      <Dialog open={!!paymentTarget} onOpenChange={() => setPaymentTarget(null)}>
        <DialogContent className="max-w-[95%] rounded-[2.5rem] mx-auto p-0 overflow-hidden border-none shadow-2xl [&>button]:left-6 [&>button]:right-auto">
          <DialogHeader className="p-8 lux-gradient text-white">
            <DialogTitle className="text-xl font-black text-right flex items-center justify-start gap-3">
              <Banknote className="w-6 h-6" />
              تسجيل سداد مالي موثق
            </DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-6" dir="rtl">
            <div className="grid grid-cols-2 gap-4 p-5 bg-muted/40 rounded-3xl border border-dashed text-right border-primary/20">
              <div className="space-y-1">
                <span className="text-[10px] text-muted-foreground font-black uppercase tracking-wider">المديونية المتبقية</span>
                <p className="text-lg font-black text-destructive tabular-nums">
                  {(paymentTarget?.remainingAmount !== undefined ? paymentTarget.remainingAmount : (paymentTarget?.totalAmount - paymentTarget?.paidAmount))?.toLocaleString('en-US')} ر.ي
                </p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-muted-foreground font-black uppercase tracking-wider">رقم المرجع</span>
                <p className="text-xs font-black text-primary truncate bg-white px-2 py-0.5 rounded-lg inline-block border">
                  {paymentTarget?.invoiceNumber || '-'}
                </p>
              </div>
            </div>
            
            <div className="space-y-2.5 text-right">
              <Label className="text-sm font-black mr-1 flex items-center gap-2 text-primary">
                <Coins className="w-5 h-5" />
                المبلغ المراد سداده الآن
              </Label>
              <Input 
                type="text" 
                inputMode="decimal"
                className="h-16 rounded-[1.5rem] text-center text-2xl font-black tabular-nums border-2 focus:ring-primary shadow-inner" 
                value={paymentAmount}
                onChange={(e) => {
                  const v = e.target.value.replace(/,/g, "");
                  if (v === "" || /^\d*\.?\d*$/.test(v)) setPaymentAmount(v);
                }}
                placeholder="0.00"
              />
            </div>

            <div className="grid grid-cols-1 gap-5">
               <div className="space-y-2 text-right">
                <Label className="text-xs font-black mr-1 flex items-center gap-2 text-muted-foreground">
                  <Calendar className="w-4 h-4 text-primary" />
                  تاريخ السداد
                </Label>
                <Input type="date" className="h-12 rounded-2xl text-right border-muted-foreground/20" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
               </div>
               <div className="space-y-2 text-right">
                <Label className="text-xs font-black mr-1 flex items-center gap-2 text-muted-foreground">
                  <FileText className="w-4 h-4 text-primary" />
                  ملاحظات / المستلم
                </Label>
                <Textarea placeholder="اكتب تفاصيل إضافية..." className="rounded-[1.5rem] resize-none text-right h-28 border-muted-foreground/20 focus:ring-primary" value={paymentNotes} onChange={(e) => setPaymentNotes(e.target.value)} />
               </div>
            </div>
          </div>
          <DialogFooter className="p-6 bg-muted/30 border-t flex flex-row gap-4">
            <Button 
              variant="outline" 
              className="flex-1 rounded-2xl h-14 font-black border-muted-foreground/20 hover:bg-white text-muted-foreground"
              onClick={() => setPaymentTarget(null)}
              disabled={submittingPayment}
            >
              إلغاء
            </Button>
            <Button 
              className="flex-1 rounded-2xl h-14 font-black lux-gradient gap-3 shadow-xl active:scale-95 transition-all"
              onClick={handleSettleDebt}
              disabled={submittingPayment || !paymentAmount}
            >
              {submittingPayment ? <Loader2 className="w-6 h-6 animate-spin" /> : <Check className="w-6 h-6" />}
              تأكيد وحفظ السداد
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <BottomNav />
    </div>
  )
}
