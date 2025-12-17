
import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import { StreamChat, Channel as StreamChannel } from 'stream-chat';
import { useAuth } from './AuthContext';
import { supabaseApi } from '@/services/supabaseApi';

interface StreamChatContextType {
  client: StreamChat | null;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  connectUser: () => Promise<void>;
  disconnectUser: () => Promise<void>;
  createChannel: (jobId: string, posterUserId: string, workerUserId: string) => Promise<StreamChannel | null>;
}

const StreamChatContext = createContext<StreamChatContextType | undefined>(undefined);

const STREAM_API_KEY = 'y275c7ynkdve';

export function StreamChatProvider({ children }: { children: React.ReactNode }) {
  console.log('💬 StreamChatProvider initializing... Platform:', Platform.OS);
  
  const { user, isAuthenticated } = useAuth();
  const [client, setClient] = useState<StreamChat | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isConnectingRef = useRef(false);
  const connectionAttemptedRef = useRef(false);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Web platform guard - Stream Chat has limited web support
  const isWebPlatform = Platform.OS === 'web';

  const connectUser = useCallback(async () => {
    try {
      // Skip Stream Chat on web for now
      if (isWebPlatform) {
        console.log('💬 Skipping Stream Chat on web platform');
        setIsLoading(false);
        setError('Chat is not available on web preview. Use mobile app for full chat functionality.');
        return;
      }

      if (!user || !isAuthenticated) {
        console.log('💬 No user or not authenticated, skipping Stream connection');
        return;
      }

      if (isConnectingRef.current) {
        console.log('💬 Already connecting to Stream, skipping...');
        return;
      }

      if (client && isConnected) {
        console.log('💬 Already connected to Stream');
        return;
      }

      isConnectingRef.current = true;
      setIsLoading(true);
      setError(null);

      try {
        console.log('💬 Connecting to Stream Chat...');
        console.log('💬 User info:', { id: user.id, username: user.username, email: user.email });
        
        const tokenData = await supabaseApi.getStreamToken();
        
        if (!tokenData || !tokenData.token) {
          throw new Error('Failed to get Stream token - no token returned');
        }

        console.log('💬 Got Stream token, connecting user...');

        const chatClient = StreamChat.getInstance(STREAM_API_KEY);

        await chatClient.connectUser(
          {
            id: user.id,
            name: user.username,
            email: user.email,
          },
          tokenData.token
        );

        setClient(chatClient);
        setIsConnected(true);
        connectionAttemptedRef.current = true;
        console.log('✅ Connected to Stream Chat successfully');
      } catch (err: any) {
        console.error('❌ Error connecting to Stream:', err);
        console.error('❌ Error details:', {
          message: err?.message,
          code: err?.code,
          statusCode: err?.statusCode,
        });
        const errorMessage = err instanceof Error ? err.message : 'Failed to connect to chat';
        setError(errorMessage);
        connectionAttemptedRef.current = true;
        
        // Don't retry automatically - let the user manually retry
        // This prevents infinite retry loops that could block the UI
        console.log('💬 Stream connection failed. User can retry manually from chat screen.');
      } finally {
        setIsLoading(false);
        isConnectingRef.current = false;
      }
    } catch (error: any) {
      console.error('❌ Fatal error in connectUser:', error);
      setIsLoading(false);
      isConnectingRef.current = false;
    }
  }, [user, isAuthenticated, client, isConnected, isWebPlatform]);

  const disconnectUser = useCallback(async () => {
    try {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      
      if (client && !isWebPlatform) {
        try {
          await client.disconnectUser();
          setClient(null);
          setIsConnected(false);
          connectionAttemptedRef.current = false;
          console.log('💬 Disconnected from Stream Chat');
        } catch (err) {
          console.error('❌ Error disconnecting from Stream:', err);
        }
      }
    } catch (error) {
      console.error('❌ Fatal error in disconnectUser:', error);
    }
  }, [client, isWebPlatform]);

  const createChannel = useCallback(async (
    jobId: string,
    posterUserId: string,
    workerUserId: string
  ): Promise<StreamChannel | null> => {
    try {
      if (isWebPlatform) {
        console.log('💬 Channel creation not available on web');
        return null;
      }

      if (!client || !isConnected) {
        console.error('❌ Stream client not connected');
        return null;
      }

      try {
        const channelId = `job-${jobId}`;
        const channel = client.channel('messaging', channelId, {
          members: [posterUserId, workerUserId],
          created_by_id: posterUserId,
          job_id: jobId,
        });

        await channel.watch();
        console.log('✅ Channel created:', channelId);
        return channel;
      } catch (err) {
        console.error('❌ Error creating channel:', err);
        return null;
      }
    } catch (error) {
      console.error('❌ Fatal error in createChannel:', error);
      return null;
    }
  }, [client, isConnected, isWebPlatform]);

  // Auto-connect when user is authenticated (skip on web)
  useEffect(() => {
    try {
      if (isWebPlatform) {
        console.log('💬 Skipping auto-connect on web platform');
        setIsLoading(false);
        return;
      }

      if (isAuthenticated && user && !isConnected && !isLoading && !isConnectingRef.current && !connectionAttemptedRef.current) {
        // Delay connection slightly to ensure auth is fully settled
        const timer = setTimeout(() => {
          console.log('💬 Auto-connecting to Stream Chat...');
          connectUser().catch(err => {
            console.error('❌ Error in auto-connect:', err);
          });
        }, 1500); // Increased delay to ensure RLS policies are ready
        return () => clearTimeout(timer);
      }
    } catch (error) {
      console.error('❌ Error in auto-connect effect:', error);
    }
  }, [isAuthenticated, user, isConnected, isLoading, connectUser, isWebPlatform]);

  // Auto-disconnect when user logs out
  useEffect(() => {
    try {
      if (!isAuthenticated && isConnected && !isWebPlatform) {
        console.log('💬 User logged out, disconnecting from Stream...');
        disconnectUser().catch(err => {
          console.error('❌ Error in auto-disconnect:', err);
        });
      }
    } catch (error) {
      console.error('❌ Error in auto-disconnect effect:', error);
    }
  }, [isAuthenticated, isConnected, disconnectUser, isWebPlatform]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      try {
        if (retryTimeoutRef.current) {
          clearTimeout(retryTimeoutRef.current);
        }
        if (client && !isWebPlatform) {
          client.disconnectUser().catch(console.error);
        }
      } catch (error) {
        console.error('❌ Error in cleanup:', error);
      }
    };
  }, [client, isWebPlatform]);

  return (
    <StreamChatContext.Provider
      value={{
        client,
        isConnected,
        isLoading,
        error,
        connectUser,
        disconnectUser,
        createChannel,
      }}
    >
      {children}
    </StreamChatContext.Provider>
  );
}

export function useStreamChat() {
  const context = useContext(StreamChatContext);
  if (context === undefined) {
    throw new Error('useStreamChat must be used within a StreamChatProvider');
  }
  return context;
}
