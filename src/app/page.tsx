
"use client"

import { useState, useEffect, useMemo } from "react"
import Image from "next/image"
import { BottomNav } from "@/components/layout/BottomNav"
import { AppSidebar } from "@/components/layout/AppSidebar"
import { QuickActions } from "@/components/dashboard/QuickActions"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  Wallet, 
  Eye, 
  EyeOff, 
  Loader2, 
  Menu, 
  Copy,
  Sparkles,
  Database
} from "lucide-react"
import { PlaceHolderImages } from "@/lib/placeholder-images"
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, orderBy, getDocs, doc, writeBatch } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"

export default function Home() {
  const { user } = useUser()
  const db = useFirestore()
  const { toast } = useToast()
  const [mounted, setMounted] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [showRestore, setShowRestore] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [visibility, setVisibility] = useState<Record<string, boolean>>({
    debtsToMe: false,
    debtsByMe: false,
    liquidity: false,
  })

  useEffect(() => {
    setMounted(true)
  }, [])

  const logo = PlaceHolderImages.find(img => img.id === 'app-logo')

  const toggleVisibility = (key: string) => {
    setVisibility(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const formatAmountValue = (key: string, amount: number = 0) => {
    if (!mounted) return "*****"
    return visibility[key] ? amount.toLocaleString('en-US') : "*****"
  }

  // استعلامات البيانات للوحة التحكم
  const invoicesQuery = useMemoFirebase(() => {
    if (!db || !user) return null
    return query(collection(db, "users", user.uid, "invoices"), orderBy("createdAt", "desc"))
  }, [db, user])
  const { data: allInvoices, isLoading: loadingInvoices } = useCollection(invoicesQuery)

  const purchasesQuery = useMemoFirebase(() => {
    if (!db || !user) return null
    return query(collection(db, "users", user.uid, "purchases"))
  }, [db, user])
  const { data: allPurchases } = useCollection(purchasesQuery)

  const expensesQuery = useMemoFirebase(() => {
    if (!db || !user) return null
    return query(collection(db, "users", user.uid, "expenses"))
  }, [db, user])
  const { data: allExpenses } = useCollection(expensesQuery)

  // إظهار قسم استعادة البيانات إذا كان النظام فارغاً
  useEffect(() => {
    if (mounted && allInvoices && allPurchases && allExpenses) {
      if (allInvoices.length === 0 && allPurchases.length === 0 && allExpenses.length === 0) {
        setShowRestore(true)
      } else {
        setShowRestore(false)
      }
    }
  }, [mounted, allInvoices, allPurchases, allExpenses])

  const stats = useMemo(() => {
    const totalRev = allInvoices?.reduce((acc, inv) => acc + (inv.totalAmount || 0), 0) || 0
    const totalRevPaid = allInvoices?.reduce((acc, inv) => acc + (inv.paidAmount || 0), 0) || 0
    const debtsToMe = totalRev - totalRevPaid

    const totalPurCost = allPurchases?.reduce((acc, p) => acc + (p.totalAmount || 0), 0) || 0
    const totalPurPaid = allPurchases?.reduce((acc, p) => acc + (p.paidAmount || 0), 0) || 0
    
    const totalExpCost = allExpenses?.reduce((acc, e) => acc + (e.amount || 0), 0) || 0
    const totalExpPaid = allExpenses?.reduce((acc, e) => acc + (e.paidAmount || 0), 0) || 0
    
    const debtsByMe = (totalPurCost - totalPurPaid) + (totalExpCost - totalExpPaid)
    const liquidity = totalRevPaid - (totalPurPaid + totalExpPaid)
    
    return { debtsToMe, debtsByMe, liquidity }
  }, [allInvoices, allPurchases, allExpenses])

  // وظيفة استعادة بيانات الديمو
  const restoreDemoData = async () => {
    if (!db || !user) return
    setRestoring(true)
    const SHARED_UID = "luJcA2AwKHYdXbeU9GvietyCkeu2"
    const collectionsToCopy = ["campaigns", "customers", "suppliers", "fishTypes", "invoices", "purchases", "expenses", "paymentTransactions"]
    
    try {
      const batch = writeBatch(db)
      for (const colName of collectionsToCopy) {
        const sharedRef = collection(db, "users", SHARED_UID, colName)
        const snap = await getDocs(sharedRef)
        snap.docs.forEach(docSnap => {
          const newDocRef = doc(db, "users", user.uid, colName, docSnap.id)
          batch.set(newDocRef, { ...docSnap.data(), userId: user.uid })
        })
      }
      await batch.commit()
      toast({ title: "تم استعادة بيانات العرض بنجاح" })
      setShowRestore(false)
    } catch (e) {
      toast({ variant: "destructive", title: "فشل استعادة البيانات" })
    } finally {
      setRestoring(false)
    }
  }

  const copyUid = () => {
    if (user?.uid) {
      navigator.clipboard.writeText(user.uid)
      toast({ title: "تم نسخ معرف المستخدم" })
    }
  }

  if (!mounted) return null

  const recentInvoices = allInvoices?.slice(0, 5) || []

  return (
    <div className="flex flex-col min-h-screen bg-background pb-24">
      <AppSidebar open={isSidebarOpen} onOpenChange={setIsSidebarOpen} />
      
      <header className="p-6 pb-20 lux-gradient text-white rounded-b-[2.5rem] shadow-2xl mb-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] pointer-events-none"></div>
        <div className="flex justify-between items-center relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-inner overflow-hidden">
              {logo && (
                <Image 
                  src={logo.imageUrl} 
                  alt="Logo" 
                  width={48} 
                  height={48} 
                  className="object-cover"
                  data-ai-hint="fish logo"
                />
              )}
            </div>
            <h1 className="text-2xl font-black tracking-tight">أبو صابر</h1>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 transition-all active:scale-95"
          >
            <Menu className="w-7 h-7" />
          </button>
        </div>
      </header>

      {/* قسم استعادة البيانات (بدون زر إغلاق) */}
      {showRestore && (
        <section className="px-4 -mt-12 mb-8 relative z-30 animate-in fade-in slide-in-from-top-4 duration-500">
          <Card className="border-none shadow-xl rounded-[2.5rem] bg-orange-50 border border-orange-100 overflow-hidden">
            <CardContent className="p-6 flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center text-orange-600 shadow-sm">
                <Database className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="font-black text-orange-900 text-lg">تجربة النظام ببيانات جاهزة؟</h3>
                <p className="text-xs text-orange-700 font-bold leading-relaxed">يمكنك استيراد بيانات ديمو (حملات، مبيعات، مشتريات) لتبدأ بتجربة كافة ميزات النظام فوراً.</p>
              </div>
              <Button 
                onClick={restoreDemoData} 
                disabled={restoring}
                className="w-full h-14 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-black shadow-lg gap-2"
              >
                {restoring ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                استعادة بيانات العرض الآن
              </Button>
            </CardContent>
          </Card>
        </section>
      )}

      <section className="px-4 -mt-14 mb-8 relative z-20">
        <div className="grid grid-cols-2 gap-4">
          <Card className="border-none shadow-xl rounded-[2rem] bg-white/80 backdrop-blur-md">
            <CardContent className="p-5 flex flex-col gap-3">
              <div className="flex items-center gap-2 text-green-700">
                <ArrowUpRight className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase tracking-wide">ديون لك</span>
              </div>
              <div className="flex justify-between items-center">
                <button onClick={() => toggleVisibility('debtsToMe')} className="p-1.5 rounded-full bg-secondary/50">
                  {visibility['debtsToMe'] ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4 text-muted-foreground" />}
                </button>
                <p className="text-lg font-black text-green-700 tabular-nums">
                  {formatAmountValue("debtsToMe", stats.debtsToMe)}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl rounded-[2rem] bg-white/80 backdrop-blur-md">
            <CardContent className="p-5 flex flex-col gap-3">
              <div className="flex items-center gap-2 text-red-700">
                <ArrowDownRight className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase tracking-wide">ديون عليك</span>
              </div>
              <div className="flex justify-between items-center">
                <button onClick={() => toggleVisibility('debtsByMe')} className="p-1.5 rounded-full bg-secondary/50">
                  {visibility['debtsByMe'] ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4 text-muted-foreground" />}
                </button>
                <p className="text-lg font-black text-red-700 tabular-nums">
                  {formatAmountValue("debtsByMe", stats.debtsByMe)}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="px-4 mb-8">
        <Card className="border-none shadow-lg rounded-[2rem] bg-gradient-to-r from-accent/20 to-transparent border-r-4 border-accent">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="flex items-center gap-5">
              <div className="p-3.5 bg-white shadow-sm text-accent rounded-2xl">
                <Wallet className="w-6 h-6" />
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wide">السيولة الحالية</p>
                  <button onClick={() => toggleVisibility('liquidity')} className="p-0.5 opacity-50">
                    {visibility['liquidity'] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  </button>
                </div>
                <p className="text-2xl font-black tabular-nums">
                  {formatAmountValue("liquidity", stats.liquidity)} <span className="text-sm font-normal opacity-70">ر.ي</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="mb-8">
        <h2 className="px-6 text-lg font-black mb-4">روابط سريعة</h2>
        <QuickActions />
      </section>

      <section className="px-4 mb-8">
        <div className="flex justify-between items-center mb-5 px-2">
          <h2 className="text-lg font-black">آخر الفواتير</h2>
        </div>
        <div className="space-y-4">
          {loadingInvoices ? (
            <div className="flex justify-center p-4">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : recentInvoices.length > 0 ? (
            recentInvoices.map((item: any) => (
              <div key={item.id} className="flex justify-between items-center p-5 bg-white rounded-[1.5rem] border border-border/40 shadow-sm hover:shadow-md transition-all active:scale-[0.98]">
                <div className="flex flex-col gap-0.5">
                  <span className="font-bold text-sm">فاتورة مبيعات {item.invoiceNumber || `#${item.id.substring(0, 5)}`}</span>
                  <span className="text-[10px] text-muted-foreground font-medium uppercase">
                    {item.invoiceDate ? new Date(item.invoiceDate).toLocaleDateString('en-US') : 'بدون تاريخ'}
                  </span>
                </div>
                <span className="font-black text-sm tabular-nums text-green-600">
                  + {item.totalAmount?.toLocaleString('en-US')} ر.ي
                </span>
              </div>
            ))
          ) : (
            <div className="text-center py-12 text-muted-foreground text-xs bg-white rounded-[1.5rem] border border-dashed font-bold opacity-60">
              لا توجد فواتير مسجلة حالياً
            </div>
          )}
        </div>
      </section>

      <footer className="px-6 py-8 mt-auto border-t border-dashed opacity-40">
        <div className="flex flex-col items-center gap-2">
          <p className="text-[8px] font-bold uppercase tracking-widest text-center">معرف المستخدم (UID)</p>
          <button onClick={copyUid} className="flex items-center gap-2 bg-muted px-3 py-1.5 rounded-full">
            <span className="text-[10px] font-mono truncate max-w-[200px]">{user?.uid}</span>
            <Copy className="w-3 h-3" />
          </button>
        </div>
      </footer>

      <BottomNav />
    </div>
  )
}
