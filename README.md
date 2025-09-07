# Storysite Vite (React + TS + Supabase)

דשבורד דינאמי ואתר SPA מבוסס Vite + React Router + Tailwind.

## התקנה מקומית
1. התקן תלויות:
   ```bash
   npm install
   ```
2. צור `.env` בקור/root של הפרויקט עם:
   ```ini
   VITE_SUPABASE_URL=YOUR_SUPABASE_URL
   VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
   ```
3. הרץ פיתוח:
   ```bash
   npm run dev
   ```

## Supabase
1. צור פרויקט חדש ב-Supabase.2. ב-SQL Editor הרץ את `supabase/schema.sql` (טבלאות + RLS).3. ב-Auth הפעל שיטת התחברות. התחבר עם המשתמש שלך ואז ב-Table Editor -> `profiles` תן לעצמך `role='admin'`.4. (אופציונלי) Storage לבאקט תמונות/MP3.5. העתק את Project URL ואת anon key ל-`.env` כמשתני `VITE_*` (Vite חושף אותם בזמן build).

## פריסה (Netlify / Vercel / Static)
- Vite מפיק SPA. הקפד להגדיר **Redirect ל-`index.html`** (SPA fallback) כדי שראוטים יעבדו ברענון:
  - **Netlify**: צור `_redirects` עם:
    ```
    /*    /index.html   200
    ```
  - **Vercel**: בפרויקט הגדרות → Redirect: `Source: /(.*)` → `Destination: /index.html` → Status 200 (Serve). או פריסה כ-SSR באמצעות Adapter/Edge (לא חובה).
## רנדומלי/בטיחות
- פעולות כתיבה בדפדפן משתמשות ב-anon key; RLS מגן על הנתונים.- לפעולות אדמיניסטרטיביות כבדות מומלץ API פרטי עם Service Role (לא בדפדפן).
