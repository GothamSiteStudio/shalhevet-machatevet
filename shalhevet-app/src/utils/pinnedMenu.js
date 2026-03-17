function toText(value) {
  if (value === undefined || value === null) return '';
  return String(value).trim();
}

function formatMetric(label, value, suffix = '') {
  const text = toText(value);

  if (!text || text === '0' || text === '0.0' || text === '0.00') {
    return '';
  }

  return `${label} ${text}${suffix}`;
}

function formatMealItemLine(item) {
  const headline = [toText(item?.name), toText(item?.amount || item?.portion)]
    .filter(Boolean)
    .join(' / ');
  const nutritionBits = [
    formatMetric('קל׳', item?.calories),
    formatMetric('ח׳', item?.protein, 'ג׳'),
    formatMetric('פ׳', item?.carbs, 'ג׳'),
    formatMetric('ש׳', item?.fat, 'ג׳'),
  ].filter(Boolean);
  const detailLine = [headline, nutritionBits.join(' | ')].filter(Boolean).join(' · ');
  const notes = toText(item?.notes);

  return [detailLine, notes].filter(Boolean).join('\n');
}

function buildDailyTargetsSummary(dailyTargets = {}) {
  return [
    formatMetric('קלוריות', dailyTargets?.calories),
    formatMetric('חלבון', dailyTargets?.protein, 'ג׳'),
    formatMetric('פחמימות', dailyTargets?.carbs, 'ג׳'),
    formatMetric('שומן', dailyTargets?.fat, 'ג׳'),
  ]
    .filter(Boolean)
    .join(' / ');
}

export function createEmptyPinnedMenu() {
  return {
    title: '',
    periodLabel: '',
    bodyText: '',
    mode: 'freeform',
    updatedAt: '',
  };
}

export function normalizePinnedMenu(value) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};

  return {
    title: toText(source.title),
    periodLabel: toText(source.periodLabel || source.subtitle),
    bodyText: toText(source.bodyText || source.text),
    mode: source.mode === 'auto' ? 'auto' : 'freeform',
    updatedAt: toText(source.updatedAt),
  };
}

export function hasPinnedMenuContent(value) {
  const menu = normalizePinnedMenu(value);
  return Boolean(menu.title || menu.periodLabel || menu.bodyText);
}

export function serializePinnedMenu(value) {
  const menu = normalizePinnedMenu(value);

  if (!hasPinnedMenuContent(menu)) {
    return {};
  }

  return {
    ...menu,
    title: menu.title || 'תפריט אישי',
    updatedAt: new Date().toISOString(),
  };
}

export function buildAutomaticPinnedMenuFromNutrition(form, options = {}) {
  const source = form && typeof form === 'object' ? form : {};
  const meals = Array.isArray(source.meals) ? source.meals : [];
  const sections = [];
  const waterLiters = toText(source.dailyTargets?.waterLiters);

  if (waterLiters && waterLiters !== '0') {
    sections.push(`שתייה\n${waterLiters} ליטר מים לאורך היום`);
  }

  const dailyTargetsSummary = buildDailyTargetsSummary(source.dailyTargets || {});
  if (dailyTargetsSummary) {
    sections.push(`יעדים יומיים\n${dailyTargetsSummary}`);
  }

  meals.forEach((meal, mealIndex) => {
    const heading = [toText(meal?.name) || `ארוחה ${mealIndex + 1}`, toText(meal?.time)]
      .filter(Boolean)
      .join(' · ');
    const itemLines = (Array.isArray(meal?.items) ? meal.items : [])
      .map(formatMealItemLine)
      .filter(Boolean);
    const mealNotes = toText(meal?.notes);
    const body = [...itemLines, mealNotes].filter(Boolean).join('\n');

    if (body) {
      sections.push(`${heading}\n${body}`);
    }
  });

  const generalNotes = toText(source.notes);
  if (generalNotes) {
    sections.push(`דגשים\n${generalNotes}`);
  }

  return normalizePinnedMenu({
    title:
      toText(options.title) ||
      toText(source.pinnedMenu?.title) ||
      toText(source.title) ||
      'תפריט אישי',
    periodLabel:
      toText(options.periodLabel) || toText(source.pinnedMenu?.periodLabel) || 'תפריט יומי',
    bodyText: sections.join('\n\n').trim(),
    mode: 'auto',
    updatedAt: new Date().toISOString(),
  });
}
