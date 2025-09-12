export default function AdminHome() {
  return (
    <section className="p-6 max-w-3xl mx-auto" dir="rtl">
      <h1 className="text-2xl font-bold mb-6">ניהול האתר</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <a
          href="/admin/stories"
          className="border rounded-xl p-4 bg-white hover:shadow"
        >
          <div className="text-lg font-semibold mb-1">ניהול סיפורים</div>
          <p className="text-sm text-gray-600">
            יצירה, עריכה, העלאת תמונה ו־MP3, ניהול גרסאות.
          </p>
        </a>

        <a
          href="/admin/categories"
          className="border rounded-xl p-4 bg-white hover:shadow"
        >
          <div className="text-lg font-semibold mb-1">ניהול קטגוריות</div>
          <p className="text-sm text-gray-600">
            הוספה, מחיקה ושיוך קטגוריות לסיפורים.
          </p>
        </a>

        <a
          href="/admin/series"
          className="border rounded-xl p-4 bg-white hover:shadow"
        >
          <div className="text-lg font-semibold mb-1">ניהול סדרות</div>
          <p className="text-sm text-gray-600">
            יצירה ועריכה של סדרות סיפורים.
          </p>
        </a>
      </div>

      <p className="text-xs text-gray-500 mt-6">
        *הגישה לניהול תוגבל בהמשך עם מנגנון התחברות ואבטחה.
      </p>
    </section>
  )
}
