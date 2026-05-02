
"use client"

import { Plus, Search, Calendar, Loader2, Archive, CheckCircle2, ChevronRight, Ship } from "lucide-react"
import { BottomNav } from "@/components/layout/BottomNav"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useFirestore, useCollection, useUser, useMemoFirebase } from "@/firebase"
import { collection, query, orderBy } from "firebase/firestore"
import Link from "next/link"
import { useState } from "react"
import { format } from "date-fns"
import { ar } from "date-fns/locale"
import { cn } from "@/lib/utils"

export default function CampaignsPage() {
  const db = useFirestore()
  const { user } = useUser()
  const [searchTerm, setSearchTerm] = useState("")

  const campaignsQuery = useMemoFirebase(() => {
    if (!db || !user) return null
    return query(collection(db, "users", user.uid, "campaigns"), orderBy("createdAt", "desc"))
  }, [db, user])

  const { data: campaigns, isLoading } = useCollection(campaignsQuery)

  const filteredCampaigns = campaigns?.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="flex flex-col min-h-screen bg-background pb-24">
      <header className="p-6 bg-white border-b sticky top-0 z-30 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <div className="flex flex-col">
            <h1 className="text-2xl font-black text-primary">الحملات</h1>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">إدارة رحلات البيع والتشغيل</p>
          </div>
          <Link href="/campaigns/new">
            <Button size="icon" className="rounded-2xl shadow-lg lux-gradient text-white w-12 h-12">
              <Plus className="w-7 h-7" />
            </Button>
          </Link>
        </div>
        <div className="relative group">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input 
            placeholder="بحث عن اسم الحملة..." 
            className="pr-11 h-12 rounded-2xl bg-muted/50 border-none focus-visible:ring-primary focus-visible:bg-white transition-all shadow-inner" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </header>

      <div className="p-4 space-y-3">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-20 gap-3">
            <Loader2 className="w-10 h-10 animate-spin text-primary opacity-50" />
            <p className="text-xs font-bold text-muted-foreground">جاري تحميل الحملات...</p>
          </div>
        ) : filteredCampaigns && filteredCampaigns.length > 0 ? (
          filteredCampaigns.map((camp: any) => {
            const isCompleted = camp.status === 'completed'
            
            return (
              <Link key={camp.id} href={`/campaigns/${camp.id}`}>
                <Card className={cn(
                  "border-none shadow-sm rounded-2xl overflow-hidden transition-all duration-300 active:scale-[0.98] hover:shadow-md group relative",
                  isCompleted ? "bg-muted/30 grayscale-[0.5]" : "bg-white"
                )}>
                  <CardContent className="p-0">
                    <div className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div className="space-y-1">
                          <h3 className={cn(
                            "font-black text-base leading-tight transition-colors", 
                            isCompleted ? "text-muted-foreground" : "text-foreground group-hover:text-primary"
                          )}>
                            {camp.name}
                          </h3>
                          <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground/80">
                            <Calendar className="w-3 h-3 text-primary/70" />
                            <span>
                              {camp.startDate ? format(new Date(camp.startDate), "PPP", { locale: ar }) : "بدون تاريخ"}
                            </span>
                          </div>
                        </div>
                        <Badge 
                          className={cn(
                            "rounded-xl px-3 py-1 font-black text-[9px] shadow-none border-none",
                            isCompleted 
                              ? "bg-secondary text-secondary-foreground" 
                              : "bg-accent/10 text-accent"
                          )}
                        >
                          {isCompleted ? (
                            <span className="flex items-center gap-1">
                              <CheckCircle2 className="w-2.5 h-2.5" />
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
                      
                      <div className="flex justify-between items-center pt-3 border-t border-border/40">
                        <p className="text-[10px] text-muted-foreground font-bold">
                          {isCompleted ? 'حملة مؤرشفة' : 'قيد التشغيل والبيع'}
                        </p>
                        <div className={cn(
                          "flex items-center gap-1 font-black text-[10px] transition-transform group-hover:translate-x-[-2px]",
                          isCompleted ? "text-muted-foreground" : "text-primary"
                        )}>
                          <span>التفاصيل</span>
                          <ChevronRight className="w-3 h-3" />
                        </div>
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
              <Archive className="w-10 h-10 text-muted-foreground/40" />
            </div>
            <div className="space-y-1">
              <p className="font-black text-muted-foreground">لا توجد حملات</p>
              <p className="text-[10px] text-muted-foreground/60 font-bold uppercase tracking-tight">ابدأ بإضافة أول حملة لرحلتك القادمة</p>
            </div>
            <Link href="/campaigns/new">
              <Button variant="outline" className="rounded-2xl border-primary/20 text-primary font-bold hover:bg-primary/5">
                إضافة حملة جديدة
              </Button>
            </Link>
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  )
}
