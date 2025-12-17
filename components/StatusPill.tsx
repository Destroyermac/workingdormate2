
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@/styles/commonStyles';
import { JobStatus } from '@/types';

interface StatusPillProps {
  status: JobStatus;
}

export function StatusPill({ status }: StatusPillProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'open':
        return { bg: '#DBEAFE', text: '#1E40AF' };
      case 'in_progress':
        return { bg: '#FEF3C7', text: '#92400E' };
      case 'completed':
        return { bg: '#D1FAE5', text: '#065F46' };
      case 'cancelled':
        return { bg: '#FEE2E2', text: '#991B1B' };
      default:
        return { bg: colors.highlight, text: colors.primary };
    }
  };

  const statusColors = getStatusColor();
  const statusText = status.replace('_', ' ').toUpperCase();

  return (
    <View style={[styles.pill, { backgroundColor: statusColors.bg }]}>
      <Text style={[styles.text, { color: statusColors.text }]}>{statusText}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
});
