/**
 * Web-only onboarding carousel.
 * Desktop: image on left, text + nav on right.
 * Mobile web: stacked — image above, text + nav below.
 * No location permission request on web.
 */
import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';

import { useOnboardingFlow } from '../../hooks/useOnboardingFlow';

export default function OnBoardingScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const {
    slides,
    current,
    setCurrent,
    isLast,
    isLoading,
    handleNext,
    handleSkip,
  } = useOnboardingFlow(() => {
    // Web-specific: backup flag in localStorage so other tabs won't redirect
    try { localStorage.setItem('ta_onboarding_done', '1'); } catch {}
  });

  const slide = slides[current];

  // ── Dots ──────────────────────────────────────────────────────────────────
  const dots = (
    <View style={styles.dotsRow}>
      {slides.map((_, i) => (
        <TouchableOpacity key={i} onPress={() => setCurrent(i)}>
          <View style={[styles.dot, i === current && styles.dotActive]} />
        </TouchableOpacity>
      ))}
    </View>
  );

  // ── Text panel ────────────────────────────────────────────────────────────
  const textPanel = (
    <View style={styles.textPanel}>
      <Text style={styles.slideTitle}>{slide.msg}</Text>
      {dots}
      <TouchableOpacity
        style={[styles.nextBtn, isLoading && styles.nextBtnDisabled]}
        onPress={handleNext}
        disabled={isLoading}
      >
        <Text style={styles.nextBtnText}>
          {isLoading ? 'Загрузка...' : isLast ? 'Начать' : 'Далее'}
        </Text>
      </TouchableOpacity>
      {!isLast && (
        <TouchableOpacity onPress={handleSkip} style={styles.skipWrap}>
          <Text style={styles.skipText}>Пропустить</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  // ── Root ──────────────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      {isDesktop ? (
        <View style={styles.desktopRow}>
          <View style={styles.imagePanel}>
            <Image source={slide.src} style={styles.slideImage} resizeMode="contain" />
          </View>
          <View style={styles.rightPanel}>
            {textPanel}
          </View>
        </View>
      ) : (
        <View style={styles.mobileCol}>
          <View style={styles.mobileImageWrap}>
            <Image source={slide.src} style={styles.slideImageMobile} resizeMode="contain" />
          </View>
          {textPanel}
        </View>
      )}
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F0F2F5',
  },

  desktopRow: {
    flex: 1,
    flexDirection: 'row',
  },
  imagePanel: {
    flex: 1,
    backgroundColor: '#EEEEEE',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  slideImage: {
    width: '90%',
    height: '90%',
    maxWidth: 700,
    maxHeight: 800,
  },
  rightPanel: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 48,
    paddingVertical: 40,
  },

  mobileCol: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  mobileImageWrap: {
    flex: 1,
    backgroundColor: '#EEEEEE',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    marginBottom: 24,
  },
  slideImageMobile: {
    width: '90%',
    height: '90%',
  },

  textPanel: {
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  slideTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 32,
  },

  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#C0C0C0',
    marginHorizontal: 6,
  },
  dotActive: {
    backgroundColor: '#3A3A3A',
    width: 12,
    height: 12,
    borderRadius: 6,
  },

  nextBtn: {
    width: '100%',
    height: 50,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3A3A3A',
    marginBottom: 16,
  },
  nextBtnDisabled: {
    backgroundColor: '#7A7A7A',
    opacity: 0.6,
  },
  nextBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  skipWrap: {
    padding: 8,
  },
  skipText: {
    fontSize: 14,
    color: '#888',
    textDecorationLine: 'underline',
  },
});
