export const DEFAULT_MAX_FONT_SIZE_MULTIPLIER = 1.8;

export const TYPOGRAPHY = {
  fontFamily: {
    regular: 'Heebo_400Regular',
    medium: 'Heebo_500Medium',
    bold: 'Heebo_700Bold',
  },
  sizes: {
    xs: 12, // כיתוב קטן מאוד (תאריכים/סטטוס)
    sm: 14, // טקסט משני
    md: 16, // טקסט רגיל לקריאה
    lg: 18, // כותרות משנה
    xl: 24, // כותרות רגילות
    xxl: 32, // כותרות ענק / נתונים בולטים
  },
  lineHeights: {
    xs: 16,
    sm: 20,
    md: 24,
    lg: 28,
    xl: 32,
    xxl: 40,
  }
};

const TYPOGRAPHY_STYLE_KEYS = ['fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'fontFamily'];

function normalizeFontWeight(weight) {
  if (weight === 'bold') return 700;
  if (weight === 'normal' || weight == null) return 400;

  const parsed = Number(weight);
  return Number.isFinite(parsed) ? parsed : 400;
}

export function getFontFamilyForWeight(weight) {
  const normalizedWeight = normalizeFontWeight(weight);

  if (normalizedWeight >= 700) return TYPOGRAPHY.fontFamily.bold;
  if (normalizedWeight >= 500) return TYPOGRAPHY.fontFamily.medium;
  return TYPOGRAPHY.fontFamily.regular;
}

export function isTypographyStyle(style) {
  if (!style || typeof style !== 'object' || Array.isArray(style)) {
    return false;
  }

  return TYPOGRAPHY_STYLE_KEYS.some(key => style[key] !== undefined);
}

export function mapTypographyStyle(style = {}) {
  if (!isTypographyStyle(style)) {
    return style;
  }

  const nextStyle = {
    ...style,
    fontFamily: style.fontFamily || getFontFamilyForWeight(style.fontWeight),
  };

  delete nextStyle.fontWeight;

  return nextStyle;
}

export function mapTypographyStyles(styleMap = {}) {
  return Object.fromEntries(
    Object.entries(styleMap).map(([key, style]) => [key, mapTypographyStyle(style)])
  );
}
