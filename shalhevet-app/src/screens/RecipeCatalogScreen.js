import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import { RECIPE_CATALOG } from '../data/recipeCatalog';

const { width } = Dimensions.get('window');

const CATEGORIES = ['הכל', 'ארוחת בוקר', 'עיקריות', 'נשנוש וביניים', 'מתוקים'];

const CATEGORY_ICONS = {
  'הכל': 'book-open-variant',
  'ארוחת בוקר': 'weather-sunset-up',
  'עיקריות': 'pot-steam',
  'נשנוש וביניים': 'cookie',
  'מתוקים': 'cupcake',
};

function RecipeCard({ recipe, onPress }) {
  return (
    <TouchableOpacity style={styles.recipeCard} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.recipeCardContent}>
        <View style={styles.recipeIconWrap}>
          <MaterialCommunityIcons name="silverware-fork-knife" size={24} color={COLORS.primary} />
        </View>
        <View style={styles.recipeTextWrap}>
          <Text style={styles.recipeTitle}>{recipe.title}</Text>
          <Text style={styles.recipeMeta}>
            {recipe.category} · {recipe.caloriesPerServing} קל׳ · {recipe.portion}
          </Text>
          <Text style={styles.recipeSummary} numberOfLines={2}>
            {recipe.summary}
          </Text>
        </View>
        <Ionicons name="chevron-back" size={18} color={COLORS.textMuted} />
      </View>
    </TouchableOpacity>
  );
}

function RecipeDetailModal({ recipe, visible, onClose }) {
  if (!recipe) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScroll}>
            {/* Header */}
            <View style={styles.detailHeader}>
              <View style={styles.detailIconBig}>
                <MaterialCommunityIcons
                  name="silverware-fork-knife"
                  size={32}
                  color={COLORS.primary}
                />
              </View>
              <Text style={styles.detailTitle}>{recipe.title}</Text>
              <Text style={styles.detailCategory}>{recipe.category}</Text>
            </View>

            {/* Quick Info */}
            <View style={styles.quickInfoRow}>
              <View style={styles.quickInfoItem}>
                <Ionicons name="flame" size={18} color="#EF5350" />
                <Text style={styles.quickInfoValue}>{recipe.caloriesPerServing}</Text>
                <Text style={styles.quickInfoLabel}>קלוריות</Text>
              </View>
              <View style={styles.quickInfoItem}>
                <Ionicons name="restaurant" size={18} color="#42A5F5" />
                <Text style={styles.quickInfoValue}>{recipe.servings}</Text>
                <Text style={styles.quickInfoLabel}>מנות</Text>
              </View>
              <View style={styles.quickInfoItem}>
                <MaterialCommunityIcons name="scale" size={18} color="#66BB6A" />
                <Text style={styles.quickInfoValue}>{recipe.portion}</Text>
                <Text style={styles.quickInfoLabel}>מנה</Text>
              </View>
            </View>

            {/* Summary */}
            <Text style={styles.detailSummary}>{recipe.summary}</Text>

            {/* Ingredients */}
            <Text style={styles.sectionTitle}>מצרכים</Text>
            {recipe.ingredients.map((ing, i) => (
              <View key={i} style={styles.ingredientRow}>
                <Text style={styles.ingredientText}>{ing}</Text>
                <View style={styles.ingredientBullet} />
              </View>
            ))}

            {/* Instructions */}
            <Text style={styles.sectionTitle}>אופן הכנה</Text>
            {recipe.instructions.map((step, i) => (
              <View key={i} style={styles.stepRow}>
                <Text style={styles.stepText}>{step}</Text>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>{i + 1}</Text>
                </View>
              </View>
            ))}

            <View style={{ height: 30 }} />
          </ScrollView>

          <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.85}>
            <Text style={styles.closeBtnText}>סגור</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export default function RecipeCatalogScreen({ navigation }) {
  const [selectedCategory, setSelectedCategory] = useState('הכל');
  const [selectedRecipe, setSelectedRecipe] = useState(null);

  const filteredRecipes = useMemo(() => {
    if (selectedCategory === 'הכל') return RECIPE_CATALOG;
    return RECIPE_CATALOG.filter(r => r.category === selectedCategory);
  }, [selectedCategory]);

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-forward" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <MaterialCommunityIcons name="book-open-page-variant" size={22} color={COLORS.primary} />
          <Text style={styles.headerTitle}>ספר מתכונים</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <Text style={styles.headerSubtitle}>
        {RECIPE_CATALOG.length} מתכונים בריאים וטעימים
      </Text>

      {/* Category Filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryRow}
        style={styles.categoryScroll}
      >
        {CATEGORIES.map(cat => {
          const isActive = selectedCategory === cat;
          return (
            <TouchableOpacity
              key={cat}
              style={[styles.categoryChip, isActive && styles.categoryChipActive]}
              onPress={() => setSelectedCategory(cat)}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons
                name={CATEGORY_ICONS[cat]}
                size={16}
                color={isActive ? COLORS.white : COLORS.textSecondary}
              />
              <Text style={[styles.categoryText, isActive && styles.categoryTextActive]}>
                {cat}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Recipe List */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
      >
        {filteredRecipes.map(recipe => (
          <RecipeCard
            key={recipe.id}
            recipe={recipe}
            onPress={() => setSelectedRecipe(recipe)}
          />
        ))}

        {filteredRecipes.length === 0 && (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="chef-hat" size={40} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>אין מתכונים בקטגוריה זו</Text>
          </View>
        )}
      </ScrollView>

      <RecipeDetailModal
        recipe={selectedRecipe}
        visible={!!selectedRecipe}
        onClose={() => setSelectedRecipe(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  backBtn: { width: 40, alignItems: 'flex-start' },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { color: COLORS.white, fontSize: 20, fontWeight: 'bold' },
  headerSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 12,
  },

  // Categories
  categoryScroll: { maxHeight: 48, marginBottom: 8 },
  categoryRow: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: 'center',
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  categoryChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  categoryText: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '500' },
  categoryTextActive: { color: COLORS.white },

  // Recipe List
  list: { paddingHorizontal: 16, paddingBottom: 30 },
  recipeCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 10,
    overflow: 'hidden',
  },
  recipeCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  recipeIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: COLORS.primary + '18',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recipeTextWrap: { flex: 1, alignItems: 'flex-end' },
  recipeTitle: { color: COLORS.white, fontSize: 15, fontWeight: '700', textAlign: 'right' },
  recipeMeta: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginTop: 2,
    textAlign: 'right',
  },
  recipeSummary: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 4,
    textAlign: 'right',
    lineHeight: 18,
  },

  // Empty
  emptyState: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { color: COLORS.textSecondary, fontSize: 15 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    borderTopWidth: 1,
    borderColor: COLORS.border,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  modalScroll: { paddingHorizontal: 20 },

  // Detail Header
  detailHeader: { alignItems: 'center', paddingTop: 8, marginBottom: 16 },
  detailIconBig: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: COLORS.primary + '18',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  detailTitle: { color: COLORS.white, fontSize: 22, fontWeight: 'bold', textAlign: 'center' },
  detailCategory: { color: COLORS.textSecondary, fontSize: 14, marginTop: 4 },

  // Quick Info
  quickInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: COLORS.cardLight,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  quickInfoItem: { alignItems: 'center', gap: 4 },
  quickInfoValue: { color: COLORS.white, fontSize: 15, fontWeight: '700' },
  quickInfoLabel: { color: COLORS.textMuted, fontSize: 11 },

  detailSummary: {
    color: COLORS.textSecondary,
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'right',
    marginBottom: 20,
  },

  // Sections
  sectionTitle: {
    color: COLORS.white,
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'right',
    marginBottom: 12,
  },

  // Ingredients
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  ingredientText: { color: COLORS.textSecondary, fontSize: 14, textAlign: 'right', flex: 1 },
  ingredientBullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },

  // Steps
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'flex-end',
    gap: 12,
    marginBottom: 14,
  },
  stepText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'right',
    flex: 1,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary + '22',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: { color: COLORS.primary, fontSize: 13, fontWeight: '700' },

  // Close Button
  closeBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 14,
    marginHorizontal: 20,
    marginBottom: 20,
    marginTop: 8,
    alignItems: 'center',
  },
  closeBtnText: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
});
