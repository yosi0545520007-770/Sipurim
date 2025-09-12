export default function About() {
  return (
    <section className="max-w-3xl mx-auto px-4 py-12" dir="rtl">
      <h1 className="text-3xl font-bold mb-8">אודות</h1>

      <div className="space-y-4 text-gray-800 leading-relaxed text-right">
        <p>
          האנשים מאחורי האתר: הרב ירון דותן, חסיד חב"ד ואיש חינוך למעלה מ-40 שנה.
          ר' יוסי לוי, חסיד חב"ד ובעל חברה לבניית אתרי אינטרנט.
        </p>

        <h2 className="text-xl font-semibold mt-6">הסיפור של הסיפורים</h2>
        <p>
          הכל התחיל בתקופת הקורונה בה כולם היו בבתים והיה צורך גדול לתעסוקה לילדים:
          הרב ירון ליקט סיפורים יהודים וחסידיים – אותם הפיץ באמצעות הווצאפ.
        </p>
        <p>
          עבר זמן וב"ה הקורונה נעלמה מחיינו, אך האוצר של הסיפור נשאר!
        </p>
        <p>
          בשלב זה, ר' יוסי נחשף לאוצר הסיפורים והחליט להפוך אותו לאוצר דיגיטלי ונגיש – כך נוצר האתר הזה!
        </p>
      </div>

      <div className="mt-8 text-right">
        <a
          href="/stories"
          className="inline-block bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          כל הסיפורים
        </a>
      </div>
    </section>
  )
}
