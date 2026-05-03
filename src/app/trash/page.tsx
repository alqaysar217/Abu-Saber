
"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { 
  ChevronLeft, 
  Trash2, 
  RotateCcw, 
  Loader2, 
  History, 
  Search,
  Calendar,
  AlertCircle,
  X,
  Receipt,
  ShoppingBag,
  ShoppingCart,
  Notebook as NotebookIcon,
  Filter
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, orderBy, deleteDoc, doc, setDoc, serverTimestamp, writeBatch } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"
import { ar } from "date-fns/locale"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"

const typeConfig: Record<string, any> = {
  invoice: { label: "فاتورة مبيعات", icon: Receipt, color: "bg-green-50 text-green-600 border-green-200" },
  purchase: { label: "فاتورة مشتريات", icon: ShoppingBag, color: "bg-orange-50 text-orange-600 border-orange-200" },
  expense: { label: "مصروف", icon: ShoppingCart, color: "bg-accent/10 text-accent border-accent/20" },
  note: { label: "مذكرة", icon: NotebookIcon, color: "bg-blue-50 text-blue-600 border-blue-200" },
}

export default function TrashPage() {
  const router = useRouter()
  const { toast } = useToast()
  const db = useFirestore()
  const { user } = useUser()
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState("all")
  const [isRestoring, setIsRestoring] = useState<string | null>(null)

  const trashQuery = useMemoFirebase(() => {
    if (!db || !user) return null
    return query(collection(db, "users", user.uid, "trash"), orderBy("deletedAt", "desc"))
  }, [db, user])

  const { data: trashItems, isLoading } = useCollection(trashQuery)

  const filteredTrash = useMemo(() => {
    if (!trashItems) return []
    return trashItems.filter(item => {
      const matchesSearch = 
        item.data?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.data?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.data?.type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.data?.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesType = filterType === "all" || item.originalType === filterType
      return matchesSearch && matchesType
    })
  }, [trashItems, searchTerm, filterType])

  const handleRestore = async (item: any) => {
    if (!db || !user) return
    setIsRestoring(item.id)
    
    try {
      const originalPath = `users/${user.uid}/${item.originalCollection}/${item.originalId}`
      const { id, deletedAt, originalCollection, originalId, originalType, userId, ...cleanData } = item.data;
      
      const batch = writeBatch(db)
      
      // 1. إعادة البيانات للمكان الأصلي
      batch.set(doc(db, originalPath), {
        ...cleanData,
        restoredAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })

      // 2. إذا كانت فاتورة مشتريات ولها أصناف، نعيد الأصناف أيضاً
      if (item.originalType === 'purchase' && item.data.items) {
        const purchaseItemsRef = collection(db, originalPath, "items")
        item.data.items.forEach((subItem: any) => {
           const subItemRef = doc(purchaseItemsRef)
           batch.set(subItemRef, subItem)
        })
      }

      // 3. الحذف من السلة
      batch.delete(doc(db, "users", user.uid, "trash", item.id))
      
      await batch.commit()
      toast({ title: "تم استعادة السجل بنجاح لمكانه الأصلي" })
    } catch (e) {
      console.error(e)
      toast({ variant: "destructive", title: "فشل الاستعادة" })
    } finally {
      setIsRestoring(null)
    }
  }

  const handlePermanentDelete = async (id: string) => {
    if (!db || !user) return
    await deleteDoc(doc(db, "users", user.uid, "trash", id))
    toast({ title: "تم الحذف نهائياً" })
  }

  return (
    <div className="flex flex-col min-h-screen bg-background pb-10">
      <header className="p-6 bg-white border-b sticky top-0 z-10 shadow-sm space-y-4">
        <div className="flex justify-between items-center">
          <button onClick={() => router.push("/")} className="p-2 -mr-2">
            <ChevronLeft className="w-6 h-6 rotate-180" />
          </button>
          <h1 className="text-xl font-black text-primary flex items-center gap-2">
            <Trash2 className="w-5 h-5" />
            سجل المحذوفات
          </h1>
          <div className="w-6" />
        </div>

        <div className="flex gap-2" dir="rtl">
          <div className="relative flex-1 group">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="بحث في المحذوفات..." 
              className="pr-11 h-12 rounded-2xl bg-muted/50 border-none text-right" 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <select 
            className="h-12 rounded-2xl bg-muted/50 border-none text-[11px] font-bold px-4 outline-none focus:ring-1 focus:ring-primary"
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
          >
            <option value="all">كل الأنواع</option>
            <option value="invoice">مبيعات</option>
            <option value="purchase">مشتريات</option>
            <option value="expense">مصروفات</option>
            <option value="note">مذكرات</option>
          </select>
        </div>
      </header>

      <main className="p-4 space-y-4">
        <div className="bg-orange-50 p-4 rounded-3xl border border-orange-100 flex gap-3 text-orange-800" dir="rtl">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="text-[10px] font-bold leading-relaxed text-right">
            ملاحظة: السجلات هنا تم حذفها مؤقتاً. يمكنك استعادتها لتعود لمكانها الأصلي، أو حذفها نهائياً.
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-primary opacity-50" /></div>
        ) : filteredTrash && filteredTrash.length > 0 ? (
          filteredTrash.map((item) => {
            const config = typeConfig[item.originalType] || { label: "سجل", icon: History, color: "bg-muted text-muted-foreground" }
            const Icon = config.icon
            
            return (
              <Card key={item.id} className="border-none shadow-md rounded-3xl bg-white overflow-hidden group">
                <CardContent className="p-5 space-y-4">
                  <div className="flex justify-between items-start" dir="rtl">
                    <div className="flex items-center gap-3">
                       <div className={cn("p-2.5 rounded-xl border", config.color)}>
                         <Icon className="w-5 h-5" />
                       </div>
                       <div className="flex flex-col text-right">
                          <Badge variant="outline" className={cn("text-[9px] w-fit font-black mb-1", config.color)}>
                            {config.label}
                          </Badge>
                          <span className="text-sm font-black text-foreground">
                            {item.data?.name || item.data?.title || item.data?.type || `سجل رقم #${item.originalId?.substring(0,5)}`}
                          </span>
                          {item.data?.invoiceNumber && <span className="text-[10px] font-bold text-muted-foreground mt-0.5">رقم المرجع: {item.data.invoiceNumber}</span>}
                          <span className="text-[9px] text-muted-foreground font-bold flex items-center gap-1 mt-1 opacity-70">
                            <Calendar className="w-2.5 h-2.5" />
                            تاريخ الحذف: {item.deletedAt?.toDate ? format(item.deletedAt.toDate(), "dd/MM/yyyy HH:mm", { locale: ar }) : ""}
                          </span>
                       </div>
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      <Button 
                        size="icon" 
                        variant="outline" 
                        className="rounded-xl border-green-200 text-green-600 hover:bg-green-50 shadow-sm"
                        onClick={() => handleRestore(item)}
                        disabled={isRestoring === item.id}
                      >
                        {isRestoring === item.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                      </Button>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="icon" variant="ghost" className="rounded-xl text-destructive hover:bg-destructive/10">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="rounded-3xl max-w-[90%] mx-auto">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-right flex items-center justify-start gap-2 text-destructive font-bold">
                              <Trash2 className="w-5 h-5" />
                              حذف نهائي؟
                            </AlertDialogTitle>
                            <AlertDialogDescription className="text-right font-medium">
                              هل أنت متأكد من حذف هذا السجل نهائياً من النظام؟ لا يمكن استعادته مرة أخرى.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter className="flex-row gap-2 mt-4">
                            <AlertDialogCancel className="flex-1 rounded-xl font-bold">إلغاء</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handlePermanentDelete(item.id)} 
                              className="flex-1 rounded-xl bg-destructive text-white border-none font-bold"
                            >
                              نعم، حذف نهائي
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        ) : (
          <div className="text-center py-32 text-muted-foreground opacity-30 bg-white/50 rounded-[3rem] border-2 border-dashed">
            <History className="w-16 h-16 mx-auto mb-4" />
            <p className="font-bold">سجل المحذوفات فارغ</p>
          </div>
        )}
      </main>
    </div>
  )
}
