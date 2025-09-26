import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Link } from 'react-router-dom'
import { Loader2, Plus, Music } from 'lucide-react'
import type { User } from '@supabase/supabase-js'

type Playlist = {
  id: string
  name: string
  created_at: string
}

export function Component() {
  const [user, setUser] = useState<User | null>(null)
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newPlaylistName, setNewPlaylistName] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    const fetchUserAndPlaylists = async () => {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      if (user) {
        try {
          const { data, error: playlistError } = await supabase
            .from('playlists')
            .select('id, name, created_at')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })

          if (playlistError) throw playlistError
          setPlaylists(data || [])
        } catch (e: any) {
          setError(e.message || 'שגיאה בטעינת רשימות ההשמעה')
        }
      }
      setLoading(false)
    }

    fetchUserAndPlaylists()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user?.id !== user?.id) {
        fetchUserAndPlaylists()
      }
    })

    return () => subscription.unsubscribe()
  }, [user?.id])

  const handleCreatePlaylist = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPlaylistName.trim() || !user) return

    setIsCreating(true)
    try {
      const { data, error } = await supabase
        .from('playlists')
        .insert({ name: newPlaylistName, user_id: user.id })
        .select()
        .single()

      if (error) throw error
      if (data) setPlaylists(prev => [data, ...prev])
      setNewPlaylistName('')
    } catch (e: any) {
      alert(e.message || 'שגיאה ביצירת רשימת השמעה')
    } finally {
      setIsCreating(false)
    }
  }

  if (loading) {
    return <div className="p-6 text-center">טוען...</div>
  }

  if (!user) {
    return <div className="p-6 text-center">יש להתחבר כדי לראות את רשימות ההשמעה שלך.</div>
  }

  return (
    <section className="max-w-4xl mx-auto px-4 py-10" dir="rtl">
      <h1 className="text-3xl font-bold mb-6">רשימות ההשמעה שלי</h1>

      <form onSubmit={handleCreatePlaylist} className="mb-8 flex gap-2">
        <input
          type="text"
          value={newPlaylistName}
          onChange={(e) => setNewPlaylistName(e.target.value)}
          placeholder="שם רשימת ההשמעה החדשה"
          className="flex-grow p-2 border rounded-lg"
          required
        />
        <button type="submit" disabled={isCreating} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50">
          {isCreating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
          <span>צור רשימה</span>
        </button>
      </form>

      {error && <div className="bg-red-50 text-red-700 p-3 rounded mb-4">{error}</div>}

      <div className="space-y-3">
        {playlists.length > 0 ? (
          playlists.map(playlist => (
            <Link key={playlist.id} to={`/playlist/${playlist.id}`} className="flex items-center gap-4 p-4 bg-white border rounded-lg shadow-sm hover:bg-gray-50">
              <Music className="w-6 h-6 text-blue-500" />
              <span className="font-semibold">{playlist.name}</span>
            </Link>
          ))
        ) : (
          <p className="text-gray-500">עדיין לא יצרת רשימות השמעה.</p>
        )}
      </div>
    </section>
  )
}