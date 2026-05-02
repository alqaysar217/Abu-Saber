
"use client"

import { useState, useMemo, useEffect } from "react"
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
  ArrowUpDown,
  Filter,
  Check,
  LayoutDashboard,
  Coins,
  CreditCard,
  Hash
} from "lucide-react"
import { BottomNav } from "@/components/layout/BottomNav"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { ar } from "date-fns/locale"
import { useToast } from "@/hooks/use-toast"
import { errorEmitter } from '@/firebase/error-emitter'
import { FirestorePermissionError } from '@/firebase/errors'

type SortOption = 'amount_desc' | 'amount_asc' | 'date_desc' | 'date_asc'

export default function DebtsPage() {
  const router = useRouter()
  const db = useFirestore()
  const { user } = useUser()
  const { toast } = useToast()
  
  // Filtering & Sorting State
  const [activeTab, setActiveTab] = useState("customers")
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState<SortOption>('amount_desc')
  const [filterStatus, setFilterStatus] = useState<string>("all") 
  const [filterCampaignId, setFilterCampaignId] = useState<string>("all")
  const [filterDebtStatus, setFilterDebtStatus] = useState<string>("all") 
  const [recipientSearch, setRecipientSearch] = useState("")
  
  const [selectedEntity, setSelectedEntity] = useState<{ id: string, name: string, type: 'customer' | 'supplier' } | null>(null)
  
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
    return query(collection(db, "users", user.uid, "campaigns"), orderBy("startDate", "desc"))
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

  const transactionsQuery = useMemoFirebase(() => {
    if (!db || !user) return null
    return query(collection(db, "users", user.uid, "paymentTransactions"), orderBy("transactionDate", "desc"))
  }, [db, user])
  const { data: historyTransactions } = useCollection(transactionsQuery)

  // Apply Sorting Helper
  const sortData = (data: any[], option: SortOption) => {
    return [...data].sort((a, b) => {
      switch (option) {
        case 'amount_desc': return b.amount - a.amount;
        case 'amount_asc': return a.amount - b.amount;
        case 'date_desc': return new Date(b.date || b.transactionDate || 0).getTime() - new Date(a.date || a.transactionDate || 0).getTime();
        case 'date_asc': return new Date(a.date || a.transactionDate || 0).getTime() - new Date(b.date || b.transactionDate || 0).getTime();
        default: return 0;
      }
    });
  }

  // Calculate Customer Debts
  const filteredCustomerDebts = useMemo(() => {
    if (!invoices || !customers) return []
    const debtsMap = new Map()
    
    invoices.forEach(inv => {
      if (filterCampaignId !== "all" && inv.campaignId !== filterCampaignId) return;
      const customerId = inv.customerId
      if (!customerId) return
      const remaining = inv.remainingAmount !== undefined ? inv.remainingAmount : ((inv.totalAmount || 0) - (inv.paidAmount || 0))
      const current = debtsMap.get(customerId) || { amount: 0, date: 0 }
      const invDate = new Date(inv.invoiceDate || 0).getTime()
      debtsMap.set(customerId, { 
        amount: current.amount + remaining,
        date: Math.max(current.date, invDate)
      })
    })
    
    let results = Array.from(debtsMap.entries()).map(([id, info]) => {
      const c = customers.find(x => x.id === id)
      return { id, name: c?.name || "عميل غير معروف", phone: c?.phone || "", amount: info.amount, date: info.date }
    }).filter(d => d.name.toLowerCase().includes(searchTerm.toLowerCase()))

    if (filterDebtStatus === "unpaid") results = results.filter(d => d.amount > 0)
    else if (filterDebtStatus === "paid") results = results.filter(d => d.amount <= 0)

    return sortData(results, sortBy)
  }, [invoices, customers, searchTerm, sortBy, filterCampaignId, filterDebtStatus])

  // Calculate Supplier Debts
  const filteredSupplierDebts = useMemo(() => {
    if (!purchases || !suppliers || !expenses) return []
    const debtsMap = new Map()
    
    purchases.forEach(p => {
      if (filterCampaignId !== "all" && p.campaignId !== filterCampaignId) return;
      const supplierId = p.supplierId
      if (!supplierId) return
      const remaining = p.remainingAmount !== undefined ? p.remainingAmount : ((p.totalAmount || 0) - (p.paidAmount || 0))
      const current = debtsMap.get(supplierId) || { amount: 0, date: 0 }
      const pDate = new Date(p.purchaseDate || 0).getTime()
      debtsMap.set(supplierId, { 
        amount: current.amount + remaining,
        date: Math.max(current.date, pDate)
      })
    })
    
    expenses.forEach(e => {
      if (filterCampaignId !== "all" && e.campaignId !== filterCampaignId) return;
      const payeeId = e.payeeId
      if (!payeeId) return
      const remaining = e.remainingAmount || 0
      const current = debtsMap.get(payeeId) || { amount: 0, date: 0 }
      const eDate = new Date(e.expenseDate || 0).getTime()
      debtsMap.set(payeeId, { 
        amount: current.amount + remaining,
        date: Math.max(current.date, eDate)
      })
    })
    
    let results = Array.from(debtsMap.entries()).map(([id, info]) => {
      const s = suppliers.find(x => x.id === id)
      return { id, name: s?.name || "مورد غير معروف", phone: s?.phone || "", amount: info.amount, date: info.date }
    }).filter(d => d.name.toLowerCase().includes(searchTerm.toLowerCase()))

    if (filterDebtStatus === "unpaid") results = results.filter(d => d.amount > 0)
    else if (filterDebtStatus === "paid") results = results.filter(d => d.amount <= 0)

    return sortData(results, sortBy)
  }, [purchases, suppliers, expenses, searchTerm, sortBy, filterCampaignId, filterDebtStatus])

  // Filtered History Transactions
  const filteredHistory = useMemo(() => {
    if (!historyTransactions) return []
    let results = [...historyTransactions]
    if (filterCampaignId !== "all") results = results.filter(tr => tr.campaignId === filterCampaignId)
    if (filterStatus !== "all") results = results.filter(tr => tr.type === filterStatus)
    if (searchTerm) results = results.filter(tr => tr.entityName?.toLowerCase().includes(searchTerm.toLowerCase()))
    if (recipientSearch) results = results.filter(tr => tr.notes?.toLowerCase().includes(recipientSearch.toLowerCase()))
    return sortData(results, sortBy)
  }, [historyTransactions, filterStatus, searchTerm, recipientSearch, sortBy, filterCampaignId])

  const totalCustomerDebts = filteredCustomerDebts.reduce((acc, curr) => acc + curr.amount, 0)
  const totalSupplierDebts = filteredSupplierDebts.reduce((acc, curr) => acc + curr.amount, 0)

  const entityTransactions = useMemo(() => {
    if (!selectedEntity) return []
    if (selectedEntity.type === 'customer') {
      return (invoices || [])
        .filter(inv => inv.customerId === selectedEntity.id)
        .map(tr => ({ ...tr, trType: 'sale', remainingAmount: tr.remainingAmount !== undefined ? tr.remainingAmount : ((tr.totalAmount || 0) - (tr.paidAmount || 0)) }))
        .sort((a, b) => new Date(b.invoiceDate || 0).getTime() - new Date(a.invoiceDate || 0).getTime())
    } else {
      const trs: any[] = []
      trs.push(...(purchases || []).filter(p => p.supplierId === selectedEntity.id).map(tr => ({ ...tr, trType: 'purchase', remainingAmount: tr.remainingAmount !== undefined ? tr.remainingAmount : ((tr.totalAmount || 0) - (tr.paidAmount || 0)) })))
      trs.push(...(expenses || []).filter(e => e.payeeId === selectedEntity.id).map(tr => ({ ...tr, trType: 'expense', remainingAmount: tr.remainingAmount || 0 })))
      return trs.sort((a, b) => new Date(b.purchaseDate || b.expenseDate || b.createdAt || 0).getTime() - new Date(a.purchaseDate || a.expenseDate || a.createdAt || 0).getTime())
    }
  }, [selectedEntity, invoices, purchases, expenses])

  const handleSettleDebt = async () => {
    if (!db || !user || !paymentTarget) return
    const amount = parseFloat(paymentAmount.replace(/,/g, ""))
    if (isNaN(amount) || amount <= 0 || amount > paymentTarget.remainingAmount) {
      toast({ variant: "destructive", title: "مبلغ غير صالح" })
      return
    }

    setSubmittingPayment(true)
    let collectionName = paymentTarget.trType === 'sale' ? "invoices" : (paymentTarget.trType === 'purchase' ? "purchases" : "expenses")
    const docRef = doc(db, "users", user.uid, collectionName, paymentTarget.id)
    const newPaidAmount = (paymentTarget.paidAmount || 0) + amount
    const newRemainingAmount = paymentTarget.remainingAmount - amount
    const updateData = { paidAmount: newPaidAmount, remainingAmount: newRemainingAmount, status: newRemainingAmount <= 0 ? "مدفوعة" : "جزئي", updatedAt: serverTimestamp() }

    const transactionData = {
      type: selectedEntity?.type === 'customer' ? 'customer_payment' : 'supplier_payment',
      entityId: selectedEntity?.id,
      entityName: selectedEntity?.name,
      sourceType: paymentTarget.trType,
      sourceId: paymentTarget.id,
      campaignId: paymentTarget.campaignId,
      amount: amount,
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

  const isLoading = !invoices || !purchases || !campaigns || !expenses || !historyTransactions

  return (
    <div className="flex flex-col min-h-screen bg-background pb-24">
      <header className="p-6 bg-white border-b sticky top-0 z-30 shadow-sm space-y-4">
        <h1 className="text-2xl font-black text-primary text-right">إدارة الديون والوصولات</h1>
        
        <div className="flex gap-2" dir="rtl">
          <div className="relative flex-1 group">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input 
              placeholder="بحث بالاسم..."
              className="pr-11 h-12 rounded-2xl bg-muted/50 border-none focus-visible:ring-primary focus-visible:bg-white transition-all shadow-inner text-right" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="h-12 w-12 rounded-2xl border-none bg-muted/50 text-primary">
                <ArrowUpDown className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-2xl">
              <DropdownMenuLabel className="text-right">ترتيب حسب</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                <DropdownMenuRadioItem value="amount_desc" className="flex justify-end gap-2">المبلغ (الأكبر أولاً)</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="amount_asc" className="flex justify-end gap-2">المبلغ (الأصغر أولاً)</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="date_desc" className="flex justify-end gap-2">التاريخ (الأحدث أولاً)</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="date_asc" className="flex justify-end gap-2">التاريخ (الأقدم أولاً)</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="grid grid-cols-2 gap-2" dir="rtl">
          <div className="space-y-1">
            <Label className="text-[10px] font-bold mr-1 text-muted-foreground">تصفية حسب الحملة</Label>
            <Select value={filterCampaignId} onValueChange={setFilterCampaignId}>
              <SelectTrigger className="h-10 rounded-xl bg-muted/30 border-none text-[11px] font-bold">
                <SelectValue placeholder="كل الحملات" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all">كل الحملات</SelectItem>
                {campaigns?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {activeTab !== "history" ? (
            <div className="space-y-1">
              <Label className="text-[10px] font-bold mr-1 text-muted-foreground">حالة السداد</Label>
              <Select value={filterDebtStatus} onValueChange={setFilterDebtStatus}>
                <SelectTrigger className="h-10 rounded-xl bg-muted/30 border-none text-[11px] font-bold">
                  <SelectValue placeholder="الكل" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all">الكل</SelectItem>
                  <SelectItem value="unpaid">ديون قائمة</SelectItem>
                  <SelectItem value="paid">حسابات مُصفرة</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-1">
              <Label className="text-[10px] font-bold mr-1 text-muted-foreground">اسم المستلم</Label>
              <div className="relative">
                <FileText className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                <Input placeholder="فلترة بالمستلم..." className="pr-8 h-10 rounded-xl bg-muted/30 border-none text-[11px] text-right" value={recipientSearch} onChange={(e) => setRecipientSearch(e.target.value)} />
              </div>
            </div>
          )}
        </div>
      </header>

      <div className="p-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-20 gap-3"><Loader2 className="w-10 h-10 animate-spin text-primary opacity-50" /><p className="text-xs font-bold text-muted-foreground">جاري تحميل البيانات...</p></div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full" dir="rtl">
            <TabsList className="grid w-full grid-cols-3 h-14 rounded-2xl p-1 mb-6 bg-muted/50 border border-border/50 shadow-inner">
              <TabsTrigger value="customers" className="rounded-xl font-black text-[10px] h-full transition-all data-[state=active]:bg-gradient-to-br data-[state=active]:from-[#123524] data-[state=active]:to-[#236045] data-[state=active]:text-white">ديون لك</TabsTrigger>
              <TabsTrigger value="suppliers" className="rounded-xl font-black text-[10px] h-full transition-all data-[state=active]:bg-gradient-to-br data-[state=active]:from-[#123524] data-[state=active]:to-[#236045] data-[state=active]:text-white">ديون عليك</TabsTrigger>
              <TabsTrigger value="history" className="rounded-xl font-black text-[10px] h-full transition-all data-[state=active]:bg-gradient-to-br data-[state=active]:from-[#123524] data-[state=active]:to-[#236045] data-[state=active]:text-white">سجل الوصولات</TabsTrigger>
            </TabsList>
            
            <TabsContent value="customers" className="space-y-4 outline-none animate-in fade-in duration-300">
              <div className="p-6 bg-green-50 text-green-700 rounded-[2rem] border border-green-100 flex items-center justify-between shadow-sm">
                <div className="space-y-1 text-right"><p className="text-[10px] font-bold uppercase tracking-wider opacity-70">إجمالي مستحقاتك لدى العملاء</p><span className="text-2xl font-black tabular-nums">{totalCustomerDebts.toLocaleString('en-US')} ر.ي</span></div>
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-md text-green-600"><ArrowDownToLine className="w-6 h-6" /></div>
              </div>
              {filteredCustomerDebts.length === 0 ? <div className="text-center py-20 text-muted-foreground opacity-50 font-bold">لا توجد نتائج مطابقة</div> : filteredCustomerDebts.map((c) => {
                const isSettled = c.amount <= 0;
                return (
                  <div key={c.id} onClick={() => setSelectedEntity({ id: c.id, name: c.name, type: 'customer' })} className={cn("flex justify-between items-center p-5 rounded-[2rem] border border-border/40 shadow-sm active:scale-[0.98] transition-all cursor-pointer", isSettled ? "bg-muted/20 opacity-70" : "bg-white")}>
                    <div className="flex gap-4 items-center text-right">
                      <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner", isSettled ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary")}><User className="w-6 h-6" /></div>
                      <div className="flex flex-col"><span className={cn("font-black text-sm", isSettled && "text-muted-foreground")}>{c.name}</span><span className="text-[10px] font-bold text-muted-foreground">{c.phone || "بدون رقم"}</span></div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {isSettled ? <Badge className="bg-green-100 text-green-700 border-none font-black text-[9px] px-2 py-0.5 rounded-lg">حساب مُصفر</Badge> : <span className="text-lg font-black text-green-600 tabular-nums">{c.amount.toLocaleString('en-US')} ر.ي</span>}
                      <div className="text-[9px] text-primary font-black flex items-center gap-1">عرض التفاصيل <ChevronLeft className="w-3 h-3" /></div>
                    </div>
                  </div>
                );
              })}
            </TabsContent>

            <TabsContent value="suppliers" className="space-y-4 outline-none animate-in fade-in duration-300">
              <div className="p-6 bg-red-50 text-red-700 rounded-[2rem] border border-red-100 flex items-center justify-between shadow-sm">
                <div className="space-y-1 text-right"><p className="text-[10px] font-bold uppercase tracking-wider opacity-70">إجمالي مديونياتك للموردين</p><span className="text-2xl font-black tabular-nums">{totalSupplierDebts.toLocaleString('en-US')} ر.ي</span></div>
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-md text-red-600"><ArrowUpFromLine className="w-6 h-6" /></div>
              </div>
              {filteredSupplierDebts.length === 0 ? <div className="text-center py-20 text-muted-foreground opacity-50 font-bold">لا توجد نتائج مطابقة</div> : filteredSupplierDebts.map((s) => {
                const isSettled = s.amount <= 0;
                return (
                  <div key={s.id} onClick={() => setSelectedEntity({ id: s.id, name: s.name, type: 'supplier' })} className={cn("flex justify-between items-center p-5 rounded-[2rem] border border-border/40 shadow-sm active:scale-[0.98] transition-all cursor-pointer", isSettled ? "bg-muted/20 opacity-70" : "bg-white")}>
                    <div className="flex gap-4 items-center text-right">
                      <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner", isSettled ? "bg-muted text-muted-foreground" : "bg-red-50 text-red-500")}><Wallet className="w-6 h-6" /></div>
                      <div className="flex flex-col"><span className={cn("font-black text-sm", isSettled && "text-muted-foreground")}>{s.name}</span><span className="text-[10px] font-bold text-muted-foreground">مورد معتمد</span></div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {isSettled ? <Badge className="bg-green-100 text-green-700 border-none font-black text-[9px] px-2 py-0.5 rounded-lg">حساب مُصفر</Badge> : <span className="text-lg font-black text-red-600 tabular-nums">{s.amount.toLocaleString('en-US')} ر.ي</span>}
                      <div className="text-[9px] text-primary font-black flex items-center gap-1">عرض التفاصيل <ChevronLeft className="w-3 h-3" /></div>
                    </div>
                  </div>
                );
              })}
            </TabsContent>

            <TabsContent value="history" className="space-y-4 outline-none animate-in fade-in duration-300">
              {filteredHistory?.length === 0 ? <div className="text-center py-20 text-muted-foreground border-2 border-dashed rounded-[3rem]"><History className="w-12 h-12 mx-auto mb-3 opacity-20" /><p className="font-black">لا توجد عمليات سداد مطابقة</p></div> : filteredHistory?.map((tr: any) => (
                <div key={tr.id} className={cn("p-3 rounded-[1.5rem] border shadow-sm space-y-2.5 transition-all relative overflow-hidden bg-gradient-to-br from-white to-white", tr.type === 'customer_payment' ? 'border-green-100 bg-green-50/20' : 'border-orange-100 bg-orange-50/20')}>
                  <div className="flex justify-between items-center">
                    <Badge className={cn("text-[9px] font-black px-2 py-0.5 rounded-lg border-none shadow-sm", tr.type === 'customer_payment' ? 'text-white bg-green-600' : 'text-white bg-orange-600')}>{tr.type === 'customer_payment' ? 'استلام دفعة' : 'صرف دفعة'}</Badge>
                    <span className="text-[9px] font-bold text-muted-foreground/70 tabular-nums">{tr.transactionDate ? format(new Date(tr.transactionDate), "dd/MM/yyyy", { locale: ar }) : ""}</span>
                  </div>
                  <div className="flex justify-between items-center px-1">
                    <div className="flex items-center gap-2 max-w-[55%]"><User className="w-3 h-3 text-muted-foreground" /><span className="text-xs font-black text-foreground/90 truncate">{tr.entityName}</span></div>
                    {tr.notes && <div className="flex items-center gap-1.5 max-w-[40%] bg-white/40 px-2 py-0.5 rounded-md"><FileText className="w-2.5 h-2.5 text-muted-foreground" /><span className="text-[9px] text-muted-foreground font-bold truncate">المستلم: {tr.notes}</span></div>}
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-dashed border-border/30 px-1">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Receipt className="w-2.5 h-2.5" />
                      <span className="text-[8px] font-bold">سداد لـ: {tr.sourceType === 'sale' ? 'فاتورة مبيعات' : (tr.sourceType === 'purchase' ? 'فاتورة مشتريات' : 'مصروف')}</span>
                    </div>
                    <span className={cn("text-sm font-black tabular-nums", tr.type === 'customer_payment' ? 'text-green-700' : 'text-orange-700')}>{tr.amount.toLocaleString('en-US')} <span className="text-[8px] font-bold">ر.ي</span></span>
                  </div>
                </div>
              ))}
            </TabsContent>
          </Tabs>
        )}
      </div>

      <Sheet open={!!selectedEntity} onOpenChange={() => setSelectedEntity(null)}>
        <SheetContent side="bottom" className="h-[90vh] rounded-t-[2.5rem] p-0 overflow-hidden border-none shadow-2xl [&>button]:hidden">
          <SheetHeader className="p-6 bg-primary text-white relative">
            <button onClick={() => setSelectedEntity(null)} className="absolute left-6 top-8 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors z-10"><X className="w-5 h-5 text-white" /></button>
            <div className="flex flex-col gap-1 items-start mt-4 text-right w-full pr-2" dir="rtl"><SheetTitle className="text-xl font-black text-white">{selectedEntity?.name}</SheetTitle><p className="text-xs text-white/70 font-bold">كشف العمليات والديون</p></div>
          </SheetHeader>
          <div className="h-full overflow-y-auto p-4 space-y-3 pb-32 bg-muted/20" dir="rtl">
            {entityTransactions.length > 0 ? entityTransactions.map((tr: any) => {
              const campaign = campaigns?.find(c => c.id === tr.campaignId)
              const date = tr.invoiceDate || tr.purchaseDate || tr.expenseDate || (tr.createdAt?.toDate ? tr.createdAt.toDate() : tr.createdAt)
              const isPaid = tr.remainingAmount <= 0
              const payments = historyTransactions?.filter(pt => pt.sourceId === tr.id) || [];

              return (
                <div key={tr.id} className={cn("p-4 bg-white rounded-2xl border border-border/60 shadow-sm space-y-3 relative overflow-hidden transition-all", isPaid && "bg-muted/50")}>
                  {isPaid && <div className="absolute top-0 right-0 p-1 bg-green-500 text-white rounded-bl-xl z-10"><CheckCircle2 className="w-4 h-4" /></div>}
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col gap-1 text-right">
                      <div className="flex items-center gap-1.5 text-primary"><Ship className="w-3.5 h-3.5" /><span className="text-[11px] font-black max-w-[150px] truncate">{campaign?.name || "حملة غير معروفة"}</span></div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {(tr.items && tr.items.length > 0) ? tr.items.slice(0, 2).map((item: any, idx: number) => (
                          <span key={idx} className="text-[9px] px-1.5 py-0.5 bg-muted rounded font-bold text-muted-foreground flex items-center gap-1"><Fish className="w-2.5 h-2.5" /> {item.fishType}</span>
                        )) : tr.trType === 'expense' && <span className="text-[9px] font-bold text-muted-foreground flex items-center gap-1"><Receipt className="w-2.5 h-2.5" /> {tr.type}</span>}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <Badge className={cn("rounded-lg px-2 py-0.5 text-[8px] font-bold border-none", tr.trType === 'sale' ? "bg-green-50 text-green-600" : (tr.trType === 'purchase' ? "bg-orange-50 text-orange-600" : "bg-accent/10 text-accent"))}>{tr.trType === 'sale' ? "مبيعات" : tr.trType === 'purchase' ? "مشتريات" : "مصروف"}</Badge>
                      <div className="flex items-center gap-1 text-muted-foreground"><span className="text-[9px] font-bold">{date ? format(new Date(date), "dd/MM/yyyy", { locale: ar }) : "-"}</span><Calendar className="w-2.5 h-2.5" /></div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 py-2 border-t border-dashed border-border/50 text-center">
                     <div className="flex flex-col"><span className="text-[8px] text-muted-foreground font-bold">المتبقي</span><span className={cn("text-[11px] font-black tabular-nums", isPaid ? "text-muted-foreground line-through" : "text-red-600")}>{tr.remainingAmount.toLocaleString('en-US')}</span></div>
                     <div className="flex flex-col border-x border-border/30 px-1"><span className="text-[8px] text-muted-foreground font-bold">المدفوع</span><span className={cn("text-[11px] font-black tabular-nums text-green-600")}>{tr.paidAmount?.toLocaleString('en-US')}</span></div>
                     <div className="flex flex-col"><span className="text-[8px] text-muted-foreground font-bold">الإجمالي</span><span className="text-[11px] font-black tabular-nums">{(tr.totalAmount || tr.amount)?.toLocaleString('en-US')}</span></div>
                  </div>
                  
                  {/* تتبع الأقساط والوصولات الخاصة بهذه الفاتورة */}
                  {payments.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-dotted border-border/40">
                      <p className="text-[9px] font-bold text-muted-foreground mb-1.5 flex items-center gap-1"><History className="w-2.5 h-2.5" /> سجل السداد (أقساط):</p>
                      <div className="space-y-1">
                        {payments.map((p) => (
                          <div key={p.id} className="flex justify-between items-center bg-muted/40 p-1.5 rounded-lg text-[9px]">
                             <div className="flex items-center gap-2">
                                <span className="font-black tabular-nums text-primary">{p.amount.toLocaleString()} ر.ي</span>
                                <span className="text-[8px] opacity-60">{format(new Date(p.transactionDate), "dd/MM/yyyy")}</span>
                             </div>
                             {p.notes && <span className="text-muted-foreground max-w-[80px] truncate">المستلم: {p.notes}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 pt-1">
                    <Button variant="outline" className="flex-1 h-9 rounded-xl text-[10px] font-bold gap-1 border-primary/20 text-primary" onClick={() => router.push(`/campaigns/${tr.campaignId}?tab=${tr.trType === 'sale' ? 'sales' : (tr.trType === 'purchase' ? 'purchases' : 'expenses')}`)}>التفاصيل</Button>
                    {!isPaid && <Button className="flex-1 h-9 rounded-xl text-[10px] font-bold gap-1 lux-gradient" onClick={() => { setPaymentTarget(tr); setPaymentAmount(tr.remainingAmount.toString()); }}>تسجيل سداد</Button>}
                  </div>
                </div>
              )
            }) : <div className="flex flex-col items-center justify-center py-20 text-center space-y-3 opacity-40"><CheckCircle2 className="w-12 h-12 text-green-600" /><p className="text-sm font-bold">لا توجد عمليات مسجلة</p></div>}
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={!!paymentTarget} onOpenChange={() => setPaymentTarget(null)}>
        <DialogContent className="max-w-[95%] rounded-3xl mx-auto p-0 overflow-hidden border-none shadow-2xl [&>button]:left-4 [&>button]:right-auto">
          <DialogHeader className="p-6 bg-gradient-to-br from-primary to-accent text-white">
            <DialogTitle className="text-lg font-black text-right flex items-center justify-start gap-2"><Banknote className="w-5 h-5" />تسجيل سداد مالي</DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-5" dir="rtl">
            <div className="grid grid-cols-2 gap-3 p-4 bg-muted/30 rounded-2xl border border-dashed text-right">
              <div className="space-y-1"><span className="text-[10px] text-muted-foreground font-bold">المديونية المتبقية</span><p className="text-sm font-black text-red-600">{paymentTarget?.remainingAmount?.toLocaleString('en-US')} ر.ي</p></div>
              <div className="space-y-1"><span className="text-[10px] text-muted-foreground font-bold">الحملة</span><p className="text-[10px] font-black truncate">{campaigns?.find(c => c.id === paymentTarget?.campaignId)?.name}</p></div>
            </div>
            <div className="space-y-2 text-right">
              <Label className="text-xs font-black mr-1 flex items-center gap-2"><Coins className="w-4 h-4 text-primary" />المبلغ المراد سداده الآن</Label>
              <Input type="text" inputMode="decimal" className="h-14 rounded-2xl text-center text-xl font-black tabular-nums border-2 focus:ring-primary" value={paymentAmount} onChange={(e) => { const v = e.target.value.replace(/,/g, ""); if (v === "" || /^\d*\.?\d*$/.test(v)) setPaymentAmount(v); }} />
              {parseFloat(paymentAmount) > paymentTarget?.remainingAmount && <p className="text-[10px] text-destructive font-black flex items-center gap-1 justify-end mt-1"><AlertCircle className="w-3 h-3" /> خطأ: المبلغ أكبر من الدين المتبقي</p>}
            </div>
            <div className="space-y-2 text-right"><Label className="text-xs font-black mr-1 flex items-center gap-2"><Calendar className="w-4 h-4 text-primary" />تاريخ السداد</Label><Input type="date" className="h-12 rounded-2xl text-right" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} /></div>
            <div className="space-y-2 text-right"><Label className="text-xs font-black mr-1 flex items-center gap-2"><FileText className="w-4 h-4 text-primary" />ملاحظات إضافية / المستلم (اختياري)</Label><Textarea placeholder="مثال: تم تسليم المبلغ لفلان..." className="rounded-2xl resize-none text-right h-24" value={paymentNotes} onChange={(e) => setPaymentNotes(e.target.value)} /></div>
          </div>
          <DialogFooter className="p-6 bg-muted/20 border-t flex flex-row gap-3">
            <Button variant="outline" className="flex-1 rounded-xl h-12 font-bold border-muted-foreground/20" onClick={() => setPaymentTarget(null)} disabled={submittingPayment}>إلغاء</Button>
            <Button className="flex-1 rounded-xl h-12 font-black lux-gradient gap-2" onClick={handleSettleDebt} disabled={submittingPayment || !paymentAmount || parseFloat(paymentAmount) > (paymentTarget?.remainingAmount || 0)}>{submittingPayment ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />} تأكيد السداد</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <BottomNav />
    </div>
  )
}
