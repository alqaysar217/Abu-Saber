"use client"

import { useState, useRef, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { 
  ChevronLeft, 
  Send, 
  Loader2, 
  Bot, 
  User, 
  Sparkles, 
  Trash2,
  AlertCircle,
  TrendingUp,
  Wallet
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { BottomNav } from "@/components/layout/BottomNav"
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query } from "firebase/firestore"
import { smartChat, type ChatMessage } from "@/ai/flows/smart-chat-flow"
import { cn } from "@/lib/utils"

export default function SmartChatPage() {
  const router = useRouter()
  const db = useFirestore()
  const { user } = useUser()
  
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', content: 'أهلاً بك يا أبا صابر! أنا مساعدك الذكي، يمكنني إخبارك بالديون، المبيعات، أو ملخص عن أداء حملاتك. كيف أخدمك اليوم؟' }
  ])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Subscriptions to build live context
  const invoicesQuery = useMemoFirebase(() => user ? collection(db!, "users", user.uid, "invoices") : null, [db, user])
  const purchasesQuery = useMemoFirebase(() => user ? collection(db!, "users", user.uid, "purchases") : null, [db, user])
  const expensesQuery = useMemoFirebase(() => user ? collection(db!, "users", user.uid, "expenses") : null, [db, user])
  const customersQuery = useMemoFirebase(() => user ? collection(db!, "users", user.uid, "customers") : null, [db, user])
  const suppliersQuery = useMemoFirebase(() => user ? collection(db!, "users", user.uid, "suppliers") : null, [db, user])
  const campaignsQuery = useMemoFirebase(() => user ? collection(db!, "users", user.uid, "campaigns") : null, [db, user])

  const { data: invoices } = useCollection(invoicesQuery)
  const { data: purchases } = useCollection(purchasesQuery)
  const { data: expenses } = useCollection(expensesQuery)
  const { data: customers } = useCollection(customersQuery)
  const { data: suppliers } = useCollection(suppliersQuery)
  const { data: campaigns } = useCollection(campaignsQuery)

  // تجهيز "لقطة" من البيانات لإرسالها للشات كـ Context
  const contextSnapshot = useMemo(() => {
    if (!invoices || !purchases || !expenses) return null

    return {
      stats: {
        totalRevenue: invoices.reduce((acc, i) => acc + (i.totalAmount || 0), 0),
        totalCollected: invoices.reduce((acc, i) => acc + (i.paidAmount || 0), 0),
        totalPurchases: purchases.reduce((acc, p) => acc + (p.totalAmount || 0), 0),
        totalExpenses: expenses.reduce((acc, e) => acc + (e.amount || 0), 0),
      },
      activeCampaigns: campaigns?.filter(c => c.status === 'open').map(c => ({ name: c.name, id: c.id })),
      customerDebts: customers?.map(c => {
        const debt = invoices.filter(i => i.customerId === c.id).reduce((acc, i) => acc + (i.remainingAmount || 0), 0)
        return { name: c.name, debt }
      }).filter(c => c.debt > 0),
      supplierDebts: suppliers?.map(s => {
        const debtP = purchases.filter(p => p.supplierId === s.id).reduce((acc, p) => acc + (p.remainingAmount || 0), 0)
        const debtE = expenses.filter(e => e.payeeId === s.id).reduce((acc, e) => acc + (e.remainingAmount || 0), 0)
        return { name: s.name, debt: debtP + debtE }
      }).filter(s => s.debt > 0),
      lastFiveInvoices: invoices.slice(0, 5).map(i => ({ number: i.invoiceNumber, amount: i.totalAmount, date: i.invoiceDate }))
    }
  }, [invoices, purchases, expenses, customers, suppliers, campaigns])

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || loading) return

    const userMsg: ChatMessage = { role: 'user', content: input }
    setMessages(prev => [...prev, userMsg])
    setInput("")
    setLoading(true)

    try {
      const history = [...messages, userMsg]
      const response = await smartChat(history, contextSnapshot)
      setMessages(prev => [...prev, { role: 'model', content: response }])
    } catch (e) {
      setMessages(prev => [...prev, { role: 'model', content: 'عذراً، حدث خطأ فني في معالجة طلبك.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-screen bg-background pb-20">
      <header className="p-4 bg-white border-b flex items-center justify-between sticky top-0 z-20 shadow-sm">
        <button onClick={() => router.back()} className="p-2 -mr-2"><ChevronLeft className="w-6 h-6 rotate-180" /></button>
        <div className="flex flex-col items-center">
          <h1 className="text-lg font-black text-primary flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-accent" />
            مساعد أبو صابر الذكي
          </h1>
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
            <span className="text-[9px] font-bold text-muted-foreground uppercase">متصل بقاعدة البيانات</span>
          </div>
        </div>
        <button onClick={() => setMessages([{ role: 'model', content: 'تم مسح المحادثة. كيف يمكنني مساعدتك الآن؟' }])} className="p-2 text-destructive/40 hover:text-destructive transition-colors">
          <Trash2 className="w-5 h-5" />
        </button>
      </header>

      <main 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-fixed"
      >
        {messages.map((msg, idx) => (
          <div key={idx} className={cn(
            "flex w-full animate-in fade-in slide-in-from-bottom-2 duration-300",
            msg.role === 'user' ? "justify-end" : "justify-start"
          )}>
            <div className={cn(
              "max-w-[85%] p-4 rounded-3xl shadow-sm text-sm leading-relaxed",
              msg.role === 'user' 
                ? "lux-gradient text-white rounded-tr-none" 
                : "bg-white text-foreground border rounded-tl-none font-medium"
            )}>
              <div className="flex items-center gap-2 mb-1 opacity-50">
                 {msg.role === 'user' ? <User className="w-3 h-3" /> : <Bot className="w-3 h-3" />}
                 <span className="text-[9px] font-black uppercase">{msg.role === 'user' ? 'أنت' : 'المساعد الذكي'}</span>
              </div>
              <p className="whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start animate-in fade-in duration-300">
             <div className="bg-white border p-4 rounded-3xl rounded-tl-none flex items-center gap-3">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span className="text-xs font-bold text-muted-foreground">جاري تحليل البيانات...</span>
             </div>
          </div>
        )}
      </main>

      <footer className="p-4 bg-white border-t sticky bottom-0 z-20">
        <div className="flex gap-2 max-w-lg mx-auto" dir="rtl">
          <Input 
            placeholder="اسألني عن الديون، المبيعات..."
            className="flex-1 h-12 rounded-2xl bg-muted/50 border-none pr-4 font-bold focus-visible:ring-primary shadow-inner"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />
          <Button 
            onClick={handleSend}
            disabled={loading || !input.trim()}
            size="icon" 
            className="w-12 h-12 rounded-2xl lux-gradient shadow-lg shrink-0 active:scale-90 transition-transform"
          >
            <Send className="w-5 h-5 rotate-180" />
          </Button>
        </div>
      </footer>
      <BottomNav />
    </div>
  )
}
