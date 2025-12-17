
import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { supabase } from '@/app/integrations/supabase/client';
import Toast from 'react-native-toast-message';

interface BlockUserModalProps {
  visible: boolean;
  onClose: () => void;
  userId: string;
  username: string;
  onBlockSuccess?: () => void;
}

export function BlockUserModal({
  visible,
  onClose,
  userId,
  username,
  onBlockSuccess,
}: BlockUserModalProps) {
  const [blocking, setBlocking] = useState(false);

  const handleBlock = async () => {
    try {
      setBlocking(true);
      console.log('🚫 Blocking user:', userId);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Not authenticated');
      }

      // Block user in Supabase
      const { error } = await supabase.from('blocked_users').insert({
        blocker_user_id: user.id,
        blocked_user_id: userId,
      });

      if (error) {
        // Check if already blocked
        if (error.code === '23505') {
          Toast.show({
            type: 'info',
            text1: 'Already blocked',
            text2: `You have already blocked ${username}`,
          });
          onClose();
          return;
        }
        console.error('❌ Error blocking user:', error);
        throw error;
      }

      console.log('✅ User blocked successfully');
      Toast.show({
        type: 'success',
        text1: 'User blocked',
        text2: `You will no longer see content from ${username}`,
      });

      // Call success callback
      if (onBlockSuccess) {
        onBlockSuccess();
      }

      onClose();
    } catch (err: any) {
      console.error('❌ Error in handleBlock:', err);
      Toast.show({
        type: 'error',
        text1: 'Failed to block user',
        text2: err.message || 'Please try again',
      });
    } finally {
      setBlocking(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Icon */}
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>🚫</Text>
          </View>

          {/* Title */}
          <Text style={styles.title}>Block {username}?</Text>

          {/* Description */}
          <Text style={styles.description}>
            Blocked users cannot:
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletItem}>• Message you</Text>
            <Text style={styles.bulletItem}>• See your job posts</Text>
            <Text style={styles.bulletItem}>• Apply to your jobs</Text>
          </View>
          <Text style={styles.description}>
            You will not see their jobs or messages either.
          </Text>

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onClose}
              disabled={blocking}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.blockButton, blocking && styles.blockButtonDisabled]}
              onPress={handleBlock}
              disabled={blocking}
            >
              {blocking ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.blockButtonText}>Block</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  icon: {
    fontSize: 48,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 15,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 12,
  },
  bulletList: {
    alignSelf: 'stretch',
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  bulletItem: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F1F5F9',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#475569',
  },
  blockButton: {
    backgroundColor: '#EF4444',
  },
  blockButtonDisabled: {
    opacity: 0.6,
  },
  blockButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});
