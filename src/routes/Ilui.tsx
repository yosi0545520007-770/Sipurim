import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function Ilui() {
  const [mem, setMem] = useState<any[]>([])
  useEffect(()=>{
    supabase
      .from('memorials')
      .select('id,honoree,note,event_date,story_id, stories!inner(title)')
      .order('event_date', { ascending: false })
      .then(({data})=> setMem(data || []))
  },[])
  return (
    <section className="container mx-auto px-4 py-10" dir="rtl">
      <h1 className="text-2xl font-bold mb-4">לעילוי נשמת</h1>
      <ul className="grid md:grid-cols-2 gap-4">
        {mem.map(m=>(
          <li key={m.id} className="rounded-2xl border bg-white p-4">
            <div className="font-semibold">{m.honoree}</div>
            <div className="text-sm text-gray-500">{m.event_date && new Date(m.event_date).toLocaleDateString('he-IL')}</div>
            <div className="text-gray-700 mt-2">{m.note}</div>
            <div className="text-sm text-gray-600 mt-2">סיפור קשור: {m.stories?.title || '—'}</div>
          </li>
        ))}
      </ul>
    </section>
  )
}
