
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ActivityIndicator, Linking } from 'react-native';
import { colors, buttonStyles } from '@/styles/commonStyles';
import { stripeService } from '@/services/stripeService';
import { Toast } from './Toast';

interface PayoutModalProps {
  visible: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

export function PayoutModal({ visible, onClose, onRefresh }: PayoutModalProps) {
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'info' as 'success' | 'error' | 'info' });

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ visible: true, message, type });
  };

  const handleEnablePayouts = async () => {
    setLoading(true);
    try {
      const result = await stripeService.setupPayouts();
      
      if (result.needsOnboarding && result.onboardingUrl) {
        // Open Stripe onboarding in browser
        const supported = await Linking.canOpenURL(result.onboardingUrl);
        if (supported) {
          await Linking.openURL(result.onboardingUrl);
          showToast('Complete the Stripe onboarding process', 'info');
        } else {
          showToast('Unable to open Stripe onboarding', 'error');
        }
      } else if (result.payoutsEnabled) {
        showToast('Payouts already enabled!', 'success');
        onRefresh();
        setTimeout(() => onClose(), 1500);
      }
    } catch (error) {
      console.error('Error enabling payouts:', error);
      showToast('Failed to enable payouts. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshStatus = async () => {
    setLoading(true);
    try {
      const status = await stripeService.checkPayoutStatus();
      
      if (status.payoutsEnabled) {
        showToast('Payouts are now enabled!', 'success');
        onRefresh();
        setTimeout(() => onClose(), 1500);
      } else if (status.hasAccount && !status.detailsSubmitted) {
        showToast('Please complete your Stripe onboarding', 'info');
      } else {
        showToast('Payouts not yet enabled', 'info');
      }
    } catch (error) {
      console.error('Error refreshing status:', error);
      showToast('Failed to refresh status', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={onClose}
      >
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.icon}>💳</Text>
            <Text style={styles.title}>Enable Payouts</Text>
            <Text style={styles.message}>
              You need to enable payouts with Stripe Connect before you can post jobs or apply to jobs.
            </Text>
            <Text style={styles.note}>
              This will open Stripe&apos;s secure onboarding process to verify your identity and set up payments.
            </Text>

            {loading ? (
              <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
            ) : (
              <>
                <TouchableOpacity
                  style={[buttonStyles.primary, styles.button]}
                  onPress={handleEnablePayouts}
                  accessibilityLabel="Enable payouts"
                  accessibilityRole="button"
                >
                  <Text style={buttonStyles.primaryText}>Enable Payouts</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[buttonStyles.outline, styles.button]}
                  onPress={handleRefreshStatus}
                  accessibilityLabel="Refresh payout status"
                  accessibilityRole="button"
                >
                  <Text style={buttonStyles.outlineText}>Refresh Status</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[buttonStyles.outline, styles.button]}
                  onPress={onClose}
                  accessibilityLabel="Close modal"
                  accessibilityRole="button"
                >
                  <Text style={buttonStyles.outlineText}>Close</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={() => setToast({ ...toast, visible: false })}
      />
    </>
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
  modal: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  icon: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 12,
  },
  note: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  loader: {
    marginVertical: 24,
  },
  button: {
    width: '100%',
    marginBottom: 12,
  },
});
