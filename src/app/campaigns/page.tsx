
"use client"

import { Plus, Search, Calendar, Loader2, Archive, CheckCircle2, ChevronRight, Ship, ChevronLeft } from "lucide-react"
import { BottomNav } from "@/components/layout/BottomNav"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useFirestore, useCollection, useUser, useMemoFirebase } from "@/firebase"
import { collection, query, orderBy } from "firebase/firestore"
import { useRouter, useSearchParams } from "next/navigation"
import { useState, Suspense } from "react"
import { format } from "date-fns"
import { ar } from "date-fns/locale"
import { cn } from "@/lib/utils"
import Link from "next/link"

function CampaignsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const db = useFirestore()
  const { user } = useUser()
  const [searchTerm, setSearchTerm] = useState("")
  
  // التحقق مما إذا كان المستخدم في عرض الأرشيف
  const statusFilter = searchParams.get('status')
  const isArchiveView = statusFilter === 'completed'

  const campaignsQuery = useMemoFirebase(() => {
    if (!db || !user) return null
    return query(collection(db, "users", user.uid, "campaigns"), orderBy("createdAt", "desc"))
  }, [db, user])

  const { data: campaigns, isLoading } = useCollection(campaignsQuery)

  const filteredCampaigns = campaigns?.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = isArchiveView ? c.status === 'completed' : c.status !== 'completed'
    return matchesSearch && matchesStatus
  })

  return (
    <div className="flex flex-col min-h-screen bg-background pb-24">
      <header className="p-6 bg-white border-b sticky top-0 z-30 shadow-sm space-y-4">
        <div className="flex justify-between items-center">
          {isArchiveView && (
            <button onClick={() => router.push("/campaigns")} className="p-2 -mr-2">
              <ChevronLeft className="w-6 h-6 rotate-180" />
            </button>
          )}
          <div className="flex flex-col text-right flex-1">
            <h1 className="text-2xl font-black text-primary flex items-center gap-2">
              {isArchiveView ? (
                <>
                  <Archive className="w-6 h-6 text-orange-600" />
                  أرشيف الحملات
                </>
              ) : (
                <>
                  <Ship className="w-6 h-6" />
                  الحملات النشطة
                </>
              )}
            </h1>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
              {isArchiveView ? "مراجعة الرحلات والعمليات السابقة" : "إدارة رحلات البيع والتشغيل الحالية"}
            </p>
          </div>
          {!isArchiveView && (
            <Link href="/campaigns/new">
              <Button size="icon" className="rounded-2xl shadow-lg lux-gradient text-white w-12 h-12">
                <Plus className="w-7 h-7" />
              </Button>
            </Link>
          )}
        </div>
        
        <div className="relative group" dir="rtl">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input 
            placeholder={isArchiveView ? "بحث في الأرشيف..." : "بحث عن اسم الحملة..."}
            className="pr-11 h-12 rounded-2xl bg-muted/50 border-none focus-visible:ring-primary focus-visible:bg-white transition-all shadow-inner text-right" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </header>

      <div className="p-4 space-y-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-20 gap-3">
            <Loader2 className="w-10 h-10 animate-spin text-primary opacity-50" />
            <p className="text-xs font-bold text-muted-foreground">جاري تحميل البيانات...</p>
          </div>
        ) : filteredCampaigns && filteredCampaigns.length > 0 ? (
          filteredCampaigns.map((camp: any) => {
            const isCompleted = camp.status === 'completed'
            
            return (
              <Link key={camp.id} href={`/campaigns/${camp.id}`} className="block">
                <Card className={cn(
                  "border-none shadow-md rounded-[2rem] transition-all active:scale-[0.98] overflow-hidden",
                  isCompleted ? "bg-muted/40" : "bg-white"
                )}>
                  <CardContent className="p-5 flex flex-col gap-4">
                    <div className="flex justify-between items-start">
                      <div className="text-right space-y-1.5">
                        <h3 className={cn(
                          "font-black text-lg tracking-tight",
                          isCompleted ? "text-muted-foreground" : "text-primary"
                        )}>
                          {camp.name}
                        </h3>
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground/70">
                          <Calendar className="w-3.5 h-3.5 text-primary/60" />
                          <span>
                            {camp.startDate ? format(new Date(camp.startDate), "dd MMMM yyyy", { locale: ar }) : "بدون تاريخ"}
                          </span>
                        </div>
                      </div>

                      <Badge 
                        className={cn(
                          "rounded-xl px-3 py-1 font-black text-[10px] shadow-none border-none",
                          isCompleted 
                            ? "bg-secondary text-secondary-foreground" 
                            : "bg-accent/10 text-accent"
                        )}
                      >
                        {isCompleted ? (
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            مكتملة
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                            نشطة
                          </span>
                        )}
                      </Badge>
                    </div>
                    
                    <div className="flex justify-between items-center pt-3 border-t border-dashed border-border/60">
                      <p className="text-[10px] text-muted-foreground font-bold">
                        {isCompleted ? 'حملة مؤرشفة للرجوع المالي' : 'قيد التشغيل والبيع حالياً'}
                      </p>
                      <div className={cn(
                        "flex items-center gap-1 font-black text-[11px]",
                        isCompleted ? "text-muted-foreground" : "text-primary"
                      )}>
                        <span>التفاصيل</span>
                        <ChevronRight className="w-3.5 h-3.5 rotate-180" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })
        ) : (
          <div className="flex flex-col items-center justify-center p-16 bg-white/50 rounded-[3rem] border-2 border-dashed border-muted-foreground/20 text-center space-y-4">
            <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center">
              {isArchiveView ? <Archive className="w-10 h-10 text-muted-foreground/40" /> : <Ship className="w-10 h-10 text-muted-foreground/40" />}
            </div>
            <div className="space-y-1">
              <p className="font-black text-muted-foreground">
                {isArchiveView ? "لا توجد حملات مؤرشفة" : "لا توجد حملات نشطة"}
              </p>
              <p className="text-[10px] text-muted-foreground/60 font-bold uppercase tracking-tight px-4 leading-relaxed">
                {isArchiveView ? "عند إكمال حملة نشطة وأرشفتها ستظهر هنا للتوثيق التاريخي" : "ابدأ بإضافة أول حملة لرحلتك القادمة وبدء عمليات البيع والشراء"}
              </p>
            </div>
            {!isArchiveView && (
              <Link href="/campaigns/new">
                <Button variant="outline" className="rounded-2xl border-primary/20 text-primary font-bold hover:bg-primary/5">
                  إضافة حملة جديدة
                </Button>
              </Link>
            )}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  )
}

export default function CampaignsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="animate-spin text-primary" /></div>}>
      <CampaignsContent />
    </Suspense>
  )
}
