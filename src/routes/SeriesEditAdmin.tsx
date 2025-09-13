import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Loader2, GripVertical, Check, X } from 'lucide-react'

type Series = {
  id: string
  title: string
  description: string | null
  cover_url: string | null
}

type Story = {
  id: string
  title: string
  audio_url: string | null
  series_order: number | null
}

const BUCKET = 'media'
async function uploadToBucket(file: File, folder: string) {
  const ext = (file.name.split('.').pop() || 'bin').toLowerCase()
  const targetFolder = (ext === 'mp3' || ext === 'm4a') ? 'mp3' : folder
  const path = `${targetFolder}/${Date.now()}-${Math.random().toString(16).slice(2)}.${ext}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    upsert: false,
    cacheControl: '3600',
    contentType: file.type || (
      ['jpg','jpeg','png','gif','webp','avif'].includes(ext) ? `image/${ext === 'jpg' ? 'jpeg' : ext}` :
      (ext === 'mp3' ? 'audio/mpeg' :
       ext === 'm4a' ? 'audio/mp4' :
       undefined)
    )
  })
  if (error) throw error
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}


export function Component() {
  const { seriesId } = useParams<{ seriesId: string }>()
  const [series, setSeries] = useState<Series | null>(null)
  const [stories, setStories] = useState<Story[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [isBusy, setIsBusy] = useState(false)

  // State for the "Add Story" modal
  const [isStoryModalOpen, setIsStoryModalOpen] = useState(false)
  const [newStoryTitle, setNewStoryTitle] = useState('')
  const [newStoryFiles, setNewStoryFiles] = useState<FileList | null>(null)

  // State for inline story editing
  const [editingStoryId, setEditingStoryId] = useState<string | null>(null)
  const [editingStoryTitle, setEditingStoryTitle] = useState('')

  // Drag and Drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dropIndex, setDropIndex] = useState<number | null>(null)


  useEffect(() => {
    if (!seriesId) return

    async function loadData() {
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
          .order('series_order', { ascending: true, nullsFirst: false })

        if (storiesError) throw storiesError
        setStories(storiesData || [])
      } catch (e: any) {
        setErr(e.message || 'שגיאה בטעינת נתוני הסדרה')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [seriesId])

  const handleSeriesChange = (field: keyof Series, value: string) => {
    if (series) {
      setSeries({ ...series, [field]: value })
    }
  }

  const handleSaveSeries = async () => {
    if (!series) return
    try {
      setErr(null); setMsg(null); setIsBusy(true);
      const { error } = await supabase
        .from('series')
        .update({
          title: series.title,
          description: series.description,
          cover_url: series.cover_url,
        })
        .eq('id', series.id)
      if (error) throw error
      setMsg('פרטי הסדרה עודכנו בהצלחה!')
    } catch (e: any) {
      setErr(e.message || 'שגיאה בעדכון פרטי הסדרה')
    } finally {
      setIsBusy(false)
    }
  }

  const handleCoverImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !series) return
    try {
      setErr(null); setMsg(null); setIsBusy(true);
      const url = await uploadToBucket(file, 'images')
      setSeries({ ...series, cover_url: url })
      setMsg('תמונת הנושא הועלתה. יש ללחוץ על "שמור שינויים" כדי לעדכן.')
    } catch (ex: any) {
      setErr(ex.message || 'שגיאת העלאת תמונה')
    } finally {
      setIsBusy(false)
      e.target.value = '' // Reset file input
    }
  }

  const handleAddStory = async () => {
    if (!seriesId || !newStoryFiles || newStoryFiles.length === 0) {
      setErr('יש לבחור קובץ שמע אחד או יותר.')
      return
    }
    try {
      setErr(null); setMsg(null); setIsBusy(true);
      let currentOrder = (stories[stories.length - 1]?.series_order || 0)
      const addedStories = []

      for (const file of Array.from(newStoryFiles)) {
        const audio_url = await uploadToBucket(file, 'mp3')
        const storyTitle = file.name.replace(/\.[^/.]+$/, '')
        currentOrder++

        const { data, error } = await supabase
          .from('stories')
          .insert({
            title: storyTitle,
            series_id: seriesId,
            audio_url: audio_url,
            series_order: currentOrder,
          })
          .select('id, title, audio_url, series_order')
          .single()

        if (error) throw error
        addedStories.push(data)
      }

      setStories([...stories, ...addedStories])
      setMsg(`${addedStories.length} פרקים נוספו בהצלחה!`)
      setIsStoryModalOpen(false)
      setNewStoryFiles(null)
    } catch (e: any) {
      setErr(e.message || `שגיאה בהוספת ${newStoryFiles.length > 1 ? 'פרקים' : 'פרק'}`)
    } finally {
      setIsBusy(false)
    }
  }

  const handleDeleteStory = async (storyId: string) => {
    if (!confirm('האם למחוק את הפרק הזה? הפעולה תסיר אותו לצמיתות.')) return
    try {
      setErr(null); setMsg(null); setIsBusy(true);
      const { error } = await supabase.from('stories').delete().eq('id', storyId)
      if (error) throw error
      setStories(stories.filter(s => s.id !== storyId))
      setMsg('הפרק נמחק בהצלחה.')
    } catch (e: any) {
      setErr(e.message || 'שגיאה במחיקת הפרק')
    } finally {
      setIsBusy(false)
    }
  }

  const moveStory = async (index: number, direction: 'up' | 'down') => {
    const newStories = [...stories]
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= newStories.length) return

    [newStories[index], newStories[targetIndex]] = [newStories[targetIndex], newStories[index]];

    const updatedStories = newStories.map((story, i) => ({ ...story, series_order: i + 1 }))
    setStories(updatedStories) // Optimistic UI update

    try {
      setIsBusy(true)
      setErr(null)
      // Update each story's order individually
      for (const story of updatedStories) {
        const { error } = await supabase.from('stories').update({ series_order: story.series_order }).eq('id', story.id)
        if (error) throw error
      }
      setMsg('סדר הפרקים עודכן')
    } catch (e: any) {
      setErr(e.message || 'שגיאה בעדכון סדר הפרקים')
    } finally {
      setIsBusy(false)
    }
  }

  const startEditingStory = (story: Story) => {
    setEditingStoryId(story.id)
    setEditingStoryTitle(story.title)
  }

  const cancelEditingStory = () => {
    setEditingStoryId(null)
    setEditingStoryTitle('')
  }

  const handleUpdateStoryTitle = async () => {
    if (!editingStoryId || !editingStoryTitle.trim()) {
      cancelEditingStory()
      return
    }
    try {
      setErr(null); setMsg(null); setIsBusy(true);
      const { error } = await supabase
        .from('stories')
        .update({ title: editingStoryTitle.trim() })
        .eq('id', editingStoryId)
      if (error) throw error
      setStories(stories.map(s => s.id === editingStoryId ? { ...s, title: editingStoryTitle.trim() } : s))
      setMsg('שם הפרק עודכן.')
      cancelEditingStory()
    } catch (e: any) {
      setErr(e.message || 'שגיאה בעדכון שם הפרק')
    } finally {
      setIsBusy(false)
    }
  }

  // --- Drag and Drop Handlers ---
  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragEnter = (index: number) => {
    if (draggedIndex === null || draggedIndex === index) return
    setDropIndex(index)
  }

  const handleDragEnd = async () => {
    if (draggedIndex === null || dropIndex === null || draggedIndex === dropIndex) {
      resetDragState()
      return
    }

    const newStories = [...stories]
    const [draggedItem] = newStories.splice(draggedIndex, 1)
    newStories.splice(dropIndex, 0, draggedItem)

    // This triggers the same re-ordering logic as the arrow buttons
    await moveStory(dropIndex, 'up') // A bit of a hack, but reuses the logic

    resetDragState()
  }

  const resetDragState = () => {
    setDraggedIndex(null)
    setDropIndex(null)
  }

  if (loading) return <div className="p-6">טוען נתונים...</div>
  if (err) return <div className="p-6 text-red-600">{err}</div>
  if (!series) return <div className="p-6">לא נמצאה סדרה.</div>

  return (
    <section className="p-6 space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">עריכת סדרה: {series.title}</h1>
        <Link to="/admin/series" className="text-sm text-blue-600 hover:underline">
          &larr; חזרה לכל הסדרות
        </Link>
      </div>

      {msg && <div className="rounded-lg bg-green-50 text-green-700 p-3">{msg}</div>}

      {/* Series Details Form */}
      <div className="p-4 border rounded-2xl bg-white space-y-4">
        <h2 className="text-lg font-semibold">פרטי הסדרה</h2>
        <div>
          <label className="text-sm text-gray-600">שם הסדרה (כותרת)</label>
          <input
            type="text"
            value={series.title}
            onChange={(e) => handleSeriesChange('title', e.target.value)}
            className="w-full mt-1 border rounded-lg p-2"
          />
        </div>
        <div>
          <label className="text-sm text-gray-600">תקציר</label>
          <textarea
            value={series.description || ''}
            onChange={(e) => handleSeriesChange('description', e.target.value)}
            className="w-full mt-1 border rounded-lg p-2 min-h-[100px]"
          />
        </div>
        <div>
          <label className="text-sm text-gray-600">תמונת נושא</label>
          <div className="flex items-center gap-4 mt-1">
            {series.cover_url && <img src={series.cover_url} alt="תמונת נושא" className="w-20 h-20 rounded-lg object-cover border" />}
            <div className="flex-1">
              <input
                type="text"
                placeholder="הדבק URL או העלה קובץ"
                value={series.cover_url || ''}
                onChange={(e) => handleSeriesChange('cover_url', e.target.value)}
                className="w-full border rounded-lg p-2"
              />
              <div className="text-xs text-gray-500 mt-1">או העלאה:</div>
              <input type="file" accept="image/*" onChange={handleCoverImageUpload} disabled={isBusy} className="text-sm" />
            </div>
          </div>
        </div>
        <div className="text-left">
          <button onClick={handleSaveSeries} disabled={isBusy} className="bg-blue-600 text-white px-4 py-2 rounded-lg disabled:opacity-50">
            שמור שינויים בסדרה
          </button>
        </div>
      </div>

      {/* Stories/Chapters Management */}
      <div className="p-4 border rounded-2xl bg-white space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">פרקי הסדרה</h2>
          <button onClick={() => setIsStoryModalOpen(true)} className="bg-green-600 text-white px-3 py-1 rounded-lg text-sm">
            + הוסף פרק/קובץ שמע
          </button>
        </div>
        <div className="divide-y border rounded-lg">
          {stories.map((story, index) => (
            <div
              key={story.id}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragEnter={() => handleDragEnter(index)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => e.preventDefault()}
              className={`flex items-center p-2 gap-3 transition-colors cursor-grab ${draggedIndex === index ? 'bg-blue-100 opacity-50' : ''} ${dropIndex === index ? 'border-t-2 border-blue-500' : ''}`}
            >
              <GripVertical className="w-5 h-5 text-gray-400" />
              <span className="text-sm text-gray-500 w-6 text-center">{index + 1}.</span>
              {editingStoryId === story.id ? (
                <input
                  type="text"
                  value={editingStoryTitle}
                  onChange={(e) => setEditingStoryTitle(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleUpdateStoryTitle()}
                  onBlur={handleUpdateStoryTitle}
                  className="flex-1 font-medium p-1 border rounded-md"
                  autoFocus
                />
              ) : (
                <div className="flex-1 font-medium">{story.title}</div>
              )}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => startEditingStory(story)}
                  disabled={isBusy}
                  className="text-blue-500 hover:text-blue-700 disabled:opacity-50 text-sm px-2 py-1"
                >
                  ערוך
                </button>
                <button
                  onClick={() => handleDeleteStory(story.id)}
                  disabled={isBusy}
                  className="text-red-500 hover:text-red-700 disabled:opacity-50 text-sm px-2 py-1"
                >
                  מחק
                </button>
              </div>
            </div>
          ))}
          {stories.length === 0 && <div className="p-3 text-gray-500">אין עדיין פרקים בסדרה זו.</div>}
        </div>
      </div>

      {/* Add Story Modal */}
      {isStoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 grid place-items-center p-4" onClick={() => setIsStoryModalOpen(false)}>
          <div className="bg-white rounded-2xl w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4">הוספת פרק חדש</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-600">קובץ שמע *</label>
                <input
                  type="file"
                  accept="audio/*"
                  multiple
                  onChange={(e) => {
                    setNewStoryFiles(e.target.files)
                  }}
                  className="w-full mt-1 text-sm" />
              </div>
            </div>
            <div className="flex gap-2 mt-6 justify-end">
              <button className="bg-gray-200 px-4 py-2 rounded-lg" onClick={() => setIsStoryModalOpen(false)} disabled={isBusy}>ביטול</button>
              <button className="bg-blue-600 text-white px-4 py-2 rounded-lg disabled:opacity-50" onClick={handleAddStory} disabled={isBusy}>
                {isBusy ? <Loader2 className="animate-spin" /> : 'הוסף והעלה'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}