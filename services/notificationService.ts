
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from '@/app/integrations/supabase/client';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export class NotificationService {
  async registerForPushNotifications(): Promise<string | null> {
    try {
      if (!Device.isDevice) {
        console.log('Push notifications only work on physical devices');
        return null;
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return null;
      }

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#2A5EEA',
        });
      }

      // Get push token without project ID for development
      const tokenData = await Notifications.getExpoPushTokenAsync();

      const token = tokenData.data;
      await this.storePushToken(token);
      return token;
    } catch (error) {
      console.error('Error registering for push notifications:', error);
      return null;
    }
  }

  async storePushToken(token: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('No user found when storing push token');
        return;
      }

      // First, try to find existing token
      const { data: existingToken } = await supabase
        .from('push_tokens')
        .select('id')
        .eq('user_id', user.id)
        .eq('expo_push_token', token)
        .single();

      if (existingToken) {
        // Update existing token
        const { error } = await supabase
          .from('push_tokens')
          .update({
            platform: Platform.OS,
            device_id: Device.modelName || 'unknown',
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingToken.id);

        if (error) {
          console.error('Error updating push token:', error);
        } else {
          console.log('Push token updated successfully');
        }
      } else {
        // Insert new token
        const { error } = await supabase
          .from('push_tokens')
          .insert({
            user_id: user.id,
            expo_push_token: token,
            platform: Platform.OS,
            device_id: Device.modelName || 'unknown',
          });

        if (error) {
          console.error('Error inserting push token:', error);
        } else {
          console.log('Push token stored successfully');
        }
      }
    } catch (error) {
      console.error('Error in storePushToken:', error);
    }
  }

  async removePushToken(token: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('push_tokens')
        .delete()
        .eq('user_id', user.id)
        .eq('expo_push_token', token);

      if (error) {
        console.error('Error removing push token:', error);
      }
    } catch (error) {
      console.error('Error in removePushToken:', error);
    }
  }

  async sendPushNotification(params: {
    userIds?: string[];
    collegeId?: string;
    title: string;
    body: string;
    data?: Record<string, any>;
  }): Promise<void> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('No session found when sending push notification');
        return;
      }

      const { data, error } = await supabase.functions.invoke('send-push-notification', {
        body: params,
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error('Error sending push notification:', error);
      } else {
        console.log('Push notification sent:', data);
      }
    } catch (error) {
      console.error('Error in sendPushNotification:', error);
    }
  }

  addNotificationReceivedListener(
    callback: (notification: Notifications.Notification) => void
  ): Notifications.EventSubscription {
    return Notifications.addNotificationReceivedListener(callback);
  }

  addNotificationResponseReceivedListener(
    callback: (response: Notifications.NotificationResponse) => void
  ): Notifications.EventSubscription {
    return Notifications.addNotificationResponseReceivedListener(callback);
  }

  async getLastNotificationResponse(): Promise<Notifications.NotificationResponse | null> {
    try {
      return await Notifications.getLastNotificationResponseAsync();
    } catch (error) {
      console.error('Error getting last notification response:', error);
      return null;
    }
  }

  async scheduleLocalNotification(
    title: string,
    body: string,
    data?: Record<string, any>,
    trigger?: Notifications.NotificationTriggerInput
  ): Promise<string | null> {
    try {
      return await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: data || {},
          sound: 'default',
        },
        trigger: trigger || null,
      });
    } catch (error) {
      console.error('Error scheduling local notification:', error);
      return null;
    }
  }
}

export const notificationService = new NotificationService();
