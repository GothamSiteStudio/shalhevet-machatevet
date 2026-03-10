const RECIPE_PROMPT_SUFFIX =
  'Styled for a premium Hebrew fitness recipe app, clean ceramic plating, natural daylight, close 3/4 angle, sharp appetizing texture, warm neutral background, no people, no text, high detail.';

function buildImagePrompt(description) {
  return `${description}. ${RECIPE_PROMPT_SUFFIX}`;
}

function formatRecipeNotes(recipe) {
  return [
    `קלוריות משוערות: כ-${recipe.caloriesPerServing} קל׳ ל-${recipe.portion}.`,
    `כמות במתכון: ${recipe.servings} מנות.`,
    'הנתונים חושבו כהערכה מקצועית מתוך קובץ OCR של ספר המתכונים.',
    '',
    'מצרכים:',
    ...recipe.ingredients.map(ingredient => `- ${ingredient}`),
    '',
    'אופן הכנה:',
    ...recipe.instructions.map((step, index) => `${index + 1}. ${step}`),
  ].join('\n');
}

function fallbackMakeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createNutritionMealFromRecipe(recipe, makeId = fallbackMakeId) {
  return {
    id: makeId('meal'),
    name: recipe.title,
    time: '',
    notes: formatRecipeNotes(recipe),
    items: [
      {
        id: makeId('meal-item'),
        name: recipe.title,
        amount: recipe.portion,
        imageUrl: '',
        calories: String(recipe.caloriesPerServing),
        protein: '',
        carbs: '',
        fat: '',
        notes: `כ-${recipe.servings} מנות במתכון.`,
      },
    ],
  };
}

export const RECIPE_CATALOG = [
  {
    id: 'tuna-bread',
    title: 'לחם טונה',
    category: 'ארוחת בוקר',
    servings: 4,
    portion: '2 פרוסות',
    caloriesPerServing: 80,
    summary: 'לחם חלבוני מהיר מטונה, ביצים ושום גבישי עם ציפוי שומשום או קצח.',
    ingredients: [
      'קופסת טונה מסוננת',
      '2 ביצים',
      'כפית אבקת אפייה',
      'קורט מלח',
      'כפית שום גבישי',
      'שומשום או קצח לציפוי',
    ],
    instructions: [
      'טוחנים את כל המרכיבים מלבד הציפוי לתערובת אחידה.',
      'מעבירים לתבנית, מפזרים שומשום או קצח.',
      'אופים עד הזהבה ומצננים לפני חיתוך.',
    ],
    imagePrompt: buildImagePrompt(
      'Healthy tuna bread loaf sliced on a wooden board, golden sesame crust, airy center, high protein breakfast styling'
    ),
  },
  {
    id: 'protein-pancakes',
    title: 'פנקייק חלבון',
    category: 'ארוחת בוקר',
    servings: 2,
    portion: '2-3 פנקייקים',
    caloriesPerServing: 190,
    summary: 'פנקייק חלבון משני מרכיבים בלבד עם מרקם רך במיוחד.',
    ingredients: ['2 סקופים אבקת חלבון', '2 ביצים', 'דבש, מייפל או חמאת בוטנים להגשה'],
    instructions: [
      'מערבבים את אבקת החלבון והביצים בטרפה לבלילה חלקה.',
      'יוצקים למחבת משומנת על חום בינוני והופכים אחרי חצי דקה.',
      'מגישים עם תוספת מתוקה לפי הטעם.',
    ],
    imagePrompt: buildImagePrompt(
      'Fluffy protein pancakes stacked high with a light peanut butter drizzle and glossy maple finish'
    ),
  },
  {
    id: 'cottage-crackers',
    title: 'קרקר קוטג׳',
    category: 'נשנוש וביניים',
    servings: 4,
    portion: '4 קרקרים',
    caloriesPerServing: 55,
    summary: 'קרקרים פריכים מאפויים מקוטג׳ ותבלין בייגל.',
    ingredients: ['קוטג׳ 5%', 'תבלין בייגל', 'קורט מלח'],
    instructions: [
      'מניחים כפות קוטג׳ על נייר אפייה ומשטחים מעט.',
      'מפזרים תבלין בייגל ומלח.',
      'אופים בחום גבוה עד לצבע זהוב ופריך.',
    ],
    imagePrompt: buildImagePrompt(
      'Crispy baked cottage cheese crackers with everything seasoning, arranged in a neat snack stack'
    ),
  },
  {
    id: 'tuna-shakshuka',
    title: 'שקשוקה טונה',
    category: 'ארוחת בוקר',
    servings: 2,
    portion: 'מחבת אישית',
    caloriesPerServing: 285,
    summary: 'שקשוקה עשירה בחלבון עם טונה, ביצים ורוטב עגבניות מתובל.',
    ingredients: [
      '2 ביצים',
      '2 קופסאות טונה',
      'חצי בצל קצוץ',
      '3 שיני שום',
      'מחית או רוטב עגבניות',
      'כף שמן זית',
      'פפריקה, מלח ופלפל',
    ],
    instructions: [
      'מטגנים בצל ושום עד לריכוך, מוסיפים טונה ומערבבים.',
      'מוסיפים עגבניות, מים ותבלינים ומבשלים לרוטב אחיד.',
      'שוברים ביצים, מכסים ומבשלים עד למידת העשייה הרצויה.',
    ],
    imagePrompt: buildImagePrompt(
      'Protein-rich tuna shakshuka in a rustic skillet, soft eggs in bright tomato sauce with fresh herbs'
    ),
  },
  {
    id: 'rice-paper-jachnun',
    title: 'ג׳חנון מדפי אורז',
    category: 'ארוחת בוקר',
    servings: 1,
    portion: 'יחידה אחת',
    caloriesPerServing: 320,
    summary: 'גרסת ג׳חנון קלילה מדפי אורז עם בלילה של ביצים וסילאן.',
    ingredients: ['4 דפי אורז', '2 ביצים', 'כף סילאן', 'כוס מים פושרים', 'קורט מלח'],
    instructions: [
      'מערבבים את חומרי הבלילה.',
      'משרים כל דף אורז, מניחים בערימה ומגלגלים כמו ג׳חנון.',
      'אופים בטורבו עד השחמה יפה וקריספית.',
    ],
    imagePrompt: buildImagePrompt(
      'Crispy rice paper jachnun roll, deeply golden and glossy, cut open to show layered texture'
    ),
  },
  {
    id: 'low-cal-burekas',
    title: 'בורקס דל קלוריות',
    category: 'עיקריות',
    servings: 8,
    portion: 'בורקס אחד',
    caloriesPerServing: 150,
    summary: 'בורקס גבינות אפוי מדפי פילו עם מלית עשירה ועדינה.',
    ingredients: [
      '7-8 דפי פילו',
      'גבינה בולגרית 5%',
      '2 כפות קוטג׳',
      '100 גרם גבינה צהובה 9%',
      'מלח ופלפל',
      'תרסיס שמן או חמאה מומסת',
    ],
    instructions: [
      'מערבבים את כל חומרי המלית.',
      'ממלאים דפי פילו, סוגרים ומברישים בביצה.',
      'מפזרים שומשום ואופים עד הזהבה.',
    ],
    imagePrompt: buildImagePrompt(
      'Low calorie cheese burekas made from filo pastry, flaky golden triangles with sesame on top'
    ),
  },
  {
    id: 'khachapuri-pita',
    title: 'חצ׳פורי',
    category: 'עיקריות',
    servings: 2,
    portion: 'פיתה אחת',
    caloriesPerServing: 530,
    summary: 'פיתת כוסמין אפויה במילוי גבינות וחלמון בסגנון חצ׳פורי.',
    ingredients: [
      '3/4 חבילת קוטג׳',
      'חצי חבילת גבינה בולגרית 5%',
      '50 גרם מוצרלה או גבינה מגורדת',
      '2 פיתות כוסמין מלא',
      'חלמון לכל פיתה',
    ],
    instructions: [
      'מערבבים את הגבינות למלית אחידה.',
      'ממלאים את הפיתות ומשטחים את המלית בפנים.',
      'אופים, מוסיפים חלמון ומחזירים להשחמה קצרה.',
    ],
    imagePrompt: buildImagePrompt(
      'Healthy khachapuri style whole wheat pita with molten cheese center and glossy egg yolk'
    ),
  },
  {
    id: 'protein-bagel',
    title: 'בייגל חלבון',
    category: 'ארוחת בוקר',
    servings: 4,
    portion: 'בייגל אחד',
    caloriesPerServing: 150,
    summary: 'בייגל ביתי רך מבחוץ ועסיסי מבפנים עם שומשום וקצח.',
    ingredients: ['כוס קמח תופח', 'חבילת גבינת שמנת ארלה', 'רבע כפית מלח', 'שומשום או קצח'],
    instructions: [
      'מערבבים את המצרכים עד בצק אחיד ומניחים למנוחה קצרה.',
      'מחלקים לארבעה חלקים ויוצרים בייגלים.',
      'מברישים בביצה, מפזרים ציפוי ואופים.',
    ],
    imagePrompt: buildImagePrompt(
      'Fresh protein bagels with sesame and nigella seeds, shiny crust, bakery-style presentation'
    ),
  },
  {
    id: 'rice-paper-sambusak',
    title: 'סמבוסק דפי אורז',
    category: 'עיקריות',
    servings: 6,
    portion: 'סמבוסק אחד',
    caloriesPerServing: 200,
    summary: 'סמבוסקים קריספיים במיוחד מדפי אורז ומלית גבינות.',
    ingredients: [
      'ביצה, חצי כוס מים וחצי כף סילאן לבלילה',
      'חצי חבילה קוטג׳',
      '250 גרם בולגרית 5%',
      'כף קורנפלור',
      'ביצה',
      'מלח',
      '3 דפי אורז לכל יחידה',
    ],
    instructions: [
      'מערבבים את חומרי המלית לתערובת אחידה.',
      'טובלים דפי אורז, מניחים שלוש שכבות ומקפלים סביב המלית.',
      'מפזרים שומשום ואופים עד קריספיות עמוקה.',
    ],
    imagePrompt: buildImagePrompt(
      'Ultra crispy rice paper sambusak filled with cheese, golden blistered exterior and sesame topping'
    ),
  },
  {
    id: 'asado-dumplings',
    title: 'דאמפלינגס מדפי אורז במילוי אסאדו',
    category: 'עיקריות',
    servings: 8,
    portion: '5 דמפלינגס',
    caloriesPerServing: 250,
    summary: 'דים סאם ביתי עם מילוי אסאדו מפורק וצריבה קריספית בתחתית.',
    ingredients: [
      '20 דפי אורז חתוכים לרבעים',
      'חצי קילו אסאדו',
      'גזר',
      'תפוח אדמה',
      'חצי בצל',
      'רוטב ברביקיו',
      'מלח ופלפל אנגלי',
      'שמן זית לצריבה',
    ],
    instructions: [
      'אופים את האסאדו והירקות עם הרוטב והתבלינים עד לריכוך מלא ומפרקים.',
      'מרכיבים דמפלינגס משתי שכבות רבעי דף אורז ומעט מילוי.',
      'צורבים במחבת לקבלת תחתית קריספית.',
    ],
    imagePrompt: buildImagePrompt(
      'Rice paper dumplings filled with shredded asado, pan seared crispy bottoms and juicy meat center'
    ),
  },
  {
    id: 'cottage-polenta',
    title: 'פולנטה קוטג׳',
    category: 'ארוחת בוקר',
    servings: 2,
    portion: 'קערה אחת',
    caloriesPerServing: 230,
    summary: 'פולנטה מהירה וקלה מקוטג׳ ותירס במרקם קרמי.',
    ingredients: ['קופסת קוטג׳', 'קופסת תירס מסונן', '10 גרם חמאה', 'מלח ופלפל שחור'],
    instructions: [
      'טוחנים קוטג׳ ותירס למחית חלקה.',
      'מחממים חמאה במחבת ומוסיפים את המחית והתבלינים.',
      'מבשלים קצרות עד חימום ומרקם קרמי.',
    ],
    imagePrompt: buildImagePrompt(
      'Creamy cottage cheese polenta with corn, silky texture in a shallow bowl, topped with black pepper'
    ),
  },
  {
    id: 'cabbage-bolognese',
    title: 'כרוב בולונז',
    category: 'עיקריות',
    servings: 4,
    portion: 'קערה אחת',
    caloriesPerServing: 300,
    summary: 'תבשיל בשר וכרוב ברוטב עגבניות סמיך ומתובל.',
    ingredients: [
      'חצי קילו בשר טחון',
      'חצי כרוב חתוך לרצועות',
      'חצי בצל קצוץ',
      'עגבניות מרוסקות',
      '2 כפות רסק',
      '2 כפות שמן זית',
      'פפריקה, כמון, מלח',
    ],
    instructions: [
      'מטגנים בצל, מוסיפים בשר ומפוררים עד עשייה מלאה.',
      'מוסיפים תבלינים, רסק ועגבניות ומביאים לרתיחה.',
      'מוסיפים כרוב ומבשלים מכוסה עד ריכוך.',
    ],
    imagePrompt: buildImagePrompt(
      'Hearty cabbage bolognese bowl with rich minced meat tomato sauce and tender cabbage ribbons'
    ),
  },
  {
    id: 'rice-paper-meat-buns',
    title: 'לחמניות דפי אורז במילוי בשר',
    category: 'עיקריות',
    servings: 8,
    portion: 'לחמניה אחת',
    caloriesPerServing: 190,
    summary: 'לחמניות אפויות מדפי אורז במילוי בשר מתובל ופטרוזיליה.',
    ingredients: [
      '16 דפי אורז',
      'ביצה',
      'כף סילאן',
      'חצי כוס מים',
      'חצי קילו בשר טחון',
      'בצל',
      'ראס אל חנות',
      'כמון',
      'פטרוזיליה',
      '2 כפות שמן זית',
    ],
    instructions: [
      'מטגנים בשר עם בצל, שמן ותבלינים ומצננים מעט.',
      'טובלים זוג דפי אורז בבלילה ומעצבים סביב המלית.',
      'אופים עד שהמעטפת זהובה וקריספית.',
    ],
    imagePrompt: buildImagePrompt(
      'Baked rice paper buns stuffed with spiced minced meat, crisp shell and savory filling visible inside'
    ),
  },
  {
    id: 'shredded-chicken-burrito',
    title: 'בוריטו',
    category: 'עיקריות',
    servings: 2,
    portion: 'בוריטו אחד',
    caloriesPerServing: 520,
    summary: 'בוריטו עשיר ממילוי חזה עוף מפורק ברוטב ברביקיו.',
    ingredients: [
      '600 גרם חזה עוף',
      'בצל',
      '3 כפות ברביקיו',
      'חצי כוס מים',
      'תבלין גריל',
      'כף שמן זית',
      'טורטיה וירקות להגשה',
    ],
    instructions: [
      'מטגנים בצל וחזה עוף ומוסיפים רוטב, מים ותבלינים.',
      'מפרקים את העוף לחתיכות דקות תוך בישול עד לצמצום הנוזלים.',
      'ממלאים טורטיה עם ירקות וסוגרים היטב.',
    ],
    imagePrompt: buildImagePrompt(
      'Healthy chicken burrito cut in half, filled with shredded barbecue chicken, lettuce and fresh vegetables'
    ),
  },
  {
    id: 'doner-chicken-shawarma',
    title: 'שווארמה דונר חזה עוף',
    category: 'עיקריות',
    servings: 4,
    portion: 'מנה אחת',
    caloriesPerServing: 140,
    summary: 'שווארמה ביתית מאפויה משכבת חזה עוף טחון ותבלין שווארמה.',
    ingredients: [
      'חצי קילו חזה עוף טחון',
      'כף גדושה תבלין שווארמה',
      'שמן זית, בצל קצוץ ומלח לפי הטעם',
    ],
    instructions: [
      'מערבבים את כל המצרכים ומשטחים שכבה דקה בין ניירות אפייה.',
      'מגלגלים עם הנייר התחתון ואופים עד יציבות.',
      'פותחים, קורעים לרצועות ומגישים.',
    ],
    imagePrompt: buildImagePrompt(
      'Homemade chicken doner shawarma strips, deeply seasoned and juicy, served in a clean modern bowl'
    ),
  },
  {
    id: 'sweet-potato-burger',
    title: 'בטטה בורגר',
    category: 'עיקריות',
    servings: 2,
    portion: 'בורגר אחד',
    caloriesPerServing: 370,
    summary: 'המבורגר מחמניית בטטה אפויה, קציצת בקר וחסה.',
    ingredients: [
      'בטטה מגורדת',
      '2 ביצים',
      '1.5 כפות קמח קוקוס',
      '200 גרם בשר טחון',
      'חסה ועגבנייה',
      'מלח ופלפל',
    ],
    instructions: [
      'מערבבים בטטה, ביצים וקמח קוקוס ויוצרים לחמניות אפויות.',
      'מתבלים את הבשר, יוצרים קציצה ומטגנים.',
      'מרכיבים את הבורגר עם ירקות.',
    ],
    imagePrompt: buildImagePrompt(
      'Sweet potato burger with orange baked bun, juicy beef patty, lettuce and tomato, modern fitness food styling'
    ),
  },
  {
    id: 'rice-noodle-kugel',
    title: 'קיגל אטריות אורז',
    category: 'מתוקים',
    servings: 12,
    portion: 'פרוסה אחת',
    caloriesPerServing: 280,
    summary: 'קיגל מתוק ועשיר מאטריות אורז וקרמל עדין.',
    ingredients: ['400 גרם אטריות אורז', 'חצי כוס שמן', 'כוס סוכר', '3 ביצים', 'קינמון ומלח'],
    instructions: [
      'מבשלים את אטריות האורז עד ריכוך קל וגוזרים אם רוצים.',
      'מכינים קרמל עדין משמן, סוכר, מלח וקינמון ומערבבים עם האטריות והביצים.',
      'אופים בתבנית עד השחמה יפה.',
    ],
    imagePrompt: buildImagePrompt(
      'Golden rice noodle kugel slice with caramelized top and soft layered interior, dessert style plating'
    ),
  },
  {
    id: 'sushi-cubes',
    title: 'קוביות סושי',
    category: 'עיקריות',
    servings: 3,
    portion: '5 קוביות',
    caloriesPerServing: 130,
    summary: 'קוביות סושי מסודרות בשכבות של סלמון, אורז, מלפפון ואצה.',
    ingredients: [
      '150 גרם אורז לסושי מבושל',
      'חומץ אורז',
      'מלח וסוכרלוז',
      '100 גרם סלמון מעושן',
      '25 גרם גוואקמולי',
      'מלפפון',
      'אצת נורי',
    ],
    instructions: [
      'מתבלים את האורז בחומץ האורז, המלח והסוכרלוז.',
      'מרפדים תבנית ומרכיבים שכבות של סלמון, גוואקמולי, מלפפון, אורז ואצה.',
      'מצננים, הופכים ומגישים.',
    ],
    imagePrompt: buildImagePrompt(
      'Neat sushi cubes with smoked salmon, avocado spread, cucumber and nori, arranged in a geometric grid'
    ),
  },
  {
    id: 'layered-tortilla-skewers',
    title: 'שיפודי שכבות בשר טורטיה',
    category: 'עיקריות',
    servings: 6,
    portion: 'שיפוד אחד',
    caloriesPerServing: 300,
    summary: 'שיפודים שכבתיים מטורטיה ובשר טחון שמתאימים לגריל או לתנור.',
    ingredients: [
      '6 טורטיות',
      'חצי קילו בשר טחון',
      'בצל קצוץ',
      'פטרוזיליה',
      'מלח, פלפל שחור ופלפל אנגלי',
    ],
    instructions: [
      'מערבבים את הבשר עם הירק והתבלינים.',
      'מורחים שכבה דקה על טורטיות, מניחים בערימה ופורסים לרצועות עבות.',
      'משפדים וצורבים עד השחמה.',
    ],
    imagePrompt: buildImagePrompt(
      'Layered tortilla meat skewers grilled until golden, stacked on a platter with tahini and salad nearby'
    ),
  },
  {
    id: 'baked-chicken-patties',
    title: 'קציצות עוף אפויות',
    category: 'עיקריות',
    servings: 4,
    portion: '3 קציצות',
    caloriesPerServing: 190,
    summary: 'קציצות חזה עוף אפויות עם גזר, פטרוזיליה ושום.',
    ingredients: [
      'חצי קילו חזה עוף',
      '2 ביצים',
      'כף קורנפלור',
      'חופן פטרוזיליה',
      'גזר',
      'רבע בצל',
      '2 שיני שום',
      'תבלין גריל ומלח',
    ],
    instructions: [
      'טוחנים את כל המרכיבים במעבד מזון לתערובת אחידה.',
      'יוצרים קציצות ומסדרים על תבנית משומנת קלות.',
      'אופים עד השחמה והופכים באמצע.',
    ],
    imagePrompt: buildImagePrompt(
      'Baked chicken patties with herbs, lightly golden, arranged beside fresh salad in a meal prep style'
    ),
  },
  {
    id: 'tuna-arayes',
    title: 'עראיס טונה עם פיתה חלבון',
    category: 'עיקריות',
    servings: 4,
    portion: 'חצי פיתה',
    caloriesPerServing: 175,
    summary: 'פיתות חלבון צרובות במילוי טונה, מיונז ורוטב עגבניות.',
    ingredients: [
      '2 קופסאות טונה',
      'כף גדושה מיונז או מיוקל',
      'כף רסק עגבניות או רוטב פיצה',
      'אורגנו, פפריקה, מלח ופלפל',
      '2 פיתות חלבון',
    ],
    instructions: [
      'מערבבים את כל חומרי המלית יחד.',
      'ממלאים חצאי פיתות חלבון בתערובת.',
      'צורבים במחבת משני הצדדים עד להשחמה יפה.',
    ],
    imagePrompt: buildImagePrompt(
      'Protein pita arayes stuffed with tuna filling, charred edges, cut open to reveal the juicy center'
    ),
  },
  {
    id: 'flourless-protein-pie',
    title: 'פשטידת חלבון ללא קמח',
    category: 'נשנוש וביניים',
    servings: 6,
    portion: 'פרוסה אחת',
    caloriesPerServing: 120,
    summary: 'פשטידה מלוחה עם פטה, קוטג׳, ביצים ותרד קצוץ.',
    ingredients: ['150 גרם פטה 5%', 'חצי חבילת קוטג׳ 5%', '3 ביצים', 'חופן תרד', 'מלח ופלפל'],
    instructions: [
      'מערבבים את כל המרכיבים לתערובת אחידה.',
      'מעבירים לתבנית מרופדת בנייר אפייה.',
      'אופים עד יציבות וזהב עדין.',
    ],
    imagePrompt: buildImagePrompt(
      'Flourless protein spinach and cheese pie slice, creamy center, clean savory brunch presentation'
    ),
  },
  {
    id: 'eggplant-chicken-rolls',
    title: 'גלילות חציל בחזה עוף',
    category: 'עיקריות',
    servings: 4,
    portion: '4-5 גלילות',
    caloriesPerServing: 240,
    summary: 'גלילות חציל אפויות במילוי חזה עוף טחון ברוטב אדום עשיר.',
    ingredients: [
      '4 חצילים',
      '400 גרם חזה עוף טחון',
      'קישוא',
      'בצל',
      'שום',
      'פטרוזיליה',
      'ביצה',
      'עגבניות ופלפלים לרוטב האדום',
    ],
    instructions: [
      'פורסים חצילים ואופים עד ריכוך קל.',
      'מערבבים את חזה העוף עם תערובת הירק הטחונה ומגלגלים בתוך החציל.',
      'מסדרים ברוטב האדום ומבשלים או אופים עד עשייה מלאה.',
    ],
    imagePrompt: buildImagePrompt(
      'Baked eggplant rolls stuffed with chicken, sitting in vibrant red pepper tomato sauce, elegant healthy plating'
    ),
  },
  {
    id: 'pad-kapao-low-carb',
    title: 'פאד קפאו ללא פחמימה',
    category: 'עיקריות',
    servings: 1,
    portion: 'צלחת אחת',
    caloriesPerServing: 330,
    summary: 'מוקפץ בסגנון תאילנדי עם טונה, כרוב, עשבי תיבול וביצת עין.',
    ingredients: [
      'גמבה',
      'כוסברה',
      '4 שיני שום',
      'ג׳ינג׳ר',
      'נענע',
      'בצל ירוק',
      'קופסת טונה',
      'רבע כרוב',
      'ביצה',
      'סויה, סילאן ולימון',
    ],
    instructions: [
      'מטגנים שום, ג׳ינג׳ר ובצל סגול, ובמקביל חולטים את הכרוב.',
      'מוסיפים גמבה, סויה, סילאן ומעט ממי הכרוב ומצמצמים.',
      'מוסיפים טונה וכרוב, מסיימים עם עשבי תיבול וביצת עין.',
    ],
    imagePrompt: buildImagePrompt(
      'Low carb pad kapao style tuna stir fry with cabbage, herbs and a glossy fried egg on top'
    ),
  },
  {
    id: 'cabbage-steak',
    title: 'סטייק מכרוב',
    category: 'עיקריות',
    servings: 6,
    portion: 'סטייק כרוב אחד',
    caloriesPerServing: 100,
    summary: 'פרוסות כרוב עבות צלויות עם טחינה גולמית, סילאן ושום.',
    ingredients: [
      'כרוב לבן גדול',
      'חצי כוס טחינה גולמית',
      '3 כפות סילאן',
      '3 כפות שום כתוש',
      'מלח גס',
      'פלפל שחור',
    ],
    instructions: [
      'פורסים את הכרוב לשש פרוסות עבות ומסדרים על תבנית.',
      'מורחים טחינה, סילאן ושום ומתבלים.',
      'אופים בטורבו עד השחמה מושלמת.',
    ],
    imagePrompt: buildImagePrompt(
      'Roasted cabbage steak with tahini glaze and dark caramelized edges, plated like a gourmet main dish'
    ),
  },
  {
    id: 'rice-paper-grissini',
    title: 'גריסיני דפי אורז',
    category: 'נשנוש וביניים',
    servings: 10,
    portion: '3 גריסיני',
    caloriesPerServing: 60,
    summary: 'מקלות נשנוש קריספיים מדפי אורז עם ציפוי מלוח או תבלין בייגל.',
    ingredients: [
      'דפי אורז',
      'ביצה',
      '2 כפות מייפל או כף סילאן',
      '3/4 כוס מים',
      'מלח גס, שומשום או תערובת בייגל',
    ],
    instructions: [
      'מערבבים את חומרי הבלילה ומשרים כל דף אורז כמה שניות.',
      'מגלגלים למקלות ומפזרים ציפוי לפי הטעם.',
      'אופים בחום נמוך יחסית לזמן ארוך עד ייבוש וקריספיות.',
    ],
    imagePrompt: buildImagePrompt(
      'Thin crispy rice paper grissini sticks with sesame and coarse salt, snack jar styling'
    ),
  },
  {
    id: 'protein-granola',
    title: 'גרנולת חלבון',
    category: 'ארוחת בוקר',
    servings: 10,
    portion: 'שליש כוס',
    caloriesPerServing: 240,
    summary: 'גרנולה אפויה עם שיבולת שועל, זרעים, אבקת חלבון ושוקולד.',
    ingredients: [
      '300 גרם שיבולת שועל',
      '50 גרם גרעיני דלעת או חמניה',
      '2 כפות סילאן או דבש',
      '2 כפות שוקולד קצוץ',
      '3 סקופים אבקת חלבון וניל',
      '2 כפות שמן זית',
      'שקדים, חמוציות וקינמון',
    ],
    instructions: [
      'מחממים יחד סילאן, שמן, קינמון ומלח ומערבבים עם כל המרכיבים מלבד השוקולד.',
      'משטחים על תבנית ואופים תוך ערבוב מדי פעם.',
      'מצננים ומערבבים פנימה את השוקולד.',
    ],
    imagePrompt: buildImagePrompt(
      'Crunchy high protein granola with oats, pumpkin seeds, chocolate chunks and cranberries in a glass jar'
    ),
  },
  {
    id: 'gluten-free-bagel-balls',
    title: 'כדורי בייגל ללא גלוטן',
    category: 'נשנוש וביניים',
    servings: 12,
    portion: 'כדור אחד',
    caloriesPerServing: 120,
    summary: 'כדורי בייגל מקמח שקדים ויוגורט חלבון, מצופים בתבלין אבריטינג.',
    ingredients: [
      'גביע יוגורט חלבון בטעם טבעי',
      '2 כוסות קמח שקדים',
      'רבע כוס גבינה צהובה או גאודה',
      'רבע כפית מלח',
      'תבלין אבריטינג',
    ],
    instructions: [
      'מערבבים את כל המצרכים לעיסה אחידה.',
      'מכדררים לכדורים ומצפים בתבלין אבריטינג.',
      'אופים עד הזהבה קלה ומצננים.',
    ],
    imagePrompt: buildImagePrompt(
      'Gluten free bagel balls with everything seasoning, golden exterior and soft cheesy center'
    ),
  },
  {
    id: 'acorn-squash-potatos',
    title: 'פוטטוס דלעת ערמונים',
    category: 'עיקריות',
    servings: 2,
    portion: 'חצי דלעת',
    caloriesPerServing: 120,
    summary: 'פוטטוס אפוי מדלעת ערמונים עם תיבול פפריקה, כמון ושום.',
    ingredients: [
      'דלעת ערמונים',
      'פפריקה מתוקה',
      'כמון',
      'אבקת שום',
      'כף קורנפלור',
      'כף שמן זית',
      'מלח',
    ],
    instructions: [
      'חוצים ומנקים את הדלעת, ואז פורסים לרצועות.',
      'מערבבים עם כל תערובת התיבול.',
      'אופים בשכבה אחידה עד השחמה.',
    ],
    imagePrompt: buildImagePrompt(
      'Acorn squash wedges baked like potato fries, spiced and crisp on the edges, served in a snack bowl'
    ),
  },
  {
    id: 'cucumber-chicken-salad',
    title: 'סלט מלפפונים',
    category: 'נשנוש וביניים',
    servings: 2,
    portion: 'קערה אחת',
    caloriesPerServing: 170,
    summary: 'סלט מלפפונים קריספי עם חזה עוף ורוטב חמאת בוטנים-סויה.',
    ingredients: [
      '3 מלפפונים',
      '200 גרם חזה עוף',
      'כף חמאת בוטנים',
      'כפית דבש',
      'חצי כף סויה',
      '4 כפות מים',
      'צ׳ילי גרוס לפי הטעם',
    ],
    instructions: [
      'מבשלים את העוף במים חמים ומפרקים או פורסים.',
      'קוצצים ומייבשים היטב את המלפפונים.',
      'מערבבים את חומרי הרוטב ומאחדים עם המלפפונים והעוף.',
    ],
    imagePrompt: buildImagePrompt(
      'Crunchy cucumber chicken salad with peanut soy dressing, glossy fresh herbs and clean modern bowl plating'
    ),
  },
  {
    id: 'crispy-chickpeas',
    title: 'נשנושי חומוס',
    category: 'נשנוש וביניים',
    servings: 4,
    portion: 'חצי כוס',
    caloriesPerServing: 110,
    summary: 'גרגירי חומוס קפואים צלויים בתיבול מעושן ופריך.',
    ingredients: ['גרגירי חומוס קפואים', 'מלח', 'פלפל', 'פפריקה מעושנת', 'כמון או כורכום לפי הטעם'],
    instructions: [
      'מתבלים היטב את גרגירי החומוס.',
      'מפזרים בשכבה אחת על תבנית.',
      'אופים עד שהגרגירים קשים ופריכים.',
    ],
    imagePrompt: buildImagePrompt(
      'Crispy roasted chickpea snack with smoked paprika, served in a small matte bowl for healthy snacking'
    ),
  },
  {
    id: 'protein-knafeh',
    title: 'כנאפה עשירה בחלבון',
    category: 'מתוקים',
    servings: 2,
    portion: 'חצי תבנית',
    caloriesPerServing: 300,
    summary: 'כנאפה אישית מאטריות אורז, יוגורט חלבון וגבינות.',
    ingredients: [
      '50 גרם אטריות אורז',
      'יוגורט חלבון',
      '50 גרם גבינת טוב טעם',
      '20 גרם מוצרלה',
      '30 גרם חמאה מומסת',
      'מי סוכר מתחליף סוכר',
    ],
    instructions: [
      'מבשלים קלות את האטריות ומערבבים עם חמאה.',
      'מרכיבים שכבות של אטריות וגבינות בתבנית.',
      'אופים עד השחמה ויוצקים מי סוכר מרוכזים.',
    ],
    imagePrompt: buildImagePrompt(
      'Protein knafeh made with rice noodles, golden crisp top, creamy cheese center and glossy syrup finish'
    ),
  },
  {
    id: 'flourless-peanut-butter-cookies',
    title: 'עוגיות חמאת בוטנים ללא קמח',
    category: 'מתוקים',
    servings: 24,
    portion: 'עוגייה אחת',
    caloriesPerServing: 145,
    summary: 'עוגיות עשירות ורכות מחמאת בוטנים, ביצים ומייפל.',
    ingredients: ['500 גרם חמאת בוטנים', 'שליש כוס מייפל או דבש', 'שליש כוס תחליף סוכר', '2 ביצים'],
    instructions: [
      'מערבבים את כל החומרים לתערובת אחידה.',
      'משטחים עוגיות על תבנית מרופדת.',
      'אופים עד שקצוות העוגיות זהובים.',
    ],
    imagePrompt: buildImagePrompt(
      'Flourless peanut butter cookies with soft centers and lightly cracked tops, stacked in a neat dessert scene'
    ),
  },
  {
    id: 'protein-ice-cream-blondie',
    title: 'גלידת חלבון בלונדי קרמל בייגלה מלוח',
    category: 'מתוקים',
    servings: 6,
    portion: 'מלבן אחד',
    caloriesPerServing: 210,
    summary: 'גלידת יוגורט קפואה עם חמאת בוטנים, דבש ובייגלה קרמל מלוח.',
    ingredients: [
      '400 גרם יוגורט חלבון וניל',
      'שליש כוס חמאת בוטנים',
      'שליש כוס דבש',
      'כוס בייגלה קרם קרמל',
      'בייגלה מלוח לציפוי',
    ],
    instructions: [
      'מערבבים יוגורט, חמאת בוטנים ודבש ומוסיפים בייגלה מרוסק.',
      'משטחים בתבנית אינגליש קייק ומפזרים מעל ציפוי.',
      'מקפיאים היטב וחותכים למלבנים.',
    ],
    imagePrompt: buildImagePrompt(
      'Protein frozen blondie bars with caramel pretzel crunch, peanut butter drizzle and creamy cut edges'
    ),
  },
  {
    id: 'rice-cake-tiramisu',
    title: 'טירמיסו פירכיות',
    category: 'מתוקים',
    servings: 4,
    portion: 'מנה אישית',
    caloriesPerServing: 105,
    summary: 'טירמיסו קליל משכבות פירכיות, קפה ומעדן חלבון.',
    ingredients: ['חבילת פירכיות', 'נס קפה', 'מעדן חלבון', 'קקאו'],
    instructions: [
      'מכינים בלילת קפה ומים רותחים.',
      'טובלים פירכית, מורחים מעל מעדן חלבון ובונים שכבות.',
      'מפזרים קקאו ומצננים מעט לפני הגשה.',
    ],
    imagePrompt: buildImagePrompt(
      'Light tiramisu made from rice cakes and protein pudding, cocoa dusted layers in a glass dessert cup'
    ),
  },
  {
    id: 'rice-paper-croissant',
    title: 'קוראסון חמאה מדפי אורז',
    category: 'מתוקים',
    servings: 6,
    portion: 'קרואסון אחד',
    caloriesPerServing: 170,
    summary: 'קרואסון אפוי מדפי אורז עם בלילה חמאית וקינמון.',
    ingredients: [
      '2 ביצים',
      'חצי כוס חלב',
      'כף וחצי חמאה',
      'כפית קינמון',
      '2 כפות דבש או מייפל',
      'כפית אבקת אפייה',
      '3 דפי אורז לכל קרואסון',
    ],
    instructions: [
      'ממיסים חמאה ומערבבים עם שאר חומרי הבלילה.',
      'טובלים דפי אורז, חותכים ומגלגלים לצורת קרואסון.',
      'אופים עד השחמה עמוקה ומפזרים אבקת סוכר אם רוצים.',
    ],
    imagePrompt: buildImagePrompt(
      'Rice paper butter croissant, deeply golden with flaky illusion, dusted lightly and plated like a pastry boutique item'
    ),
  },
  {
    id: 'protein-cinnamon-rolls',
    title: 'סינבון חלבון',
    category: 'מתוקים',
    servings: 8,
    portion: 'סינבון אחד',
    caloriesPerServing: 160,
    summary: 'סינבון אפוי מבצק יוגורט חלבון עם מלית קינמון וציפוי וניל.',
    ingredients: [
      '2 מעדני יוגורט חלבון',
      '2.25 כוסות קמח תופח',
      'קינמון',
      'תחליף סוכר חום',
      'יוגורט או מעדן וניל',
      'חלב',
    ],
    instructions: [
      'מערבבים את חומרי הבצק ונותנים לו לנוח.',
      'מרדדים, מורחים מעט שמן, מפזרים מלית קינמון ומגלגלים.',
      'פורסים, אופים ומסיימים בציפוי וניל.',
    ],
    imagePrompt: buildImagePrompt(
      'Protein cinnamon rolls with vanilla glaze, soft spiral layers and warm bakery feel'
    ),
  },
  {
    id: 'oat-chocolate-balls',
    title: 'כדורי שוקולד שיבולת שועל',
    category: 'מתוקים',
    servings: 12,
    portion: 'כדור אחד',
    caloriesPerServing: 90,
    summary: 'כדורי שוקולד קרים מיוגורט חלבון, שיבולת שועל ושוקולד מריר.',
    ingredients: [
      '400 גרם יוגורט חלבון',
      'כוס שיבולת שועל דקה',
      '3 כפות קקאו',
      '100 גרם שוקולד מריר',
      'תחליף סוכר לפי הטעם',
    ],
    instructions: [
      'מערבבים את כל החומרים יחד ומצננים עד להתייצבות.',
      'מגלגלים לכדורים.',
      'מצפים בקוקוס ושומרים במקרר או במקפיא.',
    ],
    imagePrompt: buildImagePrompt(
      'Chocolate oat protein balls coated with coconut, neat chilled dessert presentation on a matte tray'
    ),
  },
  {
    id: 'energy-bar',
    title: 'חטיף אנרגיה',
    category: 'נשנוש וביניים',
    servings: 10,
    portion: 'חטיף אחד',
    caloriesPerServing: 180,
    summary: 'חטיף אפוי מאגוזים, זרעים ומייפל במרקם קרנצ׳י.',
    ingredients: [
      'כוס שקדים',
      'חצי כוס קשיו',
      'חצי כוס פיסטוקים',
      'חצי כוס זרעי חמניה',
      'רבע כפית מלח',
      'רבע כוס מייפל טבעי',
    ],
    instructions: [
      'מערבבים את כל המרכיבים כך שהמייפל מצפה את האגוזים והזרעים.',
      'מעבירים לתבנית מרופדת ומהדקים.',
      'אופים עד ייצוב והשחמה קלה ומצננים לפני חיתוך.',
    ],
    imagePrompt: buildImagePrompt(
      'Homemade nut and seed energy bars with glossy maple finish, clean stacked snack bar styling'
    ),
  },
  {
    id: 'protein-popsicles',
    title: 'ארטיק חלבון',
    category: 'מתוקים',
    servings: 6,
    portion: 'ארטיק אחד',
    caloriesPerServing: 60,
    summary: 'ארטיק קקאו וקוטג׳ קפוא במרקם חלק ועשיר בחלבון.',
    ingredients: ['גביע קוטג׳ 5%', '2 כפות קקאו', '1-2 כפות מייפל'],
    instructions: [
      'טוחנים את כל המרכיבים בבלנדר עד מרקם חלק.',
      'מעבירים לתבניות ארטיקים.',
      'מקפיאים לפחות 6 שעות.',
    ],
    imagePrompt: buildImagePrompt(
      'Chocolate protein popsicles with glossy cocoa coating look, clean frozen dessert styling on a stone surface'
    ),
  },
  {
    id: 'protein-biscuit-cake',
    title: 'עוגת ביסקוויטים עשירה בחלבון',
    category: 'מתוקים',
    servings: 3,
    portion: 'מנה אישית',
    caloriesPerServing: 175,
    summary: 'עוגת שכבות מהירה מפתי בר, יוגורט חלבון ושוקולד מומס.',
    ingredients: [
      '6 פתי בר',
      '2 יוגורט חלבון וניל',
      '2 כפות שוקולד מומס',
      'כף פודינג וניל אופציונלי',
      'נס קפה קר',
    ],
    instructions: [
      'טובלים פתי בר קלות בקפה ומסדרים שכבה.',
      'מורחים יוגורט חלבון ובונים שכבות נוספות.',
      'מסיימים בשוקולד מומס ומצננים במקרר.',
    ],
    imagePrompt: buildImagePrompt(
      'Protein biscuit cake layered with coffee soaked cookies, vanilla cream and glossy chocolate top'
    ),
  },
  {
    id: 'protein-crepe',
    title: 'קרפ חלבון',
    category: 'ארוחת בוקר',
    servings: 3,
    portion: 'קרפ אחד',
    caloriesPerServing: 145,
    summary: 'קרפים דקים מאבקת חלבון, חלב וקורנפלור.',
    ingredients: [
      'ביצה שלמה',
      'כוס וחצי חלב',
      'סקופ אבקת חלבון',
      '2 כפות קורנפלור',
      'תמצית וניל וסוכר אופציונלי',
    ],
    instructions: [
      'מערבבים את כל החומרים בבלנדר או שייקר לבלילה נוזלית.',
      'שופכים למחבת חמה משומנת קלות.',
      'מחכים להתייצבות והופכים.',
    ],
    imagePrompt: buildImagePrompt(
      'Thin protein crepe folded elegantly with light filling, delicate golden spots and cafe breakfast styling'
    ),
  },
  {
    id: 'protein-chocolate-cake',
    title: 'עוגת שוקולד חלבון',
    category: 'מתוקים',
    servings: 1,
    portion: 'עוגה אישית',
    caloriesPerServing: 330,
    summary: 'עוגת שוקולד אישית ממעדן חלבון עם רוטב שוקולד מהיר.',
    ingredients: [
      'מעדן חלבון',
      'ביצה',
      '2 כפות קקאו',
      '2 כפות קמח',
      '3 כפות ממתיק',
      'כפית אבקת אפייה',
      'מים',
      'ממרח שוקולד וקקאו לרוטב',
    ],
    instructions: [
      'מערבבים נוזלים ואז יבשים לבלילה אחידה.',
      'אופים עד שהקיסם יוצא עם פירורים לחים.',
      'מערבבים רוטב שוקולד ושופכים מעל.',
    ],
    imagePrompt: buildImagePrompt(
      'Single serve protein chocolate cake with glossy sauce dripping over the top, rich and fudgy texture'
    ),
  },
  {
    id: 'protein-cheesecake',
    title: 'עוגת גבינה חלבון',
    category: 'מתוקים',
    servings: 12,
    portion: 'פרוסה אחת',
    caloriesPerServing: 135,
    summary: 'עוגת גבינה אפויה ואוורירית עם פודינג וניל וקצף חלבונים.',
    ingredients: [
      '750 גרם גבינה לבנה',
      'כוס סוכר סוויטנגו',
      '6 ביצים מופרדות',
      '3 כפות קורנפלור',
      '3 כפות אינסטנט פודינג וניל',
    ],
    instructions: [
      'מערבבים גבינה, חלמונים, קורנפלור ופודינג.',
      'מקציפים חלבונים עם הסוכר ומקפלים לתערובת הגבינה.',
      'אופים באמבט מים ומקררים בתנור סגור.',
    ],
    imagePrompt: buildImagePrompt(
      'Tall baked protein cheesecake slice, pale golden top, airy creamy texture, elegant dessert plate'
    ),
  },
  {
    id: 'protein-creme-brulee',
    title: 'קרם ברולה חלבון',
    category: 'מתוקים',
    servings: 1,
    portion: 'מנה אישית',
    caloriesPerServing: 150,
    summary: 'מעדן חלבון וניל עם שכבת סוכר שרופה דקה וקראנצ׳ית.',
    ingredients: ['מעדן חלבון וניל', 'כפית סוכר חום'],
    instructions: [
      'מעבירים את המעדן לכלי עמיד בחום ומצננים או מקפיאים מעט.',
      'מפזרים מעל שכבת סוכר דקה.',
      'שורפים עם ברנר עד לקבלת קרמל פריך.',
    ],
    imagePrompt: buildImagePrompt(
      'Protein creme brulee in a ramekin with thin glassy caramelized sugar top cracked open'
    ),
  },
  {
    id: 'banana-loti',
    title: 'בננה לוטי דפי אורז',
    category: 'מתוקים',
    servings: 2,
    portion: 'יחידה אחת',
    caloriesPerServing: 200,
    summary: 'רול מתוק מדפי אורז עם בננה ושוקולד במחבת.',
    ingredients: ['דפי אורז', 'בננה', 'נוטלה', 'חמאה או ספריי שמן', 'ביצה', 'כוס חלב'],
    instructions: [
      'מערבבים ביצה וחלב לבלילה.',
      'מרכיבים שני דפי אורז, בננה ושוקולד ומגלגלים.',
      'מטגנים משני הצדדים עד הזהבה.',
    ],
    imagePrompt: buildImagePrompt(
      'Banana lotti made with rice paper, pan browned and sliced open with warm chocolate banana filling'
    ),
  },
  {
    id: 'low-cal-alfajores',
    title: 'אלפחורס דל קלוריות',
    category: 'מתוקים',
    servings: 15,
    portion: 'עוגיית סנדוויץ׳ אחת',
    caloriesPerServing: 150,
    summary: 'אלפחורס עדינים עם מילוי ריבת חלב וציפוי קוקוס.',
    ingredients: [
      '3 חלמונים',
      '125 גרם קורנפלור',
      '115 גרם קמח',
      '95 גרם חמאה מופחתת שומן',
      '70 גרם אבקת סוכר',
      'אבקת אפייה',
      '200 גרם ריבת חלב 0%',
      '15 גרם קוקוס',
    ],
    instructions: [
      'מכינים בצק פריך מכל חומרי העוגייה ומצננים היטב.',
      'מרדדים, קורצים עיגולים ואופים אפייה קצרה.',
      'ממלאים בריבת חלב, מצפים בקוקוס ומחזירים לקירור.',
    ],
    imagePrompt: buildImagePrompt(
      'Light alfajores sandwich cookies with dulce de leche filling and coconut edge, elegant dessert photography'
    ),
  },
];
