
"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { BottomNav } from "@/components/layout/BottomNav"
import { QuickActions } from "@/components/dashboard/QuickActions"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowUpRight, ArrowDownRight, Wallet, Eye, EyeOff, Loader2 } from "lucide-react"
import { PlaceHolderImages } from "@/lib/placeholder-images"
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, limit, orderBy } from "firebase/firestore"

export default function Home() {
  const { user, isUserLoading } = useUser()
  const db = useFirestore()
  const [mounted, setMounted] = useState(false)
  const [visibility, setVisibility] = useState<Record<string, boolean>>({
    profit: false,
    debtsToMe: false,
    debtsByMe: false,
  })

  // Prevent hydration errors by ensuring we only render browser-specific logic after mount
  useEffect(() => {
    setMounted(true)
  }, [])

  const logo = PlaceHolderImages.find(img => img.id === 'app-logo')

  const toggleVisibility = (key: string) => {
    setVisibility(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const formatAmount = (key: string, amount: number) => {
    if (!mounted) return "*****"
    return visibility[key] ? amount.toLocaleString('ar-YE') : "*****"
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

  if (!mounted || isUserLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

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
                  data-ai-hint={logo.imageHint}
                />
              )}
            </div>
            <h1 className="text-2xl font-black tracking-tight">أبو صابر</h1>
          </div>
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
            {formatAmount("profit", 2450000)} <span className="text-lg font-normal opacity-80">ر.ي</span>
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
                  {formatAmount("debtsToMe", 840000)} <span className="text-xs font-normal">ر.ي</span>
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
                  {formatAmount("debtsByMe", 320000)} <span className="text-xs font-normal">ر.ي</span>
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
              <div>
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wide">السيولة الحالية</p>
                <p className="text-2xl font-black tabular-nums">
                  1,215,000 <span className="text-sm font-normal opacity-70">ر.ي</span>
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
                    {item.invoiceDate ? new Date(item.invoiceDate).toLocaleDateString('ar-YE') : 'بدون تاريخ'}
                  </span>
                </div>
                <span className="font-black text-sm tabular-nums text-green-600">
                  + {item.totalAmount?.toLocaleString('ar-YE')} ر.ي
                </span>
              </div>
            ))
          ) : (
            <div className="text-center py-10 text-muted-foreground text-xs bg-white rounded-[1.5rem] border border-dashed">
              لا توجد فواتير مسجلة حالياً
            </div>
          )}
        </div>
      </section>

      <BottomNav />
    </div>
  )
}
