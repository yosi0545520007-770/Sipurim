const HIGHLIGHTS = [
  {
    title: 'כל יום סיפור חדש!',
    description:
      'כל יום בשעה קבועה, בדיוק כשמשכיבים את הילדים לישון - תקבלו הודעה על סיפור חדש המותאם ללוח השנה. לא צריך לעשות כלום - רק להמתין בסבלנות!',
  },
  {
    title: 'סיפורים יהודיים וחסידיים',
    description:
      'סיפורי צדיקים, סיפורים חסידיים וסיפורי מורשת ויהדות שמחזקים את הקשר למסורת ומסתיימים בקריאת שמע שעל המיטה.',
  },
  {
    title: 'קול נעים ומרגיע',
    description:
      'הרב ירון דותן מקריא את הסיפורים בקולו הנעים והמרגיע, כדי שהילדים ירדמו בחיוך ובתחושת רוגע.',
  },
]

const TEAM = [
  {
    name: 'הרב ירון דותן',
    description: 'חסיד חב"ד ואיש חינוך למעלה מ-40 שנה.',
  },
  {
    name: "ר' יוסי לוי",
    description: 'חסיד חב"ד ובעל חברה לבניית אתרי אינטרנט.',
  },
]

const STORY_SUMMARY = `הסיפור של הסיפורים:
הכל התחיל בתקופת הקורונה, כאשר כולנו נשארנו בבית והיה צורך גדול בתעסוקה איכותית לילדים. הרב ירון ליקט סיפורים יהודיים וחסידיים והפיץ אותם באמצעות הווצאפ.
עם הזמן הקורונה חלפה, אבל אוצר הסיפורים נשאר! בשלב זה ר' יוסי נחשף לסיפורים והחליט להפוך אותם לאוצר דיגיטלי ונגיש - וכך נולד האתר.`

const FAQ = [
  {
    question: 'האם ניתן לגלוש עם רימון?',
    answer: 'האתר חדש ולכן ייתכן שיחסם בתחילה. פשוט פונים לשירות הלקוחות של "רימון" ומבקשים לפתוח - לאחר מכן הגישה תהיה חופשית.',
  },
  {
    question: 'האם צריך להירשם כדי לקבל הודעה על הסיפור היומי?',
    answer: 'לא. מאשרים קבלת התראות מהאתר בלחיצה על הפעמון הקטן שמופיע בתחתית המסך וזה הכול.',
  },
  {
    question: 'האם האתר בתשלום?',
    answer: 'לא! האתר בחינם, ואפשר להאזין לכל הסיפורים ללא הגבלה.',
  },
  {
    question: 'האם ניתן להקדיש סיפור?',
    answer: 'כן. ניתן להקדיש סיפור להצלחה או לכל מטרה אחרת דרך יצירת קשר עם הצוות.',
  },
  {
    question: 'האם יעלו סיפורי המשך?',
    answer: 'בהחלט. האתר מתעדכן מעת לעת עם סיפורים חדשים.',
  },
  {
    question: 'האם צריך להירשם לאתר?',
    answer: 'לא. כדי לקבל סיפור יומי לנייד פשוט לוחצים על הפעמון האדום בתחתית המסך ומאפשרים התראות.',
  },
  {
    question: 'האם אפשר לחפש סיפורים באתר?',
    answer: 'כן. משתמשים בשורת החיפוש באתר ומוצאים את הסיפור שרוצים בלחיצת כפתור.',
  },
]

export function Component() {
  return (
    <section dir="rtl" className="bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">
        <header className="text-center space-y-6">
          <p className="text-sm font-semibold text-blue-600">סיפורים יהודיים לילדים</p>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">
            לפני השינה, בנסיעה ארוכה - בכל מקום שלא תהיו, הסיפורים אתכם
          </h1>
          <p className="text-lg text-gray-700 max-w-3xl mx-auto">
            השירות מאפשר להשמיע סיפורים יהודיים לילדים בצורה קלה ונוחה - בבית, בדרך או בכל זמן אחר שמתאים לכם.
          </p>
          <div className="flex items-center justify-center gap-3">
            <a
              href="/stories"
              className="inline-flex items-center justify-center rounded-full bg-blue-600 px-6 py-2 text-white text-sm font-medium shadow hover:bg-blue-700 transition"
            >
              לכל הסיפורים
            </a>
            <a
              href="/contact"
              className="inline-flex items-center justify-center rounded-full border border-blue-200 px-6 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 transition"
            >
              צור קשר
            </a>
          </div>
        </header>

        <section className="grid gap-6 md:grid-cols-3">
          {HIGHLIGHTS.map((item) => (
            <article key={item.title} className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
              <h2 className="text-xl font-semibold text-gray-900 mb-3">{item.title}</h2>
              <p className="text-gray-700 leading-relaxed">{item.description}</p>
            </article>
          ))}
        </section>

        <section className="rounded-3xl bg-white shadow-sm border border-gray-100 p-8 space-y-6">
          <h2 className="text-2xl font-bold text-gray-900">האנשים מאחורי האתר</h2>
          <div className="grid gap-6 md:grid-cols-2">
            {TEAM.map((member) => (
              <div key={member.name} className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900">{member.name}</h3>
                <p className="text-gray-700 mt-2">{member.description}</p>
              </div>
            ))}
          </div>
          <p className="text-gray-700 leading-relaxed whitespace-pre-line">{STORY_SUMMARY}</p>
        </section>

        <section className="rounded-3xl bg-blue-50 border border-blue-100 p-8 text-center space-y-4">
          <h2 className="text-2xl font-bold text-blue-800">נתקלים בקשיים בגלישה באתר?</h2>
          <p className="text-blue-900 max-w-3xl mx-auto">
            האתר חדש ולכן ייתכן שחלק מספקיות הסינון, כמו "רימון", יחסמו אותו בהתחלה. פנו לשירות הלקוחות שלהם ובקשו לפתוח את האתר - זו פעולה קצרה שמבטיחה גישה מלאה לכל התכנים.
          </p>
          <a
            href="/contact"
            className="inline-flex items-center justify-center rounded-full bg-blue-600 px-6 py-2 text-white text-sm font-medium shadow hover:bg-blue-700 transition"
          >
            צריכים עזרה? דברו איתנו
          </a>
        </section>

        <section className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-900 text-center">שאלות נפוצות</h2>
          <div className="space-y-3 max-w-4xl mx-auto">
            {FAQ.map((item) => (
              <details key={item.question} className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <summary className="flex cursor-pointer items-center justify-between text-right text-lg font-semibold text-gray-900">
                  <span>{item.question}</span>
                  <span className="text-blue-500 group-open:rotate-90 transition-transform">›</span>
                </summary>
                <p className="mt-3 text-gray-700 leading-relaxed">{item.answer}</p>
              </details>
            ))}
          </div>
        </section>
      </div>
    </section>
  )
}


