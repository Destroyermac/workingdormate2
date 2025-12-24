
import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { supabase } from '@/app/integrations/supabase/client';
import Toast from 'react-native-toast-message';

interface ReportModalProps {
  visible: boolean;
  onClose: () => void;
  reportedUserId?: string;
  reportedJobId?: string;
  reportType: 'user' | 'job';
}

const REPORT_REASONS = [
  { value: 'scam', label: 'Scam' },
  { value: 'inappropriate', label: 'Inappropriate content' },
  { value: 'harassment', label: 'Harassment' },
  { value: 'other', label: 'Other' },
];

export function ReportModal({
  visible,
  onClose,
  reportedUserId,
  reportedJobId,
  reportType,
}: ReportModalProps) {
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reason) {
      Toast.show({
        type: 'error',
        text1: 'Please select a reason',
        text2: 'You must select a reason for reporting',
      });
      return;
    }

    const targetId = reportedJobId || reportedUserId;
    if (!targetId) {
      Toast.show({
        type: 'error',
        text1: 'Missing target',
        text2: 'Unable to determine what you are reporting.',
      });
      return;
    }

    try {
      setSubmitting(true);
      console.log('📝 Submitting report...', { reason, reportType, targetId });

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Not authenticated');
      }

      // Submit report to Supabase (schema: user_id, target_id, report_type, description)
      const { error } = await supabase.from('reports').insert({
        user_id: user.id,
        target_id: targetId,
        report_type: reason,
        description: (details || reason).trim(),
      });

      if (error) {
        console.error('❌ Error submitting report:', error);
        throw error;
      }

      console.log('✅ Report submitted successfully');
      Toast.show({
        type: 'success',
        text1: 'Report submitted',
        text2: 'Thank you for helping keep our community safe',
      });

      // Reset form and close
      setReason('');
      setDetails('');
      onClose();
    } catch (err: any) {
      console.error('❌ Error in handleSubmit:', err);
      Toast.show({
        type: 'error',
        text1: 'Failed to submit report',
        text2: err.message || 'Please try again',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Report {reportType === 'user' ? 'User' : 'Job'}</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Reason Selection */}
            <View style={styles.section}>
              <Text style={styles.label}>Reason *</Text>
              <View style={styles.reasonButtons}>
                {REPORT_REASONS.map((item) => (
                  <TouchableOpacity
                    key={item.value}
                    style={[
                      styles.reasonButton,
                      reason === item.value && styles.reasonButtonSelected,
                    ]}
                    onPress={() => setReason(item.value)}
                  >
                    <Text
                      style={[
                        styles.reasonButtonText,
                        reason === item.value && styles.reasonButtonTextSelected,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Optional Details */}
            <View style={styles.section}>
              <Text style={styles.label}>Additional details (optional)</Text>
              <TextInput
                style={styles.textArea}
                placeholder="Provide more information about this report..."
                placeholderTextColor="#94A3B8"
                value={details}
                onChangeText={setDetails}
                multiline
                numberOfLines={4}
                maxLength={500}
                editable={!submitting}
              />
              <Text style={styles.charCount}>{details.length}/500</Text>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.submitButtonText}>Submit Report</Text>
              )}
            </TouchableOpacity>

            {/* Info Text */}
            <Text style={styles.infoText}>
              Reports are reviewed by our team. False reports may result in account suspension.
            </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    color: '#64748B',
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 12,
  },
  reasonButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  reasonButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: 'white',
  },
  reasonButtonSelected: {
    backgroundColor: '#2A5EEA',
    borderColor: '#2A5EEA',
  },
  reasonButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#475569',
  },
  reasonButtonTextSelected: {
    color: 'white',
  },
  textArea: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: '#0F172A',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'right',
    marginTop: 4,
  },
  submitButton: {
    backgroundColor: '#2A5EEA',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  infoText: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
});
