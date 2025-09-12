import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'

type Ctx = { editMode: boolean; setEditMode: (v: boolean) => void; toggle: () => void }
const EditModeContext = createContext<Ctx | undefined>(undefined)

export function EditModeProvider({ children }: { children: React.ReactNode }) {
  const [editMode, setEditMode] = useState<boolean>(() => {
    try { return localStorage.getItem('editMode') === '1' } catch { return false }
  })
  useEffect(() => { try { localStorage.setItem('editMode', editMode ? '1' : '0') } catch {} }, [editMode])
  const value = useMemo(() => ({ editMode, setEditMode, toggle: () => setEditMode(v => !v) }), [editMode])
  return <EditModeContext.Provider value={value}>{children}</EditModeContext.Provider>
}

export function useEditMode() {
  const ctx = useContext(EditModeContext)
  if (!ctx) throw new Error('useEditMode must be used within EditModeProvider')
  return ctx
}

export function EditModeToggle() {
  const { editMode, toggle } = useEditMode()
  return (
    <button
      type="button"
      onClick={toggle}
      title="מצב עריכה"
      className={`fixed bottom-4 left-4 z-50 rounded-full px-4 py-2 shadow-md border text-sm ${editMode ? 'bg-blue-600 text-white' : 'bg-white text-gray-800'}`}
      dir="rtl"
    >
      {editMode ? 'מצב עריכה: פעיל' : 'מצב עריכה: כבוי'}
    </button>
  )
}

