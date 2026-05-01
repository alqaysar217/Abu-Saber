
"use client"

import { BottomNav } from "@/components/layout/BottomNav"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Calendar, Filter, FileText, Download, TrendingUp, TrendingDown } from "lucide-react"
import { Button } from "@/components/ui/button"

const data = [
  { name: 'يناير', value: 400000 },
  { name: 'فبراير', value: 300000 },
  { name: 'مارس', value: 600000 },
  { name: 'أبريل', value: 800000 },
  { name: 'مايو', value: 1200000 },
]

export default function ReportsPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background pb-20">
      <header className="p-6 bg-white border-b sticky top-0 z-10">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">التقارير</h1>
          <Button variant="outline" size="icon" className="rounded-full">
            <Filter className="w-5 h-5" />
          </Button>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {["اليوم", "الأسبوع", "الشهر", "٣ أشهر", "السنة"].map((period) => (
            <Button key={period} variant={period === 'الشهر' ? 'default' : 'secondary'} size="sm" className="rounded-full px-5 h-9 shrink-0">
              {period}
            </Button>
          ))}
        </div>
      </header>

      <div className="p-4 space-y-6">
        <Card className="border-none shadow-md rounded-3xl overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-muted-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              نمو الأرباح الشهري
            </CardTitle>
          </CardHeader>
          <CardContent className="h-64 px-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#888' }} 
                  dy={10}
                />
                <Tooltip 
                  cursor={{ fill: 'transparent' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === data.length - 1 ? 'hsl(var(--primary))' : 'hsl(var(--secondary))'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-4">
          <Card className="border-none shadow-sm rounded-2xl bg-white">
            <CardContent className="p-4 space-y-2">
              <p className="text-[10px] text-muted-foreground font-bold">أفضل العملاء</p>
              <div className="space-y-3">
                {[
                  { name: "أحمد", val: "٦٥٠ك" },
                  { name: "سامي", val: "٤٢٠ك" },
                  { name: "علي", val: "٣٨٠ك" },
                ].map((cli, i) => (
                  <div key={i} className="flex justify-between items-center">
                    <span className="text-xs font-bold">{cli.name}</span>
                    <span className="text-xs text-primary font-bold">{cli.val}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-none shadow-sm rounded-2xl bg-white">
            <CardContent className="p-4 space-y-2">
              <p className="text-[10px] text-muted-foreground font-bold">أكثر الأصناف مبيعاً</p>
              <div className="space-y-3">
                {[
                  { name: "تونة", val: "٤٥٪" },
                  { name: "بياض", val: "٢٥٪" },
                  { name: "صابات", val: "١٥٪" },
                ].map((item, i) => (
                  <div key={i} className="flex justify-between items-center">
                    <span className="text-xs font-bold">{item.name}</span>
                    <span className="text-xs text-accent font-bold">{item.val}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-3">
          <h3 className="text-lg font-bold px-2">تقارير جاهزة</h3>
          <div className="space-y-3">
            {[
              { label: "كشف حساب عملاء تفصيلي", icon: FileText },
              { label: "تقرير أرباح الحملات السنوي", icon: TrendingUp },
              { label: "سجل المصاريف والتشغيل", icon: FileText },
            ].map((report, idx) => (
              <button key={idx} className="w-full flex items-center justify-between p-4 bg-white rounded-2xl border border-border/50 shadow-sm active:scale-95 transition-transform">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 text-primary rounded-lg">
                    <report.icon className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-bold">{report.label}</span>
                </div>
                <Download className="w-4 h-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        </div>
      </div>
      <BottomNav />
    </div>
  )
}
