
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
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, orderBy, limit } from "firebase/firestore"
import { smartChat, type ChatMessage } from "@/ai/flows/smart-chat-flow"
import { cn } from "@/lib/utils"
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

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

  // Subscriptions with ordering to ensure latest data first
  const invoicesQuery = useMemoFirebase(() => 
    user ? query(collection(db!, "users", user.uid, "invoices"), orderBy("invoiceDate", "desc"), limit(30)) : null, 
    [db, user]
  )
  const purchasesQuery = useMemoFirebase(() => 
    user ? query(collection(db!, "users", user.uid, "purchases"), orderBy("purchaseDate", "desc"), limit(30)) : null, 
    [db, user]
  )
  const expensesQuery = useMemoFirebase(() => 
    user ? query(collection(db!, "users", user.uid, "expenses"), orderBy("expenseDate", "desc"), limit(30)) : null, 
    [db, user]
  )
  const transactionsQuery = useMemoFirebase(() => 
    user ? query(collection(db!, "users", user.uid, "paymentTransactions"), orderBy("transactionDate", "desc"), limit(20)) : null, 
    [db, user]
  )
  
  const customersQuery = useMemoFirebase(() => user ? collection(db!, "users", user.uid, "customers") : null, [db, user])
  const suppliersQuery = useMemoFirebase(() => user ? collection(db!, "users", user.uid, "suppliers") : null, [db, user])
  const campaignsQuery = useMemoFirebase(() => user ? collection(db!, "users", user.uid, "campaigns") : null, [db, user])

  const { data: invoices } = useCollection(invoicesQuery)
  const { data: purchases } = useCollection(purchasesQuery)
  const { data: expenses } = useCollection(expensesQuery)
  const { data: customers } = useCollection(customersQuery)
  const { data: suppliers } = useCollection(suppliersQuery)
  const { data: campaigns } = useCollection(campaignsQuery)
  const { data: historyTransactions } = useCollection(transactionsQuery)

  const contextSnapshot = useMemo(() => {
    if (!invoices || !purchases || !expenses || !historyTransactions) return null

    const campaignSummaries = campaigns?.map(camp => {
      const cInvoices = invoices.filter(i => i.campaignId === camp.id)
      const cPurchases = purchases.filter(p => p.campaignId === camp.id)
      const cExpenses = expenses.filter(e => e.campaignId === camp.id)
      
      const revenue = cInvoices.reduce((acc, i) => acc + (i.totalAmount || 0), 0)
      const costP = cPurchases.reduce((acc, p) => acc + (p.totalAmount || 0), 0)
      const costE = cExpenses.reduce((acc, e) => acc + (e.amount || 0), 0)
      
      return {
        id: camp.id,
        name: camp.name,
        status: camp.status === 'open' ? 'نشطة' : 'مؤرشفة',
        revenue,
        totalCost: costP + costE,
        netProfit: revenue - (costP + costE)
      }
    })

    const detailedSales = invoices.map(inv => {
      const customer = customers?.find(c => c.id === inv.customerId)
      return {
        id: inv.id,
        no: inv.invoiceNumber,
        client: customer?.name || "مجهول",
        total: inv.totalAmount,
        paid: inv.paidAmount,
        rem: inv.remainingAmount,
        date: inv.invoiceDate,
        items: inv.items || []
      }
    })

    const detailedPurchases = purchases.map(p => {
      const supplier = suppliers?.find(s => s.id === p.supplierId)
      return {
        id: p.id,
        no: p.invoiceNumber,
        supp: supplier?.name || "مجهول",
        total: p.totalAmount,
        paid: p.paidAmount,
        rem: p.remainingAmount,
        date: p.purchaseDate,
        items: p.items || []
      }
    })

    const recentPayments = historyTransactions.map(tr => ({
      name: tr.entityName,
      amt: tr.amount,
      type: tr.type === 'customer_payment' ? 'استلام' : 'صرف',
      date: tr.transactionDate,
      ref: tr.sourceNumber,
      notes: tr.notes
    }))

    const debtClients = customers?.map(c => {
      const debt = invoices.filter(i => i.customerId === c.id).reduce((acc, i) => acc + (i.remainingAmount || 0), 0)
      return { name: c.name, debt }
    }).filter(c => c.debt > 0).sort((a,b) => b.debt - a.debt)

    const debtSuppliers = suppliers?.map(s => {
      const debtP = purchases.filter(p => p.supplierId === s.id).reduce((acc, p) => acc + (p.remainingAmount || 0), 0)
      const debtE = expenses.filter(e => e.payeeId === s.id).reduce((acc, e) => acc + (e.remainingAmount || 0), 0)
      return { name: s.name, debt: debtP + debtE }
    }).filter(s => s.debt > 0).sort((a,b) => b.debt - a.debt)

    return {
      stats: {
        totalRev: invoices.reduce((acc, i) => acc + (i.totalAmount || 0), 0),
        totalPur: purchases.reduce((acc, p) => acc + (p.totalAmount || 0), 0),
        totalExp: expenses.reduce((acc, e) => acc + (e.amount || 0), 0),
      },
      campaigns: campaignSummaries,
      recentSales: detailedSales,
      recentPurchases: detailedPurchases,
      recentExpenses: expenses.map(e => ({ type: e.type, amt: e.amount, date: e.expenseDate, payee: e.payeeName })),
      repayments: recentPayments,
      topDebtors: debtClients,
      topCreditors: debtSuppliers
    }
  }, [invoices, purchases, expenses, customers, suppliers, campaigns, historyTransactions])

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
      
      // CRITICAL: Sanitize the snapshot to remove non-serializable objects (like Firestore Timestamps)
      // and ensure a clean JSON payload for the Server Action.
      const sanitizedContext = JSON.parse(JSON.stringify(contextSnapshot));
      
      const response = await smartChat(history, sanitizedContext)
      setMessages(prev => [...prev, { role: 'model', content: response }])
    } catch (e: any) {
      console.error("Chat Error:", e);
      setMessages(prev => [...prev, { role: 'model', content: `عذراً، حدث خطأ فني أثناء معالجة الطلب. يرجى إعادة المحاولة.` }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="p-4 bg-white border-b flex items-center justify-between sticky top-0 z-20 shadow-sm">
        <button onClick={() => router.back()} className="p-2 -mr-2"><ChevronLeft className="w-6 h-6 rotate-180" /></button>
        <div className="flex flex-col items-center">
          <h1 className="text-lg font-black text-primary flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-accent" />
            مساعد أبو صابر الذكي
          </h1>
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
            <span className="text-[9px] font-bold text-muted-foreground uppercase">مساعد مالي لحظي</span>
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
              "max-w-[92%] p-4 rounded-3xl shadow-sm text-sm leading-relaxed",
              msg.role === 'user' 
                ? "lux-gradient text-white rounded-tr-none" 
                : "bg-white text-foreground border rounded-tl-none font-medium overflow-hidden"
            )}>
              <div className="flex items-center gap-2 mb-2 opacity-50">
                 {msg.role === 'user' ? <User className="w-3 h-3" /> : <Bot className="w-3 h-3" />}
                 <span className="text-[9px] font-black uppercase">{msg.role === 'user' ? 'أنت' : 'المساعد الذكي'}</span>
              </div>
              <div className="prose prose-sm prose-slate max-w-none dark:prose-invert text-right" dir="rtl">
                <ReactMarkdown 
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h1: ({node, ...props}) => <h1 className="text-lg font-black mb-2 text-primary" {...props} />,
                    h2: ({node, ...props}) => <h2 className="text-md font-bold mb-2 text-primary" {...props} />,
                    h3: ({node, ...props}) => <h3 className="text-sm font-black mb-1 text-primary" {...props} />,
                    p: ({node, ...props}) => <p className="mb-2 last:mb-0 leading-relaxed" {...props} />,
                    ul: ({node, ...props}) => <ul className="list-disc list-inside mb-2 space-y-1" {...props} />,
                    ol: ({node, ...props}) => <ol className="list-decimal list-inside mb-2 space-y-1" {...props} />,
                    li: ({node, ...props}) => <li className="font-medium" {...props} />,
                    table: ({node, ...props}) => (
                      <div className="overflow-x-auto my-3 rounded-xl border border-border/50 bg-muted/20">
                        <table className="min-w-full divide-y divide-border/50 text-right" {...props} />
                      </div>
                    ),
                    thead: ({node, ...props}) => <thead className="bg-muted/50" {...props} />,
                    th: ({node, ...props}) => <th className="px-3 py-2 text-[10px] font-black text-muted-foreground uppercase" {...props} />,
                    td: ({node, ...props}) => <td className="px-3 py-2 text-[11px] font-bold border-t border-border/30 tabular-nums" {...props} />,
                    strong: ({node, ...props}) => <strong className="font-black text-primary" {...props} />,
                    em: ({node, ...props}) => <em className="italic opacity-80" {...props} />,
                  }}
                >
                  {msg.content}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start animate-in fade-in duration-300">
             <div className="bg-white border p-4 rounded-3xl rounded-tl-none flex items-center gap-3">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span className="text-xs font-bold text-muted-foreground">جاري تحليل البيانات وصياغة التقرير...</span>
             </div>
          </div>
        )}
      </main>

      <footer className="p-4 bg-white border-t sticky bottom-0 z-20 pb-safe">
        <div className="flex gap-2 max-w-lg mx-auto" dir="rtl">
          <Input 
            placeholder="اسألني عن مبيعات حملة، ديون عملاء..."
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
    </div>
  )
}
