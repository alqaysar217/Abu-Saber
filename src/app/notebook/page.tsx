
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { 
  ChevronLeft, 
  Plus, 
  Trash2, 
  Save, 
  Loader2, 
  Notebook as NotebookIcon, 
  Search,
  Calendar,
  MoreVertical,
  X
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase"
import { collection, addDoc, serverTimestamp, query, orderBy, deleteDoc, doc } from "firebase/firestore"
import { format } from "date-fns"
import { ar } from "date-fns/locale"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export default function NotebookPage() {
  const router = useRouter()
  const { toast } = useToast()
  const db = useFirestore()
  const { user } = useUser()
  const [searchTerm, setSearchTerm] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")

  const notesQuery = useMemoFirebase(() => {
    if (!db || !user) return null
    return query(collection(db, "users", user.uid, "notes"), orderBy("createdAt", "desc"))
  }, [db, user])

  const { data: notes, isLoading } = useCollection(notesQuery)

  const filteredNotes = notes?.filter(n => 
    n.title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    n.content?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleSave = async () => {
    if (!db || !user || !title || !content) return
    setSaving(true)
    
    try {
      await addDoc(collection(db, "users", user.uid, "notes"), {
        title,
        content,
        createdAt: serverTimestamp()
      })
      toast({ title: "تم حفظ الملاحظة" })
      setIsOpen(false)
      setTitle("")
      setContent("")
    } catch (e) {
      toast({ variant: "destructive", title: "فشل الحفظ" })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!db || !user) return
    await deleteDoc(doc(db, "users", user.uid, "notes", id))
    toast({ title: "تم حذف الملاحظة" })
  }

  return (
    <div className="flex flex-col min-h-screen bg-background pb-10">
      <header className="p-6 bg-white border-b sticky top-0 z-10 shadow-sm space-y-4">
        <div className="flex justify-between items-center">
          <button onClick={() => router.push("/")} className="p-2 -mr-2">
            <ChevronLeft className="w-6 h-6 rotate-180" />
          </button>
          <div className="flex flex-col items-center">
            <h1 className="text-xl font-black text-primary flex items-center gap-2">
              <NotebookIcon className="w-5 h-5" />
              دفتر المذكرات
            </h1>
          </div>
          <Button size="icon" className="rounded-xl lux-gradient" onClick={() => setIsOpen(true)}>
            <Plus className="w-6 h-6" />
          </Button>
        </div>

        <div className="relative group" dir="rtl">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="بحث في المذكرات..." 
            className="pr-11 h-12 rounded-2xl bg-muted/50 border-none text-right" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </header>

      <main className="p-4 space-y-4">
        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-primary opacity-50" /></div>
        ) : filteredNotes && filteredNotes.length > 0 ? (
          filteredNotes.map((note) => (
            <Card key={note.id} className="border-none shadow-md rounded-3xl bg-white overflow-hidden group">
              <CardContent className="p-6 space-y-3">
                <div className="flex justify-between items-start">
                  <div className="flex flex-col gap-0.5 text-right">
                    <h3 className="font-black text-primary text-lg">{note.title}</h3>
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-bold">
                      <Calendar className="w-3 h-3" />
                      {note.createdAt?.toDate ? format(note.createdAt.toDate(), "PPP", { locale: ar }) : ""}
                    </div>
                  </div>
                  <button onClick={() => handleDelete(note.id)} className="p-2 text-destructive/20 hover:text-destructive transition-colors">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed text-right font-medium whitespace-pre-wrap">
                  {note.content}
                </p>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="text-center py-24 text-muted-foreground border-2 border-dashed rounded-[3rem] space-y-4">
            <NotebookIcon className="w-16 h-16 mx-auto opacity-10" />
            <p className="font-bold">لا توجد مذكرات حالياً</p>
          </div>
        )}
      </main>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-[95%] rounded-3xl border-none shadow-2xl p-0 overflow-hidden">
          <DialogHeader className="p-6 lux-gradient text-white">
            <DialogTitle className="text-right flex items-center justify-start gap-2">
              <Plus className="w-5 h-5" />
              إضافة مذكرة جديدة
            </DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-5" dir="rtl">
            <div className="space-y-2">
              <Label className="text-xs font-bold mr-1">العنوان</Label>
              <Input 
                placeholder="مثال: ملاحظة عن صنف معين..." 
                className="h-12 rounded-xl"
                value={title}
                onChange={e => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold mr-1">المحتوى</Label>
              <Textarea 
                placeholder="اكتب تفاصيل المذكرة هنا..." 
                className="min-h-[150px] rounded-xl resize-none"
                value={content}
                onChange={e => setContent(e.target.value)}
              />
            </div>
            <Button className="w-full h-14 rounded-2xl font-black lux-gradient gap-2" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              حفظ المذكرة الآن
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
