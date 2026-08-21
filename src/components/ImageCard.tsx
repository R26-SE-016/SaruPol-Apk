import React, { useState } from 'react';
import { StyleSheet, View, Text, Image, ActivityIndicator, StyleProp, ViewStyle, TouchableOpacity, Modal, SafeAreaView, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, ROUNDING, SPACING } from '../constants/theme';
import api from '../services/api';

export interface ImageReference {
  url: string;
  caption: string;
  source: string;
}

interface ImageCardProps {
  image: ImageReference;
  baseUrl?: string;
  style?: StyleProp<ViewStyle>;
}

export default function ImageCard({ image, baseUrl, style }: ImageCardProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  // Construct full image URL with dynamic backend host resolution
  const getBaseHost = () => {
    if (baseUrl) return baseUrl.replace(/\/api(?:\/v1)?\/?$/, '');
    if (api.defaults.baseURL) {
      return api.defaults.baseURL.replace(/\/api(?:\/v1)?\/?$/, '');
    }
    return 'http://localhost:8000';
  };
  const baseHost = getBaseHost();

  let fullUrl = image.url || '';
  if (fullUrl.startsWith('http://localhost:8000') || fullUrl.startsWith('http://127.0.0.1:8000')) {
    fullUrl = fullUrl.replace(/^http:\/\/(?:localhost|127\.0\.0\.1):8000/, baseHost);
  } else if (!fullUrl.startsWith('http://') && !fullUrl.startsWith('https://')) {
    const cleanPath = fullUrl.startsWith('/') ? fullUrl : `/${fullUrl}`;
    // Encode space and special chars in filename while preserving slashes
    const encodedPath = cleanPath.split('/').map(segment => encodeURIComponent(segment)).join('/');
    fullUrl = `${baseHost}${encodedPath}`;
  }

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.88}
        onPress={() => {
          if (!error) setModalVisible(true);
        }}
        style={[styles.card, style]}
      >
        {/* Header Badge */}
        {image.source ? (
          <View style={styles.header}>
            <Ionicons name="image-outline" size={14} color={COLORS.primaryLight} />
            <Text style={styles.sourceText} numberOfLines={1}>
              {image.source}
            </Text>
            <Ionicons name="expand-outline" size={14} color={COLORS.textSecondary} style={{ marginLeft: 4 }} />
          </View>
        ) : null}

        {/* Image Container */}
        <View style={styles.imageWrapper}>
          {!error ? (
            <>
              <Image
                source={{ uri: fullUrl }}
                style={styles.image}
                resizeMode="cover"
                onLoadStart={() => setLoading(true)}
                onLoadEnd={() => setLoading(false)}
                onError={(e) => {
                  console.warn("Image load error:", fullUrl, e.nativeEvent?.error);
                  setLoading(false);
                  setError(true);
                }}
              />
              {loading && (
                <View style={styles.loadingOverlay}>
                  <ActivityIndicator size="small" color={COLORS.primaryLight} />
                </View>
              )}
              {/* Expand Hint Overlay Badge */}
              {!loading && (
                <View style={styles.expandHintBadge}>
                  <Ionicons name="scan-outline" size={12} color="#FFFFFF" />
                  <Text style={styles.expandHintText}>Tap to enlarge</Text>
                </View>
              )}
            </>
          ) : (
            <View style={styles.errorContainer}>
              <Ionicons name="image-outline" size={28} color={COLORS.textSecondary} />
              <Text style={styles.errorText}>Reference Image</Text>
            </View>
          )}
        </View>

        {/* Caption Below Image */}
        {image.caption ? (
          <View style={styles.captionContainer}>
            <Text style={styles.captionText}>{image.caption}</Text>
          </View>
        ) : null}
      </TouchableOpacity>

      {/* Full-screen Large Image Modal Popup */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={styles.modalBackground}>
          <StatusBar barStyle="light-content" backgroundColor="#000000" />
          
          {/* Top Header Bar */}
          <View style={styles.modalTopBar}>
            <View style={styles.modalSourceBadge}>
              <Ionicons name="document-text-outline" size={14} color={COLORS.primaryLight} />
              <Text style={styles.modalSourceText} numberOfLines={1}>
                {image.source || "CRI Reference"}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Full Screen Image View */}
          <TouchableOpacity
            activeOpacity={1}
            style={styles.modalImageContainer}
            onPress={() => setModalVisible(false)}
          >
            <Image
              source={{ uri: fullUrl }}
              style={styles.modalImage}
              resizeMode="contain"
            />
          </TouchableOpacity>

          {/* Bottom Caption Overlay */}
          {image.caption ? (
            <View style={styles.modalCaptionContainer}>
              <Text style={styles.modalCaptionText}>{image.caption}</Text>
              <Text style={styles.modalDismissHint}>Tap anywhere to close</Text>
            </View>
          ) : null}
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: ROUNDING.md,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    overflow: 'hidden',
    marginTop: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(27, 94, 32, 0.25)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    gap: 6,
  },
  sourceText: {
    color: COLORS.primaryLight,
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
  },
  imageWrapper: {
    width: '100%',
    height: 180,
    backgroundColor: '#07150A',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 31, 13, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  expandHintBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(10, 31, 13, 0.75)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: ROUNDING.full,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
  expandHintText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.md,
    gap: SPACING.xs,
  },
  errorText: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  captionContainer: {
    padding: SPACING.sm,
    backgroundColor: 'rgba(18, 38, 23, 0.8)',
  },
  captionText: {
    color: COLORS.textPrimary,
    fontSize: 12,
    lineHeight: 16,
  },

  // Modal Popup Styles
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(5, 15, 6, 0.96)',
    justifyContent: 'space-between',
  },
  modalTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    zIndex: 10,
  },
  modalSourceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(27, 94, 32, 0.4)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: ROUNDING.full,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    flex: 1,
    marginRight: 12,
  },
  modalSourceText: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '600',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  modalImageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xs,
  },
  modalImage: {
    width: '100%',
    height: '100%',
  },
  modalCaptionContainer: {
    backgroundColor: 'rgba(18, 38, 23, 0.95)',
    padding: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.glassBorder,
    alignItems: 'center',
  },
  modalCaptionText: {
    color: COLORS.textPrimary,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    fontWeight: '500',
  },
  modalDismissHint: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 6,
  },
});
