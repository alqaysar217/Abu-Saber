
import Image from "next/image"
import { BottomNav } from "@/components/layout/BottomNav"
import { QuickActions } from "@/components/dashboard/QuickActions"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowUpRight, ArrowDownRight, Wallet, Banknote } from "lucide-react"
import { cn } from "@/lib/utils"
import { PlaceHolderImages } from "@/lib/placeholder-images"

export default function Home() {
  const logo = PlaceHolderImages.find(img => img.id === 'app-logo')

  return (
    <div className="flex flex-col min-h-screen bg-background pb-20">
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
            <h1 className="text-2xl font-black font-headline tracking-tight">أبو صابر</h1>
          </div>
          {/* Removed redundant icon to simplify UI */}
        </div>
        <div className="space-y-1 relative z-10">
          <p className="text-white/70 text-xs font-medium uppercase tracking-wider">إجمالي الأرباح</p>
          <p className="text-4xl font-black tabular-nums tracking-tighter">
            2,450,000 <span className="text-lg font-normal opacity-80">ر.ي</span>
          </p>
        </div>
      </header>

      <section className="px-4 -mt-14 mb-8 relative z-20">
        <div className="grid grid-cols-2 gap-4">
          <Card className="border-none shadow-xl rounded-[2rem] bg-white/80 backdrop-blur-md">
            <CardContent className="p-5 flex flex-col gap-3">
              <div className="p-2.5 bg-green-50 text-green-700 rounded-2xl w-fit">
                <ArrowUpRight className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wide">ديون لك</p>
                <p className="text-xl font-black text-green-700">840,000 <span className="text-xs font-normal">ر.ي</span></p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-xl rounded-[2rem] bg-white/80 backdrop-blur-md">
            <CardContent className="p-5 flex flex-col gap-3">
              <div className="p-2.5 bg-red-50 text-red-700 rounded-2xl w-fit">
                <ArrowDownRight className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wide">ديون عليك</p>
                <p className="text-xl font-black text-red-700">320,000 <span className="text-xs font-normal">ر.ي</span></p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="px-4 mb-8">
        <Card className="border-none shadow-lg rounded-[2rem] bg-gradient-to-r from-accent/20 to-transparent border-r-4 border-accent">
          <CardContent className="p-5 flex items-center gap-5">
            <div className="p-3.5 bg-white shadow-sm text-accent rounded-2xl">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wide">السيولة الحالية</p>
              <p className="text-2xl font-black">1,215,000 <span className="text-sm font-normal opacity-70">ر.ي</span></p>
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
          <h2 className="text-lg font-black">آخر النشاطات</h2>
          <button className="text-sm text-primary font-bold hover:underline">عرض الكل</button>
        </div>
        <div className="space-y-4">
          {[
            { title: "بيع تونة - حملة الحديدة", sub: "قبل ٢ ساعة", amount: "+ ٤٥,٠٠٠ ر.ي", type: "income" },
            { title: "مصاريف ديزل", sub: "قبل ٤ ساعات", amount: "- ١٢,٠٠٠ ر.ي", type: "expense" },
            { title: "شراء ثلج", sub: "أمس", amount: "- ٥,٥٠٠ ر.ي", type: "expense" },
          ].map((item, idx) => (
            <div key={idx} className="flex justify-between items-center p-5 bg-white rounded-[1.5rem] border border-border/40 shadow-sm hover:shadow-md transition-all active:scale-[0.98]">
              <div className="flex flex-col gap-0.5">
                <span className="font-bold text-sm">{item.title}</span>
                <span className="text-[10px] text-muted-foreground font-medium uppercase">{item.sub}</span>
              </div>
              <span className={cn(
                "font-black text-sm tabular-nums",
                item.type === "income" ? "text-green-600" : "text-red-500"
              )}>
                {item.amount}
              </span>
            </div>
          ))}
        </div>
      </section>

      <BottomNav />
    </div>
  )
}
