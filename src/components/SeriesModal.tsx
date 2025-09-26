import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { usePlayer } from './PlayerProvider'
import { X, Loader2, ListPlus } from 'lucide-react'

type StoryTrack = {
  id: string
  title: string
  audio_url: string
  series_id: string
}

type SeriesModalProps = {
  seriesId: string
  seriesTitle: string
  onClose: () => void
}

export function SeriesModal({ seriesId, seriesTitle, onClose }: SeriesModalProps) {
  const player = usePlayer()
  const [stories, setStories] = useState<StoryTrack[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStories() {
      try {
        setLoading(true)
        const { data, error } = await supabase
          .from('stories')
          .select('id, title, audio_url, series_id')
          .eq('series_id', seriesId)
          .not('audio_url', 'is', null)
          .order('series_order', { ascending: true })
          .order('publish_at', { ascending: true })

        if (error) throw error
        setStories((data || []) as StoryTrack[])
      } catch (e: any) {
        alert(e.message || 'שגיאה בטעינת פרקי הסדרה')
        onClose()
      } finally {
        setLoading(false)
      }
    }
    fetchStories()
  }, [seriesId, onClose])

  function playFromModal(storyIndex: number) {
    if (stories.length > 0) {
      player.playQueue(stories, storyIndex)
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <header className="p-4 border-b flex justify-between items-center">
          <h2 className="text-lg font-bold">פרקים בסדרה: {seriesTitle}</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100"><X className="w-5 h-5" /></button>
        </header>
        <div className="p-4 overflow-y-auto">
          {loading && <div className="flex items-center justify-center gap-2 text-gray-500"><Loader2 className="w-5 h-5 animate-spin" /><span>טוען פרקים...</span></div>}
          {!loading && stories.map((story, index) => (
            <li key={story.id} className={`group w-full text-right p-3 rounded-lg transition-colors flex items-center justify-between gap-3 ${player.current?.id === story.id ? 'bg-blue-50' : 'hover:bg-gray-100'}`}>
              <button onClick={() => playFromModal(index)} className="flex items-center gap-3 flex-1">
                  <span className="text-sm text-gray-500">{index + 1}.</span>
                  <span className={`font-medium text-right ${player.current?.id === story.id ? 'text-blue-600' : ''}`}>{story.title}</span>
              </button>
              {player.current && player.current.id !== story.id && (
                <button
                  onClick={() => player.playNextInQueue(story)}
                  className="p-1 text-gray-400 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="נגן הבא בתור"
                >
                  <ListPlus className="w-5 h-5" />
                </button>
              )}
            </li>
          ))}
          {!loading && stories.length === 0 && <p className="text-gray-500 text-center">לא נמצאו פרקים לסדרה זו.</p>}
        </div>
      </div>
    </div>
  )
}