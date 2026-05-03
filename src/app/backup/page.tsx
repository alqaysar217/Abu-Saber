
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { 
  ChevronLeft, 
  DatabaseBackup, 
  Download, 
  Loader2, 
  CheckCircle2, 
  Mail, 
  MessageSquare, 
  ShieldCheck,
  FileJson,
  AlertCircle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useFirestore, useUser } from "@/firebase"
import { collection, getDocs } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"

export default function BackupPage() {
  const router = useRouter()
  const db = useFirestore()
  const { user } = useUser()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)

  const handleExportData = async () => {
    if (!db || !user) return
    setLoading(true)

    const collections = [
      "campaigns", 
      "customers", 
      "suppliers", 
      "invoices", 
      "purchases", 
      "expenses", 
      "paymentTransactions", 
      "notes",
      "fishTypes"
    ]
    
    try {
      const backupData: Record<string, any> = {
        exportDate: new Date().toISOString(),
        userId: user.uid,
        userEmail: user.email,
        data: {}
      }

      for (const colName of collections) {
        const snap = await getDocs(collection(db, "users", user.uid, colName))
        backupData.data[colName] = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      }

      // Convert to JSON string
      const jsonString = JSON.stringify(backupData, null, 2)
      const blob = new Blob([jsonString], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      
      // Trigger download
      const link = document.createElement("a")
      link.href = url
      link.download = `AbuSaber_Backup_${format(new Date(), "yyyy-MM-dd_HHmm")}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast({ title: "تم إنشاء النسخة الاحتياطية بنجاح", description: "الملف محفوظ الآن في جهازك بصيغة JSON" })
    } catch (e) {
      console.error(e)
      toast({ variant: "destructive", title: "فشل إنشاء النسخة الاحتياطية" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-background pb-10">
      <header className="p-6 bg-white border-b sticky top-0 z-30 shadow-sm">
        <div className="flex justify-between items-center">
          <button onClick={() => router.push("/")} className="p-2 -mr-2">
            <ChevronLeft className="w-6 h-6 rotate-180" />
          </button>
          <h1 className="text-xl font-black text-primary flex items-center gap-2">
            <DatabaseBackup className="w-5 h-5" />
             الأمان والنسخ الاحتياطي
          </h1>
          <div className="w-10" />
        </div>
      </header>

      <main className="p-4 space-y-6">
        <Card className="border-none shadow-xl rounded-[2.5rem] lux-gradient text-white overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
          <CardContent className="p-8 flex flex-col items-center text-center gap-4 relative z-10">
            <div className="w-20 h-20 bg-white/10 backdrop-blur-md rounded-3xl flex items-center justify-center border border-white/20">
              <ShieldCheck className="w-10 h-10" />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-black">بياناتك هي رأس مالك</h2>
              <p className="text-xs opacity-70 font-bold leading-relaxed">نوصي بتحميل نسخة احتياطية أسبوعياً والاحتفاظ بها في مكان آمن خارج التطبيق.</p>
            </div>
            <Button 
              onClick={handleExportData} 
              disabled={loading}
              className="w-full h-14 rounded-2xl bg-white text-primary hover:bg-white/90 font-black shadow-lg gap-2 mt-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
              تصدير كافة البيانات (JSON)
            </Button>
          </CardContent>
        </Card>

        <section className="space-y-4">
          <h3 className="text-sm font-black text-primary px-2 flex items-center gap-2" dir="rtl">
            <AlertCircle className="w-4 h-4" />
            خطة الطوارئ والنسخ التلقائي
          </h3>
          
          <div className="grid gap-3">
             <Card className="border-none shadow-sm rounded-2xl bg-white border border-border/50">
               <CardContent className="p-5 flex items-center gap-4" dir="rtl">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Mail className="w-6 h-6" />
                  </div>
                  <div className="flex flex-col text-right">
                    <span className="text-[10px] font-black text-muted-foreground uppercase">البريد الإلكتروني المعتمد</span>
                    <span className="text-sm font-bold text-foreground">pr.mahmoud.20@gmail.com</span>
                  </div>
               </CardContent>
             </Card>

             <Card className="border-none shadow-sm rounded-2xl bg-white border border-border/50">
               <CardContent className="p-5 flex items-center gap-4" dir="rtl">
                  <div className="w-12 h-12 rounded-xl bg-green-50 text-green-600 flex items-center justify-center">
                    <MessageSquare className="w-6 h-6" />
                  </div>
                  <div className="flex flex-col text-right">
                    <span className="text-[10px] font-black text-muted-foreground uppercase">رقم الواتساب للطوارئ</span>
                    <span className="text-sm font-bold text-foreground tabular-nums">+967 775258830</span>
                  </div>
               </CardContent>
             </Card>
          </div>
        </section>

        <Card className="border-none bg-orange-50 rounded-[2rem] border border-orange-100 p-6 shadow-inner">
           <div className="flex flex-col items-center text-center gap-3">
              <FileJson className="w-10 h-10 text-orange-500 opacity-50" />
              <h4 className="font-black text-orange-900 text-sm">ملاحظة تقنية هامة</h4>
              <p className="text-[11px] text-orange-800 font-bold leading-relaxed px-4">
                الملف الذي يتم تصديره يحتوي على كافة بياناتك بصيغة JSON البرمجية. يمكنك إعادة استيراد هذا الملف في أي وقت لاستعادة النظام بالكامل في حال حدوث أي طارئ.
              </p>
           </div>
        </Card>
      </main>
    </div>
  )
}
