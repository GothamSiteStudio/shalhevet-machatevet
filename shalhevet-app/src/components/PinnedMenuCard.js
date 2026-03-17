import React from 'react';
import { Image, ImageBackground, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import { hasPinnedMenuContent, normalizePinnedMenu } from '../utils/pinnedMenu';

const menuTemplateImage = require('../../assets/pinned-menu-template.png');
const resolvedMenuTemplate = Image.resolveAssetSource(menuTemplateImage);
const DEFAULT_TEMPLATE_ASPECT_RATIO = 1080 / 1920;
const MENU_TEXT_FONT_FAMILY = 'Rubik_800ExtraBold';
const MENU_TITLE_FONT_FAMILY = 'Rubik_900Black';

export const PINNED_MENU_TEMPLATE_ASPECT_RATIO =
  resolvedMenuTemplate?.width && resolvedMenuTemplate?.height
    ? resolvedMenuTemplate.width / resolvedMenuTemplate.height
    : DEFAULT_TEMPLATE_ASPECT_RATIO;

function formatUpdatedAt(value) {
  const dateValue = String(value || '').split('T')[0];
  return dateValue || '';
}

export default function PinnedMenuCard({
  menu,
  compact = false,
  caption = 'תפריט נעוץ',
  displayHeight,
}) {
  const normalizedMenu = normalizePinnedMenu(menu);
  const updatedAt = formatUpdatedAt(normalizedMenu.updatedAt);
  const isDenseContent = normalizedMenu.bodyText.length > (compact ? 220 : 320);
  const hasDisplayHeight = Number.isFinite(displayHeight) && displayHeight > 0;
  const displayWidth = hasDisplayHeight
    ? Math.round(displayHeight * PINNED_MENU_TEMPLATE_ASPECT_RATIO)
    : null;

  if (!hasPinnedMenuContent(normalizedMenu)) {
    return null;
  }

  const cardChildren = (
    <>
      <ImageBackground
        source={menuTemplateImage}
        style={styles.backgroundImage}
        imageStyle={styles.backgroundImageAsset}
        resizeMode="stretch"
      >
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
      </ImageBackground>
    </>
  );

  if (!hasDisplayHeight) {
    return <View style={[styles.card, compact && styles.cardCompact]}>{cardChildren}</View>;
  }

  return (
    <View style={styles.displayFrame}>
      <View
        style={[
          styles.card,
          styles.cardFixedSize,
          compact && styles.cardCompact,
          { height: displayHeight, width: displayWidth },
        ]}
      >
        {cardChildren}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
  },
  backgroundImageAsset: {
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
    fontFamily: MENU_TEXT_FONT_FAMILY,
    fontSize: 11,
    textShadowColor: 'rgba(0, 0, 0, 0.55)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  bodyText: {
    color: COLORS.white,
    fontFamily: MENU_TEXT_FONT_FAMILY,
    fontSize: 18,
    letterSpacing: -0.2,
    lineHeight: 30,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.72)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
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
  cardFixedSize: {
    alignSelf: 'center',
    maxWidth: '100%',
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
  displayFrame: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.28)',
  },
  periodLabel: {
    color: 'rgba(255, 255, 255, 0.88)',
    fontFamily: MENU_TEXT_FONT_FAMILY,
    fontSize: 20,
    letterSpacing: -0.2,
    marginBottom: 10,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.68)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
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
    fontFamily: MENU_TITLE_FONT_FAMILY,
    fontSize: 34,
    letterSpacing: -0.4,
    lineHeight: 40,
    marginBottom: 20,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.76)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
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
    fontFamily: MENU_TEXT_FONT_FAMILY,
    fontSize: 11,
    textAlign: 'right',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
