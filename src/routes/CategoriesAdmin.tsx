import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Category = { id: string; name: string };

export default function CategoriesAdmin() {
  const [list, setList] = useState<Category[]>([]);
  const [name, setName] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // --- מצב חדש לניהול עריכה ---
  const [editingItem, setEditingItem] = useState<Category | null>(null);
  const [editingName, setEditingName] = useState('');
  // ------------------------------

  async function load() {
    try {
      setErr(null);
      setLoading(true);
      const { data, error } = await supabase.from('categories').select('id,name').order('name');
      if (error) throw error;
      setList(data || []);
    } catch (e: any) {
      setErr(e.message || 'שגיאה בטעינה');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // --- CREATE ---
  async function save() {
    try {
      setErr(null); setMsg(null);
      if (!name.trim()) throw new Error('שם קטגוריה חובה');
      const { error } = await supabase.from('categories').insert({ name: name.trim() });
      if (error) throw error;
      setName('');
      setMsg('קטגוריה נוספה ✓');
      load();
    } catch (e: any) {
      setErr(e.message || 'שגיאת שמירה');
    }
  }

  // --- DELETE ---
  async function remove(id: string) {
    if (window.confirm('האם אתה בטוח שברצונך למחוק קטגוריה זו?')) {
      try {
        setErr(null); setMsg(null);
        const { error } = await supabase.from('categories').delete().eq('id', id);
        if (error) throw error;
        setMsg('קטגוריה נמחקה ✓');
        load();
      } catch (e: any) {
        setErr(e.message || 'שגיאת מחיקה');
      }
    }
  }

  // --- UPDATE ---
  async function update() {
    if (!editingItem) return;
    try {
      setErr(null); setMsg(null);
      if (!editingName.trim()) throw new Error('שם קטגוריה חובה');
      const { error } = await supabase.from('categories').update({ name: editingName.trim() }).eq('id', editingItem.id);
      if (error) throw error;
      setMsg('קטגוריה עודכנה ✓');
      setEditingItem(null); // יציאה ממצב עריכה
      setEditingName('');
      load();
    } catch (e: any) {
      setErr(e.message || 'שגיאת עדכון');
    }
  }

  // פונקציות עזר למצב עריכה
  function startEditing(category: Category) {
    setEditingItem(category);
    setEditingName(category.name);
  }

  function cancelEditing() {
    setEditingItem(null);
    setEditingName('');
  }


  return (
    <section className="p-6 max-w-2xl mx-auto" dir="rtl">
      <h1 className="text-2xl font-bold mb-4">ניהול קטגוריות</h1>

      {err && <div className="bg-red-50 text-red-700 p-3 rounded mb-3">{err}</div>}
      {msg && <div className="bg-green-50 text-green-700 p-3 rounded mb-3">{msg}</div>}

      <div className="flex gap-2 mb-6">
        <input
          className="border rounded-lg p-2 flex-1 disabled:bg-gray-100"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="שם קטגוריה חדשה"
          disabled={!!editingItem} // מושבת בזמן עריכה
        />
        <button 
          className="bg-blue-600 text-white px-4 rounded-lg disabled:bg-gray-400" 
          onClick={save}
          disabled={!!editingItem} // מושבת בזמן עריכה
        >
          הוסף
        </button>
      </div>

      {loading ? <div>טוען…</div> : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm bg-white">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-2 text-right">שם</th>
                <th className="p-2 text-left w-40">פעולות</th>
              </tr>
            </thead>
            <tbody>
              {list.map(c => (
                <tr key={c.id} className="border-t">
                  {editingItem?.id === c.id ? (
                    // --- מצב עריכה ---
                    <>
                      <td className="p-2">
                        <input
                          className="border rounded p-1 w-full"
                          value={editingName}
                          onChange={e => setEditingName(e.target.value)}
                          autoFocus
                        />
                      </td>
                      <td className="p-2 text-left">
                        <button className="text-green-600 font-semibold px-2 py-1" onClick={update}>שמור</button>
                        <button className="text-gray-500 px-2 py-1" onClick={cancelEditing}>בטל</button>
                      </td>
                    </>
                  ) : (
                    // --- מצב תצוגה רגיל ---
                    <>
                      <td className="p-2">{c.name}</td>
                      <td className="p-2 text-left">
                        <button className="text-blue-600 font-semibold px-2 py-1" onClick={() => startEditing(c)}>ערוך</button>
                        <button className="text-red-600 font-semibold px-2 py-1" onClick={() => remove(c.id)}>מחק</button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
              {list.length === 0 && !loading && (
                <tr><td className="p-2 text-center text-gray-500" colSpan={2}>לא נמצאו קטגוריות</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}