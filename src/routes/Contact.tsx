'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export function Component() {
  const [f, setF] = useState({ name: '', email: '', subject: '', message: '' })
  async function submit(e:any){
    e.preventDefault()
    const { error } = await supabase.from('contact_messages').insert(f)
    if (error) alert(error.message); else { alert('נשלח!'); setF({name:'',email:'',subject:'',message:''}); }
  }
  return (
    <section className="p-6 max-w-2xl">
      <h1 className="text-xl font-bold mb-4">צור קשר</h1>
      <form onSubmit={submit} className="grid gap-3">
        {['name','email','subject','message'].map((k)=> (
          <div key={k} className="grid gap-1">
            <label className="text-sm text-gray-600">{k}</label>
            {k==='message' ? (
              <textarea required className="border rounded-lg p-3" value={(f as any)[k]}
                        onChange={(e)=> setF({ ...f, [k]: e.target.value })} />
            ):(
              <input required className="border rounded-lg p-3" value={(f as any)[k]}
                     onChange={(e)=> setF({ ...f, [k]: e.target.value })} />
            )}
          </div>
        ))}
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg">שליחה</button>
      </form>
    </section>
  )
}
