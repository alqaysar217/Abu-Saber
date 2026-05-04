
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
  LayoutDashboard,
  Box,
  DatabaseBackup
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
    
    { label: "المخزون الحالي", icon: Box, href: "/inventory", category: "الإدارة المالية" },
    { label: "كل المبيعات", icon: Receipt, href: "/admin/sales", category: "الإدارة المالية" },
    { label: "كل المشتريات", icon: ShoppingBag, href: "/admin/purchases", category: "الإدارة المالية" },
    { label: "كل المصروفات", icon: ShoppingCart, href: "/admin/expenses", category: "الإدارة المالية" },
    { label: "سجل الديون (الجدول)", icon: Wallet, href: "/admin/all-debts", category: "الإدارة المالية" },
    { label: "كل الإيصالات", icon: FileText, href: "/admin/receipts", category: "الإدارة المالية" },
    
    { label: "النسخ الاحتياطي", icon: DatabaseBackup, href: "/backup", category: "الأمان والنظام" },
  ]

  const categories = Array.from(new Set(menuItems.map(item => item.category)))

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[85%] sm:w-[400px] p-0 border-none shadow-2xl rounded-l-[1.5rem] overflow-hidden [&>button]:hidden">
        <div className="flex flex-col h-full bg-white">
          <SheetHeader className="p-6 lux-gradient text-white text-right space-y-0">
            <div className="flex items-center gap-4 text-right pt-4" dir="rtl">
              <Avatar className="w-14 h-16 border-2 border-white/30 shadow-lg shrink-0 rounded-2xl">
                <AvatarImage src={profile?.photoBase64 || ""} />
                <AvatarFallback className="bg-white/20 text-white text-xl font-black">
                  {profile?.name?.substring(0, 1) || "أ"}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col gap-0.5 overflow-hidden">
                <SheetTitle className="text-lg font-black text-white m-0 p-0 leading-tight truncate">
                  {profile?.name || "صاحب العمل"}
                </SheetTitle>
                <p className="text-[10px] text-white/70 font-bold truncate">
                  {user?.phoneNumber || user?.email || "جلسة مؤقتة"}
                </p>
              </div>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-3 space-y-3 pb-24">
            {categories.map((cat) => (
              <div key={cat} className="space-y-1">
                <h4 className="px-3 text-[9px] font-black text-muted-foreground uppercase tracking-wider text-right opacity-60">{cat}</h4>
                <div className="grid gap-0.5">
                  {menuItems.filter(item => item.category === cat).map((item) => (
                    <Link key={item.href} href={item.href} onClick={() => onOpenChange(false)}>
                      <div className={cn(
                        "flex items-center justify-between p-2.5 rounded-xl transition-all active:scale-95",
                        pathname === item.href ? "bg-primary/5 text-primary" : "hover:bg-muted/50 text-foreground"
                      )}>
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "p-2 rounded-lg",
                            pathname === item.href ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                          )}>
                            <item.icon className="w-4 h-4" />
                          </div>
                          <span className="text-xs font-bold">{item.label}</span>
                        </div>
                        <ChevronLeft className={cn("w-3 h-3 opacity-30", pathname === item.href && "text-primary opacity-100")} />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 border-t border-dashed mt-auto">
            <Button 
              variant="destructive" 
              className="w-full h-12 rounded-xl font-black gap-2 shadow-lg text-sm" 
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4" />
              تسجيل الخروج
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
