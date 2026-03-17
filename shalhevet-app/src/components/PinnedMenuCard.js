import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import { hasPinnedMenuContent, normalizePinnedMenu } from '../utils/pinnedMenu';

const menuTemplateImage = require('../../shalhevet menu template.jpeg');
const resolvedMenuTemplate = Image.resolveAssetSource(menuTemplateImage);

export const PINNED_MENU_TEMPLATE_ASPECT_RATIO =
  resolvedMenuTemplate?.width && resolvedMenuTemplate?.height
    ? resolvedMenuTemplate.width / resolvedMenuTemplate.height
    : 0.72;

function formatUpdatedAt(value) {
  const dateValue = String(value || '').split('T')[0];
  return dateValue || '';
}

export default function PinnedMenuCard({
  menu,
  compact = false,
  caption = 'תפריט נעוץ',
  backgroundResizeMode = 'contain',
}) {
  const normalizedMenu = normalizePinnedMenu(menu);
  const updatedAt = formatUpdatedAt(normalizedMenu.updatedAt);
  const isDenseContent = normalizedMenu.bodyText.length > (compact ? 220 : 320);

  if (!hasPinnedMenuContent(normalizedMenu)) {
    return null;
  }

  return (
    <View style={[styles.card, compact && styles.cardCompact]}>
      <Image
        source={menuTemplateImage}
        style={styles.backgroundImage}
        resizeMode={backgroundResizeMode}
      />
      <View style={styles.overlay} />

      <View
        style={[
          styles.content,
          compact && styles.contentCompact,
          isDenseContent && styles.contentDense,
        ]}
      >
        <View style={styles.topRow}>
          <View style={styles.badge}>
            <Ionicons name="pin-outline" size={12} color={COLORS.white} />
            <Text style={styles.badgeText}>{caption}</Text>
          </View>
          {updatedAt ? <Text style={styles.updatedAt}>עודכן {updatedAt}</Text> : <View />}
        </View>

        {normalizedMenu.periodLabel ? (
          <Text
            style={[
              styles.periodLabel,
              compact && styles.periodLabelCompact,
              isDenseContent && styles.periodLabelDense,
            ]}
          >
            {normalizedMenu.periodLabel}
          </Text>
        ) : null}

        <Text
          style={[
            styles.title,
            compact && styles.titleCompact,
            isDenseContent && styles.titleDense,
          ]}
        >
          {normalizedMenu.title || 'תפריט אישי'}
        </Text>

        <Text
          style={[
            styles.bodyText,
            compact && styles.bodyTextCompact,
            isDenseContent && styles.bodyTextDense,
          ]}
        >
          {normalizedMenu.bodyText}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.98,
  },
  badge: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.34)',
    borderColor: 'rgba(255, 255, 255, 0.18)',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row-reverse',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '700',
  },
  bodyText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 30,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  bodyTextCompact: {
    fontSize: 15,
    lineHeight: 25,
  },
  bodyTextDense: {
    fontSize: 14,
    lineHeight: 22,
  },
  card: {
    aspectRatio: PINNED_MENU_TEMPLATE_ASPECT_RATIO,
    backgroundColor: '#000000',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
    width: '100%',
  },
  cardCompact: {
    borderRadius: 22,
  },
  content: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingBottom: 28,
    paddingHorizontal: 24,
    paddingTop: 22,
  },
  contentCompact: {
    paddingBottom: 24,
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  contentDense: {
    paddingBottom: 20,
    paddingHorizontal: 18,
    paddingTop: 16,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.28)',
  },
  periodLabel: {
    color: 'rgba(255, 255, 255, 0.88)',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 10,
    textAlign: 'center',
  },
  periodLabelCompact: {
    fontSize: 17,
    marginBottom: 8,
  },
  periodLabelDense: {
    fontSize: 16,
    marginBottom: 6,
  },
  title: {
    color: COLORS.white,
    fontSize: 34,
    fontWeight: '900',
    lineHeight: 40,
    marginBottom: 20,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  titleCompact: {
    fontSize: 26,
    lineHeight: 31,
    marginBottom: 16,
  },
  titleDense: {
    fontSize: 24,
    lineHeight: 28,
    marginBottom: 12,
  },
  topRow: {
    alignItems: 'center',
    flexDirection: 'row-reverse',
    gap: 12,
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  updatedAt: {
    color: 'rgba(255, 255, 255, 0.78)',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'right',
  },
});
