
"use client"

import { Plus, Search, Calendar, MapPin, TrendingUp } from "lucide-react"
import { BottomNav } from "@/components/layout/BottomNav"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

const campaigns = [
  { id: 1, name: "حملة الحديدة - الصيف", date: "١٥ مايو ٢٠٢٤", location: "ميناء الحديدة", profit: "١,٢٠٠,٠٠٠ ر.ي", status: "active" },
  { id: 2, name: "رحلة عدن - الميناء", date: "١٠ مايو ٢٠٢٤", location: "ميناء عدن", profit: "٨٥٠,٠٠٠ ر.ي", status: "completed" },
  { id: 3, name: "حملة المخاء - تونة", date: "٠٥ مايو ٢٠٢٤", location: "المخاء", profit: "٤٠٠,٠٠٠ ر.ي", status: "completed" },
]

export default function CampaignsPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background pb-20">
      <header className="p-6 bg-white border-b sticky top-0 z-10">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">الحملات</h1>
          <Button size="icon" className="rounded-full shadow-lg">
            <Plus className="w-6 h-6" />
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="بحث عن حملة..." className="pr-10 h-11 rounded-xl bg-muted/50 border-none" />
        </div>
      </header>

      <div className="p-4 space-y-4">
        {campaigns.map((camp) => (
          <Card key={camp.id} className="border-none shadow-sm rounded-2xl overflow-hidden hover:shadow-md transition-shadow">
            <CardContent className="p-0">
              <div className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="space-y-1">
                    <h3 className="font-bold text-lg">{camp.name}</h3>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      <span>{camp.date}</span>
                    </div>
                  </div>
                  <Badge variant={camp.status === 'active' ? 'default' : 'secondary'} className="rounded-full px-3">
                    {camp.status === 'active' ? 'نشطة' : 'مكتملة'}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-2 mb-4 text-sm">
                  <MapPin className="w-4 h-4 text-primary" />
                  <span>{camp.location}</span>
                </div>

                <div className="flex justify-between items-end pt-3 border-t">
                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground font-bold">صافي الربح المتوقع</p>
                    <div className="flex items-center gap-1 text-primary font-bold">
                      <TrendingUp className="w-4 h-4" />
                      <span>{camp.profit}</span>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="rounded-xl border-primary text-primary hover:bg-primary/5">
                    التفاصيل
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <BottomNav />
    </div>
  )
}
