const TEAM = [
  {
    name: 'הרב ירון דותן',
    role: 'איש חינוך ויוצר התוכן',
    description: 'חסיד חב"ד ואיש חינוך למעלה מ-40 שנה, הרב ירון הוא הקול והלב שמאחורי הסיפורים.',
  },
  {
    name: "ר' יוסי לוי",
    role: 'מפתח ומוביל טכנולוגי',
    description: 'חסיד חב"ד ובעל חברה לבניית אתרי אינטרנט, שהפך את אוצר הסיפורים לנכס דיגיטלי נגיש.',
  },
]

export function Component() {
  return (
    <section className="bg-gray-50" dir="rtl">
      <div className="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">הסיפור של הסיפורים</h1>
          <p className="mt-4 text-gray-700">
            הכל התחיל בתקופת הקורונה, כשהיה צורך גדול בתעסוקה איכותית לילדים. הרב ירון ליקט סיפורים יהודיים וחסידיים והפיץ אותם בווטסאפ. עם הזמן, ר' יוסי נחשף לאוצר והחליט להפוך אותו לאתר דיגיטלי ונגיש לכולם.
          </p>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-8">האנשים שמאחורי האתר</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {TEAM.map((member) => (
              <div key={member.name} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center">
                <h3 className="text-xl font-semibold text-gray-900">{member.name}</h3>
                <p className="text-sm text-blue-600 font-medium">{member.role}</p>
                <p className="mt-2 text-gray-700">{member.description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="text-center">
          <a href="/stories" className="inline-flex items-center justify-center rounded-full bg-blue-600 px-6 py-2 text-white text-sm font-medium shadow hover:bg-blue-700 transition">
            להאזנה לכל הסיפורים
          </a>
        </div>
      </div>
    </section>
  )
}
