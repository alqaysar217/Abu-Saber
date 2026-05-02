"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { BottomNav } from "@/components/layout/BottomNav"
import { QuickActions } from "@/components/dashboard/QuickActions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  Wallet, 
  Eye, 
  EyeOff, 
  Loader2, 
  LogOut, 
  Copy, 
  RefreshCw, 
  History,
  AlertTriangle,
  CheckCircle2
} from "lucide-react"
import { PlaceHolderImages } from "@/lib/placeholder-images"
import { useUser, useFirestore, useCollection, useMemoFirebase, useAuth } from "@/firebase"
import { collection, query, limit, orderBy, getDocs, setDoc, doc } from "firebase/firestore"
import { signOut } from "firebase/auth"
import { useToast } from "@/hooks/use-toast"

export default function Home() {
  const { user } = useUser()
  const auth = useAuth()
  const db = useFirestore()
  const { toast } = useToast()
  const [mounted, setMounted] = useState(false)
  const [migrating, setMigrating] = useState(false)
  const [migrationDone, setMigrationDone] = useState(false)
  const [visibility, setVisibility] = useState<Record<string, boolean>>({
    profit: false,
    debtsToMe: false,
    debtsByMe: false,
  })

  useEffect(() => {
    setMounted(true)
  }, [])

  const logo = PlaceHolderImages.find(img => img.id === 'app-logo')

  const toggleVisibility = (key: string) => {
    setVisibility(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const formatAmount = (key: string, amount: number = 0) => {
    if (!mounted) return "*****"
    return visibility[key] ? amount.toLocaleString('en-US') : "*****"
  }

  const invoicesQuery = useMemoFirebase(() => {
    if (!db || !user) return null
    return query(
      collection(db, "users", user.uid, "invoices"),
      orderBy("createdAt", "desc"),
      limit(3)
    )
  }, [db, user])

  const { data: recentInvoices, isLoading: loadingInvoices } = useCollection(invoicesQuery)

  const handleLogout = () => {
    if (auth) signOut(auth)
  }

  const copyUid = () => {
    if (user?.uid) {
      navigator.clipboard.writeText(user.uid)
      toast({ title: "تم نسخ معرف المستخدم", description: "يمكنك الآن استخدامه في لوحة التحكم" })
    }
  }

  const handleRestoreData = async () => {
    if (!db || !user) return
    setMigrating(true)
    
    const demoUid = 'luJcA2AwKHYdXbeU9GvietyCkeu2'
    const collectionsToMigrate = ['customers', 'suppliers', 'campaigns', 'expenses', 'invoices', 'purchases']
    
    try {
      let totalDocs = 0
      for (const colName of collectionsToMigrate) {
        const demoColRef = collection(db, 'users', demoUid, colName)
        const snapshot = await getDocs(demoColRef)
        
        for (const docSnap of snapshot.docs) {
          const data = docSnap.data()
          const newDocRef = doc(db, 'users', user.uid, colName, docSnap.id)
          await setDoc(newDocRef, { ...data, userId: user.uid, migratedFrom: demoUid })
          
          // Sub-collections for invoices and purchases
          if (colName === 'invoices' || colName === 'purchases') {
            const subColRef = collection(db, 'users', demoUid, colName, docSnap.id, 'items')
            const subSnapshot = await getDocs(subColRef)
            for (const subDocSnap of subSnapshot.docs) {
              const subData = subDocSnap.data()
              const newSubDocRef = doc(db, 'users', user.uid, colName, docSnap.id, 'items', subDocSnap.id)
              await setDoc(newSubDocRef, { ...subData, userId: user.uid })
            }
          }
          totalDocs++
        }
      }
      
      toast({ 
        title: "تمت الاستعادة بنجاح", 
        description: `تم نقل ${totalDocs} سجل من الحساب التجريبي إلى حسابك الحالي.` 
      })
      setMigrationDone(true)
      window.location.reload() // Reload to refresh all data
    } catch (e: any) {
      console.error(e)
      toast({ 
        variant: "destructive", 
        title: "فشل الاستعادة", 
        description: "تأكد من اتصالك بالإنترنت وحاول مرة أخرى." 
      })
    } finally {
      setMigrating(false)
    }
  }

  if (!mounted) return null

  // Show migration tool if account is new (no invoices)
  const showRestoreTool = recentInvoices && recentInvoices.length === 0 && !migrationDone && user?.uid !== 'luJcA2AwKHYdXbeU9GvietyCkeu2'

  return (
    <div className="flex flex-col min-h-screen bg-background pb-24">
      <header className="p-6 lux-gradient text-white rounded-b-[2.5rem] shadow-2xl mb-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] pointer-events-none"></div>
        <div className="flex justify-between items-center mb-8 relative z-10">
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
            onClick={handleLogout}
            className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
        <div className="space-y-1 relative z-10">
          <div className="flex items-center gap-2">
            <p className="text-white/70 text-xs font-medium uppercase tracking-wider">إجمالي الأرباح التقديرية</p>
            <button 
              onClick={() => toggleVisibility('profit')}
              className="p-1 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            >
              {visibility['profit'] ? <EyeOff className="w-3 h-3 text-white" /> : <Eye className="w-3 h-3 text-white" />}
            </button>
          </div>
          <p className="text-4xl font-black tabular-nums tracking-tighter">
            {formatAmount("profit", 0)} <span className="text-lg font-normal opacity-80">ر.ي</span>
          </p>
        </div>
      </header>

      <section className="px-4 -mt-14 mb-8 relative z-20">
        <div className="grid grid-cols-2 gap-4">
          <Card className="border-none shadow-xl rounded-[2rem] bg-white/80 backdrop-blur-md">
            <CardContent className="p-5 flex flex-col gap-3">
              <div className="flex justify-between items-start">
                <div className="p-2.5 bg-green-50 text-green-700 rounded-2xl w-fit">
                  <ArrowUpRight className="w-5 h-5" />
                </div>
                <button 
                  onClick={() => toggleVisibility('debtsToMe')}
                  className="p-1.5 rounded-full bg-secondary/50 hover:bg-secondary transition-colors"
                >
                  {visibility['debtsToMe'] ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4 text-muted-foreground" />}
                </button>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wide mb-1">ديون لك</p>
                <p className="text-xl font-black text-green-700 tabular-nums">
                  {formatAmount("debtsToMe", 0)} <span className="text-xs font-normal">ر.ي</span>
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-xl rounded-[2rem] bg-white/80 backdrop-blur-md">
            <CardContent className="p-5 flex flex-col gap-3">
              <div className="flex justify-between items-start">
                <div className="p-2.5 bg-red-50 text-red-700 rounded-2xl w-fit">
                  <ArrowDownRight className="w-5 h-5" />
                </div>
                <button 
                  onClick={() => toggleVisibility('debtsByMe')}
                  className="p-1.5 rounded-full bg-secondary/50 hover:bg-secondary transition-colors"
                >
                  {visibility['debtsByMe'] ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4 text-muted-foreground" />}
                </button>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wide mb-1">ديون عليك</p>
                <p className="text-xl font-black text-red-700 tabular-nums">
                  {formatAmount("debtsByMe", 0)} <span className="text-xs font-normal">ر.ي</span>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {showRestoreTool && (
        <section className="px-4 mb-8 animate-in zoom-in-95 duration-500">
          <Card className="border-2 border-dashed border-orange-200 bg-orange-50/30 rounded-[2rem] overflow-hidden">
            <CardHeader className="p-5 pb-2 text-right">
              <CardTitle className="text-sm font-bold flex items-center justify-end gap-2 text-orange-700">
                استعادة بياناتك التجريبية
                <History className="w-4 h-4" />
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <p className="text-[11px] text-orange-800/80 leading-relaxed font-bold text-right">
                هل تريد استعادة البيانات التي سجلتها سابقاً؟ يمكننا نقل كافة السجلات من الحساب القديم (luJc...e2) إلى حسابك الحالي فوراً.
              </p>
              <Button 
                onClick={handleRestoreData} 
                disabled={migrating}
                className="w-full h-12 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-black shadow-lg gap-2"
              >
                {migrating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    جاري نقل البيانات...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    نعم، استعد بياناتي الآن
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </section>
      )}

      <section className="px-4 mb-8">
        <Card className="border-none shadow-lg rounded-[2rem] bg-gradient-to-r from-accent/20 to-transparent border-r-4 border-accent">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="flex items-center gap-5">
              <div className="p-3.5 bg-white shadow-sm text-accent rounded-2xl">
                <Wallet className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wide">السيولة الحالية</p>
                <p className="text-2xl font-black tabular-nums">
                  0 <span className="text-sm font-normal opacity-70">ر.ي</span>
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
          ) : recentInvoices && recentInvoices.length > 0 ? (
            recentInvoices.map((item: any) => (
              <div key={item.id} className="flex justify-between items-center p-5 bg-white rounded-[1.5rem] border border-border/40 shadow-sm hover:shadow-md transition-all active:scale-[0.98]">
                <div className="flex flex-col gap-0.5">
                  <span className="font-bold text-sm">فاتورة مبيعات #{item.id.substring(0, 5)}</span>
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
            <div className="text-center py-10 text-muted-foreground text-xs bg-white rounded-[1.5rem] border border-dashed">
              لا توجد فواتير مسجلة حالياً لهذه الجلسة
            </div>
          )}
        </div>
      </section>

      <footer className="px-6 py-8 mt-auto border-t border-dashed opacity-40">
        <div className="flex flex-col items-center gap-2">
          <p className="text-[8px] font-bold uppercase tracking-widest text-center">معرف الجلسة الحالية (UID)</p>
          <button 
            onClick={copyUid}
            className="flex items-center gap-2 bg-muted px-3 py-1.5 rounded-full hover:bg-muted/80 transition-colors"
          >
            <span className="text-[10px] font-mono truncate max-w-[200px]">{user?.uid}</span>
            <Copy className="w-3 h-3" />
          </button>
          <p className="text-[8px] text-center max-w-xs">هذا الرمز يساعدك في العثور على بياناتك في لوحة تحكم فايربيس.</p>
        </div>
      </footer>

      <BottomNav />
    </div>
  )
}