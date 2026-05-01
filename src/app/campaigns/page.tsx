
"use client"

import { Plus, Search, Calendar, Loader2 } from "lucide-react"
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
            <Button size="icon" className="rounded-full shadow-lg">
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
          filteredCampaigns.map((camp: any) => (
            <Link key={camp.id} href={`/campaigns/${camp.id}`}>
              <Card className="border-none shadow-sm rounded-2xl overflow-hidden hover:shadow-md transition-shadow mb-4">
                <CardContent className="p-0">
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="space-y-1">
                        <h3 className="font-bold text-lg">{camp.name}</h3>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          <span>
                            {camp.startDate ? format(new Date(camp.startDate), "PPP", { locale: ar }) : "بدون تاريخ"}
                          </span>
                        </div>
                      </div>
                      <Badge variant={camp.status === 'open' ? 'default' : 'secondary'} className="rounded-full px-3">
                        {camp.status === 'open' ? 'نشطة' : 'مكتملة'}
                      </Badge>
                    </div>
                    
                    <div className="flex justify-between items-end pt-3 border-t mt-2">
                      <div className="space-y-1">
                        <p className="text-[10px] text-muted-foreground font-bold uppercase">الحالة</p>
                        <div className="flex items-center gap-1 text-primary font-bold">
                          <span>{camp.status === 'open' ? 'قيد العمل' : 'تم الإغلاق'}</span>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" className="rounded-xl border-primary text-primary hover:bg-primary/5">
                        عرض التفاصيل
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        ) : (
          <div className="text-center p-10 text-muted-foreground">
            لا توجد حملات مسجلة حالياً
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  )
}
