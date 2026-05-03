
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
  Hash,
  Eye,
  Download,
  ArrowRight,
  Users
} from "lucide-react"
import { BottomNav } from "@/components/layout/BottomNav"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
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
import { format, startOfDay, endOfDay } from "date-fns"
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
  const [sortBy, setSortBy] = useState<SortOption>('date_desc')
  const [filterCampaignId, setFilterCampaignId] = useState<string>("all")
  const [filterDebtStatus, setFilterDebtStatus] = useState<string>("unpaid") 
  const [filterEntityId, setFilterEntityId] = useState<string>("all")
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")
  
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

  // Reset entity filter when changing tabs
  useEffect(() => {
    setFilterEntityId("all")
  }, [activeTab])

  // Data processing helpers
  const applyFilters = (data: any[]) => {
    return data.filter(item => {
      const matchesSearch = 
        item.entityName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesCampaign = filterCampaignId === "all" || item.campaignId === filterCampaignId
      
      const matchesStatus = 
        filterDebtStatus === "all" || 
        (filterDebtStatus === "unpaid" && item.remainingAmount > 0) ||
        (filterDebtStatus === "paid" && item.remainingAmount <= 0)

      const entityId = item.customerId || item.supplierId || item.payeeId
      const matchesEntity = filterEntityId === "all" || entityId === filterEntityId

      let matchesDate = true
      if (fromDate || toDate) {
        const itemDate = new Date(item.date)
        const start = fromDate ? startOfDay(new Date(fromDate)) : new Date(0)
        const end = toDate ? endOfDay(new Date(toDate)) : new Date(8640000000000000)
        matchesDate = itemDate >= start && itemDate <= end
      }

      return matchesSearch && matchesCampaign && matchesStatus && matchesDate && matchesEntity
    }).sort((a, b) => {
      if (sortBy === 'amount_desc') return b.remainingAmount - a.remainingAmount
      if (sortBy === 'amount_asc') return a.remainingAmount - b.remainingAmount
      if (sortBy === 'date_desc') return new Date(b.date).getTime() - new Date(a.date).getTime()
      if (sortBy === 'date_asc') return new Date(a.date).getTime() - new Date(b.date).getTime()
      return 0
    })
  }

  const customerDebts = useMemo(() => {
    if (!invoices) return []
    return invoices
      .filter(inv => inv.paymentType !== "نقد")
      .map(inv => {
        const customer = customers?.find(c => c.id === inv.customerId)
        const campaign = campaigns?.find(c => c.id === inv.campaignId)
        return {
          ...inv,
          id: inv.id,
          entityName: customer?.name || "عميل غير معروف",
          campaignName: campaign?.name || "حملة غير معروفة",
          date: inv.invoiceDate,
          remainingAmount: inv.remainingAmount !== undefined ? inv.remainingAmount : ((inv.totalAmount || 0) - (inv.paidAmount || 0)),
          trType: 'sale'
        }
      })
  }, [invoices, customers, campaigns])

  const supplierDebts = useMemo(() => {
    if (!purchases || !expenses) return []
    const combined: any[] = []
    
    purchases.filter(p => p.paymentType !== "نقد").forEach(p => {
      const supplier = suppliers?.find(s => s.id === p.supplierId)
      const campaign = campaigns?.find(c => c.id === p.campaignId)
      combined.push({
        ...p,
        id: p.id,
        entityName: supplier?.name || "مورد غير معروف",
        campaignName: campaign?.name || "حملة غير معروفة",
        date: p.purchaseDate,
        remainingAmount: p.remainingAmount !== undefined ? p.remainingAmount : ((p.totalAmount || 0) - (p.paidAmount || 0)),
        trType: 'purchase'
      })
    })

    expenses.filter(e => e.paymentType !== "نقد").forEach(e => {
      const supplier = suppliers?.find(s => s.id === e.payeeId)
      const campaign = campaigns?.find(c => c.id === e.campaignId)
      combined.push({
        ...e,
        id: e.id,
        entityName: supplier?.name || e.payeeName || "جهة غير معروفة",
        campaignName: campaign?.name || "حملة غير معروفة",
        date: e.expenseDate,
        remainingAmount: e.remainingAmount || 0,
        totalAmount: e.amount,
        trType: 'expense',
        invoiceNumber: "مصروف"
      })
    })

    return combined
  }, [purchases, expenses, suppliers, campaigns])

  const filteredCustomerTable = useMemo(() => applyFilters(customerDebts), [customerDebts, searchTerm, filterCampaignId, filterDebtStatus, filterEntityId, fromDate, toDate, sortBy])
  const filteredSupplierTable = useMemo(() => applyFilters(supplierDebts), [supplierDebts, searchTerm, filterCampaignId, filterDebtStatus, filterEntityId, fromDate, toDate, sortBy])

  const exportToCSV = () => {
    const dataToExport = activeTab === "customers" ? filteredCustomerTable : filteredSupplierTable
    if (dataToExport.length === 0) return

    const headers = ["رقم الفاتورة", "الجهة / الاسم", "الحملة", "إجمالي المبلغ", "المدفوع", "المتبقي (الدين)", "التاريخ", "الحالة", "ملاحظات"]
    const rows = dataToExport.map(item => [
      item.invoiceNumber || "-",
      item.entityName,
      item.campaignName,
      item.totalAmount || item.amount,
      item.paidAmount || 0,
      item.remainingAmount,
      format(new Date(item.date), "yyyy-MM-dd"),
      item.remainingAmount <= 0 ? "مُسددة" : "ديون قائمة",
      `"${item.notes || item.description || ""}"`
    ])

    let csvContent = "data:text/csv;charset=utf-8,\uFEFF"
    csvContent += headers.join(",") + "\n"
    rows.forEach(row => {
      csvContent += row.join(",") + "\n"
    })

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `Debts_Report_${activeTab}_${format(new Date(), "yyyy-MM-dd")}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleSettleDebt = async () => {
    if (!db || !user || !paymentTarget) return
    const amount = parseFloat(paymentAmount.replace(/,/g, ""))
    if (isNaN(amount) || amount <= 0 || amount > (paymentTarget.remainingAmount + 1)) {
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
      entityId: paymentTarget.customerId || paymentTarget.supplierId || paymentTarget.payeeId,
      entityName: paymentTarget.entityName,
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
            سجل الديون المستحقة
          </h1>
          <Button 
            variant="outline" 
            size="icon" 
            className="rounded-xl border-none bg-muted/50 text-primary"
            onClick={exportToCSV}
          >
            <Download className="w-5 h-5" />
          </Button>
        </div>
        
        <div className="flex gap-2" dir="rtl">
          <div className="relative flex-1 group">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input 
              placeholder="بحث بالاسم أو رقم الفاتورة..."
              className="pr-11 h-12 rounded-2xl bg-muted/30 border-none focus-visible:ring-primary focus-visible:bg-white transition-all shadow-inner text-right" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-12 rounded-2xl px-4 gap-2 border-none bg-muted/30 text-primary font-bold">
                <ArrowUpDown className="w-4 h-4" />
                ترتيب
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

        {/* فلاتر متقدمة */}
        <div className="grid grid-cols-1 gap-3" dir="rtl">
          <div className="bg-muted/20 p-3 rounded-2xl border border-dashed space-y-2">
            <p className="text-[10px] font-bold text-muted-foreground mr-1 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              فلترة حسب المدة الزمنية:
            </p>
            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-bold text-primary/50">من</span>
                <Input type="date" className="h-10 rounded-xl bg-white border-none pr-8 text-[11px] font-bold text-left" value={fromDate} onChange={e => setFromDate(e.target.value)} />
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground opacity-30" />
              <div className="flex-1 relative">
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-bold text-primary/50">إلى</span>
                <Input type="date" className="h-10 rounded-xl bg-white border-none pr-8 text-[11px] font-bold text-left" value={toDate} onChange={e => setToDate(e.target.value)} />
              </div>
              {(fromDate || toDate) && <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl text-destructive" onClick={() => { setFromDate(""); setToDate(""); }}><AlertCircle className="w-4 h-4" /></Button>}
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            <div className="min-w-[120px]">
              <Select value={filterDebtStatus} onValueChange={setFilterDebtStatus}>
                <SelectTrigger className="h-10 rounded-full bg-muted/50 border-none text-[10px] font-bold px-4">
                  <SelectValue placeholder="حالة الدين" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all">الكل (مدفوع وباقي)</SelectItem>
                  <SelectItem value="unpaid">ديون قائمة فقط</SelectItem>
                  <SelectItem value="paid">حسابات مُصفرة</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="min-w-[120px]">
              <Select value={filterEntityId} onValueChange={setFilterEntityId}>
                <SelectTrigger className="h-10 rounded-full bg-muted/50 border-none text-[10px] font-bold px-4">
                   <div className="flex items-center gap-2">
                     <Users className="w-3 h-3 opacity-50" />
                     <SelectValue placeholder={activeTab === 'customers' ? "كل العملاء" : "كل الموردين"} />
                   </div>
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all">الكل</SelectItem>
                  {(activeTab === 'customers' ? customers : suppliers)?.map(e => (
                    <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="min-w-[120px]">
              <Select value={filterCampaignId} onValueChange={setFilterCampaignId}>
                <SelectTrigger className="h-10 rounded-full bg-muted/50 border-none text-[10px] font-bold px-4">
                  <SelectValue placeholder="كل الحملات" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all">الكل</SelectItem>
                  {campaigns?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </header>

      <div className="p-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-20 gap-3"><Loader2 className="w-10 h-10 animate-spin text-primary opacity-50" /><p className="text-xs font-bold text-muted-foreground">جاري تحميل البيانات...</p></div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full" dir="rtl">
            <TabsList className="grid w-full grid-cols-2 h-14 rounded-2xl p-1 mb-6 bg-muted/50 border border-border/50 shadow-inner">
              <TabsTrigger value="customers" className="rounded-xl font-black text-[10px] h-full transition-all data-[state=active]:bg-gradient-to-br data-[state=active]:from-[#123524] data-[state=active]:to-[#236045] data-[state=active]:text-white">ديون لك (عملاء)</TabsTrigger>
              <TabsTrigger value="suppliers" className="rounded-xl font-black text-[10px] h-full transition-all data-[state=active]:bg-gradient-to-br data-[state=active]:from-[#123524] data-[state=active]:to-[#236045] data-[state=active]:text-white">ديون عليك (موردين)</TabsTrigger>
            </TabsList>
            
            <TabsContent value="customers" className="space-y-4 outline-none animate-in fade-in duration-300">
               <div className="bg-white rounded-[2rem] border shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <Table dir="rtl" className="min-w-[1000px]">
                    <TableHeader className="bg-muted/30">
                      <TableRow>
                        <TableHead className="text-right font-black text-[10px] py-4">رقم الفاتورة</TableHead>
                        <TableHead className="text-right font-black text-[10px]">اسم العميل</TableHead>
                        <TableHead className="text-right font-black text-[10px]">الحملة</TableHead>
                        <TableHead className="text-center font-black text-[10px]">إجمالي المبلغ</TableHead>
                        <TableHead className="text-center font-black text-[10px]">المدفوع</TableHead>
                        <TableHead className="text-center font-black text-[10px]">المتبقي (الدين)</TableHead>
                        <TableHead className="text-center font-black text-[10px]">التاريخ</TableHead>
                        <TableHead className="text-center font-black text-[10px]">الحالة</TableHead>
                        <TableHead className="text-left font-black text-[10px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCustomerTable.map((item, index) => (
                        <TableRow key={item.id} className={cn(index % 2 !== 0 ? "bg-muted/5" : "bg-white")}>
                          <TableCell className="text-right py-4">
                            <Badge variant="outline" className="text-[10px] font-black border-primary/20 text-primary bg-primary/5">
                              {item.invoiceNumber || "-"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right text-xs font-bold text-foreground">{item.entityName}</TableCell>
                          <TableCell className="text-right text-[10px] font-bold text-muted-foreground">{item.campaignName}</TableCell>
                          <TableCell className="text-center font-bold text-xs tabular-nums text-muted-foreground">{(item.totalAmount || 0).toLocaleString('en-US')}</TableCell>
                          <TableCell className="text-center font-bold text-xs tabular-nums text-green-700">{(item.paidAmount || 0).toLocaleString('en-US')}</TableCell>
                          <TableCell className="text-center font-black text-xs tabular-nums text-destructive">{(item.remainingAmount || 0).toLocaleString('en-US')}</TableCell>
                          <TableCell className="text-center text-[10px] tabular-nums font-bold text-muted-foreground">{item.date ? format(new Date(item.date), "yyyy/MM/dd") : "-"}</TableCell>
                          <TableCell className="text-center">
                            {item.remainingAmount <= 0 ? (
                              <Badge className="bg-green-100 text-green-700 border-none font-black text-[8px] px-2 py-0.5 rounded-lg flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> حساب مُصفر</Badge>
                            ) : (
                              <Badge variant="outline" className="text-[8px] font-black text-destructive border-destructive/20 bg-destructive/5">دين قائم</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-left">
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" className="w-8 h-8 rounded-lg text-primary" onClick={() => router.push(`/campaigns/${item.campaignId}?tab=sales`)}>
                                <Eye className="w-4 h-4" />
                              </Button>
                              {item.remainingAmount > 0 && (
                                <Button variant="ghost" size="icon" className="w-8 h-8 rounded-lg text-accent" onClick={() => { setPaymentTarget(item); setPaymentAmount(item.remainingAmount.toString()); }}>
                                  <Banknote className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {filteredCustomerTable.length === 0 && <div className="text-center py-20 text-muted-foreground font-bold text-sm bg-muted/5">لا توجد ديون عملاء تطابق الفلاتر</div>}
               </div>
            </TabsContent>

            <TabsContent value="suppliers" className="space-y-4 outline-none animate-in fade-in duration-300">
              <div className="bg-white rounded-[2rem] border shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <Table dir="rtl" className="min-w-[1100px]">
                    <TableHeader className="bg-muted/30">
                      <TableRow>
                        <TableHead className="text-right font-black text-[10px] py-4">رقم الفاتورة</TableHead>
                        <TableHead className="text-right font-black text-[10px]">المورد / الجهة</TableHead>
                        <TableHead className="text-right font-black text-[10px]">الحملة</TableHead>
                        <TableHead className="text-center font-black text-[10px]">إجمالي المبلغ</TableHead>
                        <TableHead className="text-center font-black text-[10px]">المدفوع</TableHead>
                        <TableHead className="text-center font-black text-[10px]">المتبقي (الدين)</TableHead>
                        <TableHead className="text-center font-black text-[10px]">التاريخ</TableHead>
                        <TableHead className="text-center font-black text-[10px]">الحالة</TableHead>
                        <TableHead className="text-left font-black text-[10px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSupplierTable.map((item, index) => (
                        <TableRow key={item.id} className={cn(index % 2 !== 0 ? "bg-muted/5" : "bg-white")}>
                          <TableCell className="text-right py-4">
                            <Badge variant="outline" className="text-[10px] font-black border-orange-200 text-orange-700 bg-orange-50/50">
                              {item.invoiceNumber || "-"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right text-xs font-bold text-foreground">{item.entityName}</TableCell>
                          <TableCell className="text-right text-[10px] font-bold text-muted-foreground">{item.campaignName}</TableCell>
                          <TableCell className="text-center font-bold text-xs tabular-nums text-muted-foreground">{(item.totalAmount || 0).toLocaleString('en-US')}</TableCell>
                          <TableCell className="text-center font-bold text-xs tabular-nums text-green-700">{(item.paidAmount || 0).toLocaleString('en-US')}</TableCell>
                          <TableCell className="text-center font-black text-xs tabular-nums text-destructive">{(item.remainingAmount || 0).toLocaleString('en-US')}</TableCell>
                          <TableCell className="text-center text-[10px] tabular-nums font-bold text-muted-foreground">{item.date ? format(new Date(item.date), "yyyy/MM/dd") : "-"}</TableCell>
                          <TableCell className="text-center">
                            {item.remainingAmount <= 0 ? (
                              <Badge className="bg-green-100 text-green-700 border-none font-black text-[8px] px-2 py-0.5 rounded-lg flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> حساب مُصفر</Badge>
                            ) : (
                              <Badge variant="outline" className="text-[8px] font-black text-destructive border-destructive/20 bg-destructive/5">دين قائم</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-left">
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" className="w-8 h-8 rounded-lg text-primary" onClick={() => router.push(`/campaigns/${item.campaignId}?tab=${item.trType === 'purchase' ? 'purchases' : 'expenses'}`)}>
                                <Eye className="w-4 h-4" />
                              </Button>
                              {item.remainingAmount > 0 && (
                                <Button variant="ghost" size="icon" className="w-8 h-8 rounded-lg text-accent" onClick={() => { setPaymentTarget(item); setPaymentAmount(item.remainingAmount.toString()); }}>
                                  <Banknote className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {filteredSupplierTable.length === 0 && <div className="text-center py-20 text-muted-foreground font-bold text-sm bg-muted/5">لا توجد مديونيات للموردين تطابق الفلاتر</div>}
               </div>
            </TabsContent>
          </Tabs>
        )}
      </div>

      {/* نافذة تسجيل السداد */}
      <Dialog open={!!paymentTarget} onOpenChange={() => setPaymentTarget(null)}>
        <DialogContent className="max-w-[95%] rounded-[2.5rem] mx-auto p-0 overflow-hidden border-none shadow-2xl [&>button]:left-6 [&>button]:right-auto">
          <DialogHeader className="p-8 lux-gradient text-white">
            <DialogTitle className="text-xl font-black text-right flex items-center justify-start gap-3"><Banknote className="w-6 h-6" />تسجيل سداد مالي موثق</DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-6" dir="rtl">
            <div className="grid grid-cols-2 gap-4 p-5 bg-muted/40 rounded-3xl border border-dashed text-right border-primary/20">
              <div className="space-y-1"><span className="text-[10px] text-muted-foreground font-black uppercase tracking-wider">المديونية المتبقية</span><p className="text-lg font-black text-destructive tabular-nums">{paymentTarget?.remainingAmount?.toLocaleString('en-US')} ر.ي</p></div>
              <div className="space-y-1"><span className="text-[10px] text-muted-foreground font-black uppercase tracking-wider">رقم المرجع</span><p className="text-xs font-black text-primary truncate bg-white px-2 py-0.5 rounded-lg inline-block border">{paymentTarget?.invoiceNumber || '-'}</p></div>
            </div>
            
            <div className="space-y-2.5 text-right">
              <Label className="text-sm font-black mr-1 flex items-center gap-2 text-primary"><Coins className="w-5 h-5" />المبلغ المراد سداده الآن</Label>
              <Input type="text" inputMode="decimal" className="h-16 rounded-[1.5rem] text-center text-2xl font-black tabular-nums border-2 focus:ring-primary shadow-inner" value={paymentAmount} onChange={(e) => { const v = e.target.value.replace(/,/g, ""); if (v === "" || /^\d*\.?\d*$/.test(v)) setPaymentAmount(v); }} placeholder="0.00" />
              {parseFloat(paymentAmount) > (paymentTarget?.remainingAmount + 1) && <p className="text-[10px] text-destructive font-black flex items-center gap-1.5 justify-end mt-2 animate-pulse"><AlertCircle className="w-4 h-4" /> خطأ: المبلغ المدخل أكبر من المتبقي</p>}
            </div>

            <div className="grid grid-cols-1 gap-5">
               <div className="space-y-2 text-right"><Label className="text-xs font-black mr-1 flex items-center gap-2 text-muted-foreground"><Calendar className="w-4 h-4 text-primary" />تاريخ السداد</Label><Input type="date" className="h-12 rounded-2xl text-right border-muted-foreground/20" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} /></div>
               <div className="space-y-2 text-right"><Label className="text-xs font-black mr-1 flex items-center gap-2 text-muted-foreground"><FileText className="w-4 h-4 text-primary" />ملاحظات / المستلم</Label><Textarea placeholder="اكتب تفاصيل إضافية..." className="rounded-[1.5rem] resize-none text-right h-28 border-muted-foreground/20 focus:ring-primary" value={paymentNotes} onChange={(e) => setPaymentNotes(e.target.value)} /></div>
            </div>
          </div>
          <DialogFooter className="p-6 bg-muted/30 border-t flex flex-row gap-4">
            <Button variant="outline" className="flex-1 rounded-2xl h-14 font-black border-muted-foreground/20 hover:bg-white text-muted-foreground" onClick={() => setPaymentTarget(null)} disabled={submittingPayment}>إلغاء</Button>
            <Button className="flex-1 rounded-2xl h-14 font-black lux-gradient gap-3 shadow-xl active:scale-95 transition-all" onClick={handleSettleDebt} disabled={submittingPayment || !paymentAmount || parseFloat(paymentAmount) > (paymentTarget?.remainingAmount + 1)}>{submittingPayment ? <Loader2 className="w-6 h-6 animate-spin" /> : <Check className="w-6 h-6" />} تأكيد وحفظ السداد</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <BottomNav />
    </div>
  )
}
