# FastSync — הוצאות משותפות לבני זוג

אפליקציית מובייל קלה לניהול חשבון בנק משותף: הזנת הוצאה בכמה שניות, הוראות קבע שנכנסות לבד ב-1 לחודש, ודשבורד של הכנסות מול הוצאות.

**אין שרת ייעודי.** האתר רץ ב-Netlify. הזיכרון הפיננסי (כולל השוואה בין חודשים) יושב ב-Supabase PostgreSQL.

## מה בונים כאן

| שכבה | שירות | תפקיד |
|------|--------|--------|
| קוד | GitHub | מקור האמת |
| אתר + PWA | Netlify | אירוח סטטי ופריסה מכל push |
| נתונים, התחברות, Realtime | Supabase | שניכם רואים את אותו הבית |
| Render / Vercel | לא בשימוש ב-MVP | לא צריך שרת שרץ 24/7 |

Vercel ו-Netlify עושים את אותו הדבר לאתר סטטי. ה-PRD בחר **Netlify** — נשארים איתו.

## הקמה חד-פעמית (בערך 20 דקות)

### 1) Supabase

1. צרו פרויקט ב-[supabase.com](https://supabase.com).
2. Authentication → Providers → Email: כבו Confirm email (אפליקציה פרטית לזוג, בלי אימות מייל).
3. SQL Editor: הדביקו והריצו את כל הקובץ `supabase/schema.sql`.
4. Settings → API: העתיקו את Project URL ואת `anon` `public` key.

### 2) הרצה מקומית

```bash
copy .env.example .env
```

מלאו ב-`.env`:

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

```bash
npm install
npm run dev
```

פתחו את הכתובת בטלפון (אותה רשת Wi-Fi) או ב-Chrome עם מצב מובייל.

### 3) GitHub + Netlify

```bash
git init
git add .
git commit -m "Initial FastSync app"
```

צרו repo ב-GitHub והעלו. ב-Netlify:

1. Add new site → Import from GitHub
2. Build command: `npm run build`
3. Publish directory: `dist`
4. Environment variables (Production):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

אחרי ה-deploy: בטלפון פתחו את האתר → Share → Add to Home Screen. זה ה-PWA.

### 4) כניסה של שני בני הזוג

1. אחד נרשם, יוצר בית, ממלא משכורות והוראות קבע.
2. מעתיקים את קוד ההזמנה ממסך **בית**.
3. השני נרשם ובוחר «הצטרפות עם קוד».

מכאן הכל מסונכרן בזמן אמת.

## איך עובדת האוטומציה של ה-1 לחודש

אין צורך ב-Render cron. פונקציית SQL בשם `ensure_recurring_for_current_month` רצה בכל פתיחה של האפליקציה. אם חודש חדש התחיל — הוראות הקבע והמשכורות נכנסות פעם אחת (עם מניעת כפילות).

אם תרצו כניסה גם בלי שמישהו יפתח את האפליקציה, אפשר ב-Supabase להוסיף scheduled function שקוראת לאותה RPC. זה מותרות, לא חובה ל-MVP.

## שימור ידע

בדשבורד («מצב») אפשר לדפדף בין חודשים. לכל קטגוריה מוצג הסכום מול החודש הקודם וההפרש באחוזים. הנתונים לא נשמרים בדפדפן — הם ב-PostgreSQL, ולכן שורדים החלפת טלפון.

## קטגוריות

מזון וסופר · תחבורה · פנאי · חשבונות · שונות

אין שדה «מי שילם» — הכל יוצא מהחשבון המשותף.
