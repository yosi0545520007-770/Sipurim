'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { ResponsiveContainer, AreaChart, XAxis, YAxis, Tooltip, Area } from 'recharts'

function fmtDate(d: string) { return new Date(d).toLocaleDateString('he-IL') }

export default function Dashboard() {
  const [stats, setStats] = useState<{stories: number; series: number; faq: number; contacts: number}>({stories:0,series:0,faq:0,contacts:0})
  const [recentStories, setRecentStories] = useState<any[]>([])
  const [chartData, setChartData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      setLoading(true)
      const [{ count: cStories }, { count: cSeries }, { count: cFaq }, { count: cContacts }] = await Promise.all([
        supabase.from('stories').select('*', { count: 'exact', head: true }),
        supabase.from('series').select('*', { count: 'exact', head: true }),
        supabase.from('faq').select('*', { count: 'exact', head: true }),
        supabase.from('contact_messages').select('*', { count: 'exact', head: true }),
      ])

      const { data: recent } = await supabase
        .from('stories')
        .select('id,title,publish_at,updated_at')
        .order('updated_at', { ascending: false })
        .limit(8)

      const { data: timeline } = await supabase
        .from('stories')
        .select('id, publish_at')
        .order('publish_at')

      const byDay = new Map<string, number>()
      ;(timeline || []).forEach((r:any) => {
        const key = (r.publish_at ? new Date(r.publish_at) : new Date()).toISOString().slice(0,10)
        byDay.set(key, (byDay.get(key) || 0) + 1)
      })
      const chart = Array.from(byDay.entries()).map(([date, value]) => ({ date, value }))

      setStats({
        stories: cStories || 0,
        series: cSeries || 0,
        faq: cFaq || 0,
        contacts: cContacts || 0,
      })
      setRecentStories(recent || [])
      setChartData(chart)
      setLoading(false)
    })()
  }, [])

  return (
    <section className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">דשבורד ניהול</h1>
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'סיפורים', value: stats.stories },
          { label: 'סדרות', value: stats.series },
          { label: 'ש.נפוצות', value: stats.faq },
          { label: 'פניות', value: stats.contacts },
        ].map((k, i) => (
          <div key={i} className="rounded-2xl border p-4 bg-white">
            <div className="text-sm text-gray-500">{k.label}</div>
            <div className="text-2xl font-bold">{loading ? '…' : k.value}</div>
          </div>
        ))}
      </section>

      <section className="rounded-2xl border p-4 bg-white">
        <div className="mb-3 font-medium">פרסומים לפי יום</div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ left: 10, right: 10, top: 10, bottom: 0 }}>
              <XAxis dataKey="date" tickFormatter={(d) => new Date(d).toLocaleDateString('he-IL')} />
              <YAxis allowDecimals={false} />
              <Tooltip labelFormatter={(d) => new Date(d as string).toLocaleDateString('he-IL')} />
              <Area type="monotone" dataKey="value" stroke="#3b82f6" fill="#bfdbfe" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="rounded-2xl border overflow-hidden bg-white">
        <div className="p-4 font-medium">סיפורים אחרונים</div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-3 text-right">כותרת</th>
              <th className="p-3 text-right">פורסם</th>
              <th className="p-3 text-right">עודכן</th>
            </tr>
          </thead>
          <tbody>
            {recentStories.map((r:any) => (
              <tr key={r.id} className="border-t">
                <td className="p-3">{r.title}</td>
                <td className="p-3">{r.publish_at ? fmtDate(r.publish_at) : '—'}</td>
                <td className="p-3">{r.updated_at ? fmtDate(r.updated_at) : '—'}</td>
              </tr>
            ))}
            {!loading && recentStories.length === 0 && (
              <tr><td className="p-3" colSpan={3}>אין נתונים עדיין.</td></tr>
            )}
          </tbody>
        </table>
      </section>
    </section>
  )
}
