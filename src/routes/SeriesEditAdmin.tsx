import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

type Series = { id: string; title: string; description: string | null; cover_url: string | null }
type Story = { id: string; title: string; audio_url: string | null; series_order: number | null }
function hasVal(v?: string | null) { return !!(v && String(v).trim()) }
const BUCKET = 'media'

async function uploadAudio(file: File, seriesId: string) {
  const ext = (file.name.split('.').pop() || 'bin').toLowerCase()
  const path = `mp3/${seriesId}/${Date.now()}-${Math.random().toString(16).slice(2)}.${ext}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    upsert: false,
    cacheControl: '3600',
    contentType: file.type || 'audio/mpeg',
  })
  if (error) throw error
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}

async function uploadCover(file: File) {
  const ext = (file.name.split('.').pop() || 'bin').toLowerCase()
  const path = `series-covers/${Date.now()}-${Math.random().toString(16).slice(2)}.${ext}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    upsert: false,
    cacheControl: '3600',
    contentType: file.type || `image/${ext === 'jpg' ? 'jpeg' : ext}`,
  })
  if (error) throw error
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}

export default function SeriesEditAdmin() {
  const { seriesId } = useParams<{ seriesId: string }>()
  const [series, setSeries] = useState<Series | null>(null)
  const [stories, setStories] = useState<Story[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  async function loadData() {
    if (!seriesId) return
    try {
      setLoading(true)
      setErr(null)
      const { data: seriesData, error: seriesError } = await supabase
        .from('series')
        .select('id, title, description, cover_url')
        .eq('id', seriesId)
        .single()
      if (seriesError) throw seriesError
      setSeries(seriesData)

      const { data: storiesData, error: storiesError } = await supabase
        .from('stories')
        .select('id, title, audio_url, series_order')
        .eq('series_id', seriesId)
        .order('series_order', { ascending: true, nullsFirst: true })
        .order('created_at', { ascending: true })
      if (storiesError) throw storiesError
      setStories(storiesData || [])
    } catch (e: any) {
      setErr(e.message || 'שגיאה בטעינת נתונים')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [seriesId])

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0 || !seriesId) return

    setUploading(true)
    setErr(null)
    setMsg(`מעלה ${files.length} קבצים...`)

    const newStories = []
    for (const file of Array.from(files)) {
      try {
        const audio_url = await uploadAudio(file, seriesId)
        // Use filename as title, without extension
        const title = file.name.split('.').slice(0, -1).join('.') || file.name
        newStories.push({
          title,
          audio_url,
          series_id: seriesId,
          // You might want to set a default publish_at or other fields
        })
      } catch (uploadError: any) {
        setErr(`שגיאה בהעלאת הקובץ ${file.name}: ${uploadError.message}`)
        // Continue to next file
      }
    }

    if (newStories.length > 0) {
      const { error: insertError } = await supabase.from('stories').insert(newStories)
      if (insertError) {
        setErr(insertError.message)
      } else {
        setMsg(`${newStories.length} פרקים הועלו ונוספו לסדרה בהצלחה!`)
        await loadData() // Refresh list
      }
    } else {
      setMsg(null) // Clear "uploading..." message if all failed
    }

    setUploading(false)
    e.target.value = '' // Reset file input
  }

  async function removeStory(storyId: string) {
    if (!confirm('למחוק את הפרק? הפעולה תמחק את הסיפור המשויך.')) return
    try {
      setErr(null)
      const { error } = await supabase.from('stories').delete().eq('id', storyId)
      if (error) throw error
      setMsg('הפרק נמחק')
      await loadData()
    } catch (e: any) {
      setErr(e.message || 'שגיאה במחיקת הפרק')
    }
  }

  async function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f || !series) return
    try {
      setUploading(true)
      setErr(null)
      const url = await uploadCover(f)
      setSeries({ ...series, cover_url: url })
      setMsg('התמונה הועלתה ✓')
    } catch (ex: any) {
      setErr(ex?.message || 'שגיאת העלאת תמונה')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  async function saveSeriesDetails() {
    if (!series) return
    try {
      setUploading(true)
      setErr(null)
      const payload = {
        title: (series.title || '').trim(),
        description: (series.description || '').trim() || null,
        cover_url: (series.cover_url || '').trim() || null,
      }
      if (!payload.title) throw new Error('כותרת חובה')
      const { error } = await supabase.from('series').update(payload).eq('id', series.id)
      if (error) throw error
      setMsg('פרטי הסדרה עודכנו ✓')
    } catch (e: any) {
      setErr(e.message || 'שגיאה בעדכון פרטי הסדרה')
    } finally {
      setUploading(false)
    }
  }

  if (loading) return <div className="p-6 text-gray-500" dir="rtl">טוען פרטי סדרה...</div>
  if (err) return <div className="p-6 bg-red-50 text-red-700 rounded-lg" dir="rtl">{err}</div>
  if (!series) return <div className="p-6 text-gray-500" dir="rtl">הסדרה לא נמצאה.</div>

  return (
    <section className="p-6 space-y-6" dir="rtl">
      <Link to="/admin/series" className="text-sm text-blue-600 hover:underline">&larr; חזרה לכל הסדרות</Link>

      {msg && <div className="rounded-lg bg-green-50 text-green-700 p-3">{msg}</div>}

      <div className="rounded-2xl border bg-white p-4">
        <h2 className="text-lg font-semibold mb-3">פרטי הסדרה</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="grid gap-1"><label className="text-sm text-gray-600">כותרת *</label><input className="border rounded-lg p-3" value={series.title} onChange={(e) => setSeries({ ...series, title: e.target.value })} /></div>
          <div className="grid gap-1"><label className="text-sm text-gray-600">תיאור</label><textarea className="border rounded-lg p-3 min-h-[100px]" value={series.description || ''} onChange={(e) => setSeries({ ...series, description: e.target.value })} /></div>
          <div className="grid gap-1">
            <label className="text-sm text-gray-600">תמונת שער</label>
            <input className="border rounded-lg p-3 w-full" placeholder="https://... כתובת ישירה" value={series.cover_url || ''} onChange={(e) => setSeries({ ...series, cover_url: e.target.value })} />
            <div className="text-xs text-gray-500 mt-1">או העלאה:</div>
            <input type="file" accept="image/*" onChange={onPickImage} disabled={uploading} />
            {hasVal(series.cover_url) && (
              <div className="relative w-24 h-24 mt-2">
                <img src={series.cover_url!} alt="תצוגה מקדימה" className="w-full h-full object-cover rounded-lg" />
                <button onClick={() => setSeries({ ...series, cover_url: null })} className="absolute top-0 right-0 -mt-2 -mr-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs" title="הסר תמונה">✕</button>
              </div>
            )}
          </div>
        </div>
        <div className="mt-4">
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg disabled:opacity-50" disabled={uploading} onClick={saveSeriesDetails}>
            {uploading ? 'מעדכן...' : 'שמור פרטי סדרה'}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border bg-white p-4">
        <h2 className="text-lg font-semibold mb-3">העלאת פרקים חדשים</h2>
        <p className="text-sm text-gray-500 mb-2">בחר קובץ שמע אחד או יותר. כל קובץ יהפוך לפרק חדש בסדרה. שם הקובץ ישמש כשם הפרק.</p>
        <input
          type="file"
          multiple
          accept="audio/*"
          onChange={handleFileUpload}
          disabled={uploading}
          className="disabled:opacity-50"
        />
        {uploading && <div className="text-sm text-blue-600 mt-2">מעבד קבצים, נא להמתין...</div>}
      </div>

      <div className="rounded-2xl border overflow-x-auto bg-white">
        <h2 className="text-lg font-semibold p-4">פרקים בסדרה ({stories.length})</h2>
        <table className="w-full min-w-[600px] text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-3 text-right w-12">סדר</th>
              <th className="p-3 text-right">שם הפרק</th>
              <th className="p-3 text-right">פעולות</th>
            </tr>
          </thead>
          <tbody>
            {stories.map((story, index) => (
              <tr key={story.id} className="border-t">
                <td className="p-3 text-center">{story.series_order ?? index + 1}</td>
                <td className="p-3 font-medium">{story.title}</td>
                <td className="p-3">
                  <div className="flex gap-2">
                    <a href={`/admin/stories?edit=${story.id}`} target="_blank" className="px-3 py-1 rounded-lg border text-blue-600">ערוך פרק</a>
                    <button className="px-3 py-1 rounded-lg border border-red-300 text-red-600" onClick={() => removeStory(story.id)}>מחיקה</button>
                  </div>
                </td>
              </tr>
            ))}
            {stories.length === 0 && (
              <tr><td colSpan={3} className="p-4 text-center text-gray-500">אין עדיין פרקים בסדרה זו.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}