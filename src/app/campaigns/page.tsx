
"use client"

import { Plus, Search, Calendar, Loader2, Archive, CheckCircle2, ChevronRight } from "lucide-react"
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
    <div className="flex flex-col min-h-screen bg-background pb-20">
      <header className="p-6 bg-white border-b sticky top-0 z-10">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">الحملات</h1>
          <Link href="/campaigns/new">
            <Button size="icon" className="rounded-full shadow-lg lux-gradient text-white">
              <Plus className="w-6 h-6" />
            </Button>
          </Link>
        </div>
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="بحث عن حملة..." 
            className="pr-10 h-11 rounded-xl bg-muted/50 border-none" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </header>

      <div className="p-4 space-y-4">
        {isLoading ? (
          <div className="flex justify-center p-10">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredCampaigns && filteredCampaigns.length > 0 ? (
          filteredCampaigns.map((camp: any) => {
            const isCompleted = camp.status === 'completed'
            
            return (
              <Link key={camp.id} href={`/campaigns/${camp.id}`}>
                <Card className={cn(
                  "border-none shadow-sm rounded-2xl overflow-hidden hover:shadow-md transition-all active:scale-[0.98] mb-4 group",
                  isCompleted ? "bg-muted/30" : "bg-white"
                )}>
                  <CardContent className="p-0">
                    <div className="p-5">
                      <div className="flex justify-between items-start mb-4">
                        <div className="space-y-1.5">
                          <h3 className={cn("font-bold text-lg", isCompleted && "text-muted-foreground")}>{camp.name}</h3>
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                            <Calendar className="w-3.5 h-3.5 text-primary" />
                            <span>
                              {camp.startDate ? format(new Date(camp.startDate), "PPP", { locale: ar }) : "بدون تاريخ"}
                            </span>
                          </div>
                        </div>
                        <Badge 
                          variant={isCompleted ? 'secondary' : 'default'} 
                          className={cn(
                            "rounded-full px-3 py-1 font-bold text-[10px]",
                            !isCompleted && "lux-gradient text-white"
                          )}
                        >
                          {isCompleted ? (
                            <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> مكتملة</span>
                          ) : (
                            <span className="flex items-center gap-1">نشطة</span>
                          )}
                        </Badge>
                      </div>
                      
                      <div className="flex justify-between items-center pt-4 border-t border-border/50">
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "w-2 h-2 rounded-full animate-pulse",
                            isCompleted ? "bg-muted-foreground" : "bg-accent"
                          )} />
                          <p className="text-[10px] text-muted-foreground font-bold">
                            {isCompleted ? 'هذه الحملة مؤرشفة' : 'الحملة قيد التشغيل حالياً'}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 text-primary font-bold text-xs">
                          <span>عرض التفاصيل</span>
                          <ChevronRight className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })
        ) : (
          <div className="text-center p-12 bg-white rounded-3xl border border-dashed border-muted-foreground/30 text-muted-foreground text-sm space-y-2">
            <Archive className="w-10 h-10 mx-auto opacity-20" />
            <p>لا توجد حملات مسجلة حالياً</p>
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  )
}
