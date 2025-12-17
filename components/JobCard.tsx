
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '@/styles/commonStyles';
import { Job } from '@/types';
import { StatusPill } from './StatusPill';

interface JobCardProps {
  job: Job;
  onPress: () => void;
}

export function JobCard({ job, onPress }: JobCardProps) {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      accessibilityLabel={`Job: ${job.title}`}
      accessibilityRole="button"
    >
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={1}>
          {job.title}
        </Text>
        <StatusPill status={job.status} />
      </View>

      <Text style={styles.price}>
        {job.price.currency} ${job.price.amount.toFixed(2)}
      </Text>

      <Text style={styles.description} numberOfLines={2}>
        {job.description}
      </Text>

      <View style={styles.footer}>
        <Text style={styles.campus}>{job.campus_slug}</Text>
        <Text style={styles.poster}>by @{job.posted_by.username}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginVertical: 8,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.08)',
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
    marginRight: 12,
  },
  price: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  campus: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  poster: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});
