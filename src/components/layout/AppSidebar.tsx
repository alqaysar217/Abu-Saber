
"use client"

import { 
  X, 
  User, 
  Notebook, 
  Trash2, 
  Archive, 
  LogOut, 
  ChevronLeft, 
  ShoppingCart, 
  Receipt, 
  ShoppingBag, 
  Wallet,
  Settings,
  ShieldCheck,
  FileText,
  LayoutDashboard
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { useAuth, useUser, useFirestore, useDoc } from "@/firebase"
import { signOut } from "firebase/auth"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { useMemoFirebase } from "@/firebase"
import { doc } from "firebase/firestore"

interface AppSidebarProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AppSidebar({ open, onOpenChange }: AppSidebarProps) {
  const pathname = usePathname()
  const auth = useAuth()
  const { user } = useUser()
  const db = useFirestore()

  const profileRef = useMemoFirebase(() => {
    if (!db || !user) return null
    return doc(db, "users", user.uid, "profile", "data")
  }, [db, user])

  const { data: profile } = useDoc(profileRef)

  const handleLogout = () => {
    if (auth) signOut(auth)
  }

  const menuItems = [
    { label: "الملف الشخصي", icon: User, href: "/profile", category: "حسابي" },
    { label: "دفتر المذكرات", icon: Notebook, href: "/notebook", category: "أدوات" },
    { label: "سجل المحذوفات", icon: Trash2, href: "/trash", category: "أدوات" },
    { label: "الأرشيف", icon: Archive, href: "/campaigns?status=completed", category: "أدوات" },
    
    { label: "كل المبيعات", icon: Receipt, href: "/admin/sales", category: "الإدارة المالية" },
    { label: "كل المشتريات", icon: ShoppingBag, href: "/admin/purchases", category: "الإدارة المالية" },
    { label: "كل المصروفات", icon: ShoppingCart, href: "/admin/expenses", category: "الإدارة المالية" },
    { label: "كل الديون", icon: Wallet, href: "/debts", category: "الإدارة المالية" },
    { label: "كل الإيصالات", icon: FileText, href: "/admin/receipts", category: "الإدارة المالية" },
  ]

  const categories = Array.from(new Set(menuItems.map(item => item.category)))

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[85%] sm:w-[400px] p-0 border-none shadow-2xl rounded-l-[2.5rem] overflow-hidden">
        <div className="flex flex-col h-full bg-white">
          <header className="p-8 lux-gradient text-white">
            <div className="flex justify-between items-center mb-8">
              <button onClick={() => onOpenChange(false)} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
                <X className="w-6 h-6 text-white" />
              </button>
              <div className="flex items-center gap-2">
                 <span className="text-[10px] font-bold opacity-70 uppercase tracking-widest">إدارة النظام</span>
                 <ShieldCheck className="w-4 h-4 opacity-70" />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Avatar className="w-16 h-16 border-2 border-white/30 shadow-lg">
                <AvatarImage src={profile?.photoBase64 || ""} />
                <AvatarFallback className="bg-white/20 text-white text-xl font-black">
                  {profile?.name?.substring(0, 1) || "أ"}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <h3 className="text-xl font-black">{profile?.name || "صاحب العمل"}</h3>
                <p className="text-xs text-white/70 font-bold">{user?.phoneNumber || user?.email || "جلسة مؤقتة"}</p>
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-24">
            {categories.map((cat) => (
              <div key={cat} className="space-y-2">
                <h4 className="px-4 text-[10px] font-black text-muted-foreground uppercase tracking-wider">{cat}</h4>
                <div className="grid gap-1">
                  {menuItems.filter(item => item.category === cat).map((item) => (
                    <Link key={item.href} href={item.href} onClick={() => onOpenChange(false)}>
                      <div className={cn(
                        "flex items-center justify-between p-4 rounded-2xl transition-all active:scale-95",
                        pathname === item.href ? "bg-primary/5 text-primary" : "hover:bg-muted/50 text-foreground"
                      )}>
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "p-2 rounded-xl",
                            pathname === item.href ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                          )}>
                            <item.icon className="w-5 h-5" />
                          </div>
                          <span className="text-sm font-bold">{item.label}</span>
                        </div>
                        <ChevronLeft className={cn("w-4 h-4 opacity-30", pathname === item.href && "text-primary opacity-100")} />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="p-6 border-t border-dashed mt-auto">
            <Button 
              variant="destructive" 
              className="w-full h-14 rounded-2xl font-black gap-2 shadow-xl" 
              onClick={handleLogout}
            >
              <LogOut className="w-5 h-5" />
              تسجيل الخروج
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
