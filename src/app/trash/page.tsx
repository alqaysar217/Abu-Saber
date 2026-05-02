
"use client"

import { useState } from "react"
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
  X
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, orderBy, deleteDoc, doc, setDoc, serverTimestamp } from "firebase/firestore"
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

export default function TrashPage() {
  const router = useRouter()
  const { toast } = useToast()
  const db = useFirestore()
  const { user } = useUser()
  const [searchTerm, setSearchTerm] = useState("")

  const trashQuery = useMemoFirebase(() => {
    if (!db || !user) return null
    return query(collection(db, "users", user.uid, "trash"), orderBy("deletedAt", "desc"))
  }, [db, user])

  const { data: trashItems, isLoading } = useCollection(trashQuery)

  const filteredTrash = trashItems?.filter(item => 
    item.originalType?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    item.data?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.data?.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleRestore = async (item: any) => {
    if (!db || !user) return
    try {
      const originalPath = `users/${user.uid}/${item.originalCollection}/${item.originalId}`
      await setDoc(doc(db, originalPath), {
        ...item.data,
        restoredAt: serverTimestamp()
      })
      await deleteDoc(doc(db, "users", user.uid, "trash", item.id))
      toast({ title: "تمت استعادة السجل بنجاح" })
    } catch (e) {
      toast({ variant: "destructive", title: "فشل الاستعادة" })
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

        <div className="relative group" dir="rtl">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="بحث في المحذوفات..." 
            className="pr-11 h-12 rounded-2xl bg-muted/50 border-none text-right" 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </header>

      <main className="p-4 space-y-4">
        <div className="bg-orange-50 p-4 rounded-3xl border border-orange-100 flex gap-3 text-orange-800">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="text-[10px] font-bold leading-relaxed text-right">
            ملاحظة: السجلات الموجودة هنا تم حذفها من النظام الأساسي. يمكنك استعادتها لتعود لمكانها الأصلي، أو حذفها نهائياً لتوفير مساحة.
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-primary opacity-50" /></div>
        ) : filteredTrash && filteredTrash.length > 0 ? (
          filteredTrash.map((item) => (
            <Card key={item.id} className="border-none shadow-md rounded-3xl bg-white overflow-hidden">
              <CardContent className="p-5 space-y-4">
                <div className="flex justify-between items-start">
                  <div className="flex flex-col text-right gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-primary bg-primary/5 px-2 py-0.5 rounded-lg">
                        {item.originalType === 'invoice' ? 'فاتورة مبيعات' : 
                         item.originalType === 'purchase' ? 'فاتورة مشتريات' : 
                         item.originalType === 'expense' ? 'مصروف' : 'سجل'}
                      </span>
                    </div>
                    <span className="text-[11px] font-bold text-foreground">
                      {item.data?.name || item.data?.type || `سجل رقم #${item.originalId?.substring(0,5)}`}
                    </span>
                    <span className="text-[9px] text-muted-foreground font-bold flex items-center gap-1">
                      <Calendar className="w-2.5 h-2.5" />
                      تاريخ الحذف: {item.deletedAt?.toDate ? format(item.deletedAt.toDate(), "dd/MM/yyyy HH:mm", { locale: ar }) : ""}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      size="icon" 
                      variant="outline" 
                      className="rounded-xl border-green-200 text-green-600 hover:bg-green-50"
                      onClick={() => handleRestore(item)}
                    >
                      <RotateCcw className="w-4 h-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="icon" variant="ghost" className="rounded-xl text-destructive hover:bg-destructive/10">
                          <X className="w-5 h-5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="rounded-3xl max-w-[90%] mx-auto">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="text-right flex items-center justify-start gap-2 text-destructive font-bold">
                            <Trash2 className="w-5 h-5" />
                            حذف نهائي؟
                          </AlertDialogTitle>
                          <AlertDialogDescription className="text-right font-medium">
                            هل أنت متأكد من حذف هذا السجل نهائياً؟ لا يمكن استعادته مرة أخرى.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="flex-row gap-2 mt-4">
                          <AlertDialogCancel className="flex-1 rounded-xl font-bold">إلغاء</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => handlePermanentDelete(item.id)} 
                            className="flex-1 rounded-xl bg-destructive text-white border-none font-bold"
                          >
                            نعم، احذف
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="text-center py-32 text-muted-foreground opacity-30">
            <History className="w-16 h-16 mx-auto mb-4" />
            <p className="font-bold">سجل المحذوفات فارغ</p>
          </div>
        )}
      </main>
    </div>
  )
}
