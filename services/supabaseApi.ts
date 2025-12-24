
import { supabase } from '@/app/integrations/supabase/client';
import { User, Job, Application } from '@/types';

export class SupabaseApiService {
  async sendVerificationEmail(email: string) {
    const { data, error } = await supabase.functions.invoke('send-verification-email', {
      body: { email },
    });
    
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    
    return data;
  }

  async verifyOTP(email: string, otp: string) {
    const { data, error } = await supabase.functions.invoke('verify-otp', {
      body: { email, otp },
    });
    
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    
    return data;
  }

  async createAccount(email: string, username: string, password: string) {
    const { data, error } = await supabase.functions.invoke('create-account', {
      body: { email, username, password },
    });
    
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    
    return data;
  }

  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) throw error;
    return data;
  }

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  async getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    
    if (!user) return null;

    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) throw profileError;

    return {
      id: profile.id,
      username: profile.username,
      email: profile.email,
      campus_slug: profile.college_slug,
      payoutsEnabled: profile.payouts_enabled,
    };
  }

  async createStripeConnectAccount() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const { data, error } = await supabase.functions.invoke('stripe-create-connect-account', {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });
    
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    
    return data;
  }

  async checkStripeAccountStatus() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const { data, error } = await supabase.functions.invoke('stripe-check-account-status', {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });
    
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    
    return data;
  }

  async createPayment(jobId: string) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    console.log('💳 Creating payment for job:', jobId);

    try {
      const { data, error } = await supabase.functions.invoke('stripe-create-payment', {
        body: { jobId },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error('❌ Edge Function error:', error);
        
        // Extract error message from response body FIRST (Edge Function response)
        const errorMessage = error.context?.body?.error 
          || error.data?.error 
          || error.message 
          || error.context?.message 
          || 'Failed to create payment';
        
        throw new Error(errorMessage);
      }

      if (data?.error) {
        console.error('❌ Payment error from data:', data.error);
        throw new Error(data.error);
      }

      console.log('✅ Payment created successfully:', data);
      return data;
    } catch (err: any) {
      console.error('❌ Error in createPayment:', err);
      // Throw user-friendly Error, not generic FunctionsHttpError
      throw new Error(err.message || 'Failed to create payment');
    }
  }

  // Legacy compatibility layer: record receipt in payments_v2 (source of truth)
  async recordPaymentReceipt(jobId: string, paymentIntentId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    console.log('📝 Recording payment receipt for job:', jobId);

    try {
      // Fetch job info to derive amounts and parties
      const { data: job, error: jobError } = await supabase
        .from('jobs')
        .select('id, title, price_amount, price_currency, posted_by_user_id, assigned_to_user_id')
        .eq('id', jobId)
        .single();

      if (jobError || !job) {
        console.error('❌ Failed to load job for receipt:', jobError);
        throw jobError || new Error('Job not found');
      }

      const totalCents = Math.round(Number(job.price_amount || 0) * 100);
      const platformFeePercent = 10.0;
      const stripeFeePercent = 2.9;
      const platformFeeCents = Math.round(totalCents * (platformFeePercent / 100));
      const stripeFeeCents = Math.round(totalCents * 0.029 + 30); // 2.9% + $0.30
      const netCents = totalCents - platformFeeCents - stripeFeeCents;
      const currency = (job.price_currency || 'USD').toUpperCase();

      const payload = {
        payer_user_id: job.posted_by_user_id || user.id,
        payee_user_id: job.assigned_to_user_id || null,
        job_id: job.id,
        job_title: job.title || null,
        job_price_cents: totalCents,
        stripe_fee_cents: stripeFeeCents,
        platform_fee_cents: platformFeeCents,
        stripe_fee_percent: stripeFeePercent,
        platform_fee_percent: platformFeePercent,
        total_paid_cents: totalCents,
        net_amount_cents: netCents,
        currency,
        stripe_payment_intent_id: paymentIntentId,
        status: 'completed',
      };

      // Try to update existing payment; if none, insert new
      const { data: existing, error: selectError } = await supabase
        .from('payments_v2')
        .select('id')
        .eq('stripe_payment_intent_id', paymentIntentId)
        .limit(1)
        .single();

      if (selectError && selectError.code !== 'PGRST116') {
        console.warn('⚠️ Could not check existing payment_v2 row:', selectError);
      }

      if (existing?.id) {
        const { error: updateError } = await supabase
          .from('payments_v2')
          .update(payload)
          .eq('id', existing.id);

        if (updateError) {
          console.error('❌ Failed to update payment_v2 record:', updateError);
          throw updateError;
        }
      } else {
        const { error: insertError } = await supabase
          .from('payments_v2')
          .insert(payload);

        if (insertError) {
          console.error('❌ Failed to insert payment_v2 record:', insertError);
          throw insertError;
        }
      }

      console.log('✅ Payment receipt recorded successfully');
    } catch (err: any) {
      console.error('❌ Error in recordPaymentReceipt:', err);
      throw err;
    }
  }

  async getStreamToken() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const { data, error } = await supabase.functions.invoke('stream-get-token', {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });
    
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    
    return data;
  }

  async createStreamChannel(jobId: string, posterUserId: string, workerUserId: string) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const { data, error } = await supabase.functions.invoke('stream-create-channel', {
      body: { jobId, posterUserId, workerUserId },
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });
    
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    
    return data;
  }

  async sendPushNotification(params: {
    userIds?: string[];
    collegeId?: string;
    title: string;
    body: string;
    data?: Record<string, any>;
  }) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const { data, error } = await supabase.functions.invoke('send-push-notification', {
      body: params,
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });
    
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    
    return data;
  }

  async storePushToken(token: string, platform: string, deviceId?: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('push_tokens')
      .upsert({
        user_id: user.id,
        expo_push_token: token,
        platform,
        device_id: deviceId,
      }, {
        onConflict: 'user_id,expo_push_token',
      });

    if (error) throw error;
  }

  async removePushToken(token: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('push_tokens')
      .delete()
      .eq('user_id', user.id)
      .eq('expo_push_token', token);

    if (error) throw error;
  }

  async getJobs(filters?: { search?: string; status?: string }) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: profile } = await supabase
      .from('users')
      .select('college_id')
      .eq('id', user.id)
      .single();

    if (!profile) throw new Error('User profile not found');

    let query = supabase
      .from('jobs')
      .select(`
        *,
        posted_by:users!posted_by_user_id(id, username, email),
        assigned_to:users!assigned_to_user_id(id, username, email),
        colleges!jobs_college_id_fkey(slug)
      `)
      .eq('college_id', profile.college_id)
      .order('created_at', { ascending: false });

    if (filters?.search) {
      query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }

    const { data, error } = await query;
    if (error) throw error;

    return data.map(job => ({
      id: job.id,
      title: job.title,
      description: job.description,
      price: {
        amount: Number(job.price_amount),
        currency: job.price_currency,
      },
      status: job.status,
      campus_slug: job.colleges?.slug || '',
      posted_by: job.posted_by,
      assigned_to: job.assigned_to,
      created_at: job.created_at,
      updated_at: job.updated_at,
    })) as Job[];
  }

  async getJob(jobId: string) {
    const { data, error } = await supabase
      .from('jobs')
      .select(`
        *,
        posted_by:users!posted_by_user_id(id, username, email),
        assigned_to:users!assigned_to_user_id(id, username, email),
        colleges!jobs_college_id_fkey(slug)
      `)
      .eq('id', jobId)
      .single();

    if (error) throw error;

    return {
      id: data.id,
      title: data.title,
      description: data.description,
      price: {
        amount: Number(data.price_amount),
        currency: data.price_currency,
      },
      status: data.status,
      campus_slug: data.colleges?.slug || '',
      posted_by: data.posted_by,
      assigned_to: data.assigned_to,
      created_at: data.created_at,
      updated_at: data.updated_at,
    } as Job;
  }

  async createJob(title: string, description: string, priceAmount: number) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: profile } = await supabase
      .from('users')
      .select('college_id')
      .eq('id', user.id)
      .single();

    if (!profile) throw new Error('User profile not found');

    const { data, error } = await supabase
      .from('jobs')
      .insert({
        college_id: profile.college_id,
        title,
        description,
        price_amount: priceAmount,
        price_currency: 'USD',
        posted_by_user_id: user.id,
      })
      .select(`
        *,
        posted_by:users!posted_by_user_id(id, username, email)
      `)
      .single();

    if (error) throw error;

    try {
      await this.sendPushNotification({
        collegeId: profile.college_id,
        title: 'New Job Posted',
        body: `${title} - $${priceAmount}`,
        data: { jobId: data.id, screen: '/(tabs)/job-detail' },
      });
    } catch (notifError) {
      console.error('Error sending push notification:', notifError);
    }

    return {
      id: data.id,
      title: data.title,
      description: data.description,
      price: {
        amount: Number(data.price_amount),
        currency: data.price_currency,
      },
      status: data.status,
      campus_slug: '',
      posted_by: data.posted_by,
      created_at: data.created_at,
      updated_at: data.updated_at,
    } as Job;
  }

  async updateJobStatus(jobId: string, status: string) {
    const { error } = await supabase
      .from('jobs')
      .update({ status })
      .eq('id', jobId);

    if (error) throw error;
  }

  async getApplications(jobId: string) {
    const { data, error } = await supabase
      .from('applications')
      .select(`
        *,
        applicant:users!applicant_user_id(id, username, email)
      `)
      .eq('job_id', jobId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data.map(app => ({
      id: app.id,
      job_id: app.job_id,
      user_id: app.applicant.id,
      username: app.applicant.username,
      email: app.applicant.email,
      message: app.message,
      status: app.status,
      created_at: app.created_at,
    })) as Application[];
  }

  async applyToJob(jobId: string, message: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: job } = await supabase
      .from('jobs')
      .select('posted_by_user_id')
      .eq('id', jobId)
      .single();

    if (!job) throw new Error('Job not found');

    const { data, error } = await supabase
      .from('applications')
      .insert({
        job_id: jobId,
        applicant_user_id: user.id,
        message,
      })
      .select()
      .single();

    if (error) throw error;

    try {
      await this.createStreamChannel(jobId, job.posted_by_user_id, user.id);
    } catch (channelError) {
      console.error('Error creating Stream channel:', channelError);
    }

    try {
      await this.sendPushNotification({
        userIds: [job.posted_by_user_id],
        title: 'New Application',
        body: `Someone applied to your job!`,
        data: { jobId, screen: '/(tabs)/job-detail' },
      });
    } catch (notifError) {
      console.error('Error sending push notification:', notifError);
    }

    return data;
  }

  async acceptApplication(applicationId: string, jobId: string) {
    const { data: application, error: appError } = await supabase
      .from('applications')
      .select('applicant_user_id')
      .eq('id', applicationId)
      .single();

    if (appError) throw appError;

    const { error: updateAppError } = await supabase
      .from('applications')
      .update({ status: 'accepted' })
      .eq('id', applicationId);

    if (updateAppError) throw updateAppError;

    const { error: updateJobError } = await supabase
      .from('jobs')
      .update({ 
        assigned_to_user_id: application.applicant_user_id,
        status: 'in_progress',
      })
      .eq('id', jobId);

    if (updateJobError) throw updateJobError;

    await supabase
      .from('applications')
      .update({ status: 'rejected' })
      .eq('job_id', jobId)
      .neq('id', applicationId);
  }

  async reportIssue(type: 'job' | 'user', id: string, reason: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('reports')
      .insert({
        reporter_user_id: user.id,
        reported_type: type,
        reported_id: id,
        reason,
      });

    if (error) throw error;
  }

  async blockUser(userId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('blocked_users')
      .insert({
        blocker_user_id: user.id,
        blocked_user_id: userId,
      });

    if (error) throw error;
  }

  async unblockUser(userId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('blocked_users')
      .delete()
      .eq('blocker_user_id', user.id)
      .eq('blocked_user_id', userId);

    if (error) throw error;
  }

  async getBlockedUsers() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('blocked_users')
      .select(`
        id,
        blocked_user_id,
        created_at,
        blocked_user:users!blocked_user_id(id, username, email)
      `)
      .eq('blocker_user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  async isUserBlocked(userId: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    // Check if either user has blocked the other (mutual blocking)
    const { data, error } = await supabase
      .from('blocked_users')
      .select('id')
      .or(`and(blocker_user_id.eq.${user.id},blocked_user_id.eq.${userId}),and(blocker_user_id.eq.${userId},blocked_user_id.eq.${user.id})`)
      .limit(1);

    if (error) {
      console.error('Error checking block status:', error);
      return false;
    }

    return (data?.length || 0) > 0;
  }

  async getUserProfile(userId: string) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;

    return {
      id: data.id,
      username: data.username,
      email: data.email,
      campus_slug: data.college_slug,
      payoutsEnabled: data.payouts_enabled,
    };
  }

  async getUserJobs(userId: string) {
    const { data: postedJobs, error: postedError } = await supabase
      .from('jobs')
      .select(`
        *,
        posted_by:users!posted_by_user_id(id, username, email),
        assigned_to:users!assigned_to_user_id(id, username, email),
        colleges!jobs_college_id_fkey(slug)
      `)
      .eq('posted_by_user_id', userId)
      .order('created_at', { ascending: false });

    if (postedError) throw postedError;

    const { data: acceptedJobs, error: acceptedError } = await supabase
      .from('jobs')
      .select(`
        *,
        posted_by:users!posted_by_user_id(id, username, email),
        assigned_to:users!assigned_to_user_id(id, username, email),
        colleges!jobs_college_id_fkey(slug)
      `)
      .eq('assigned_to_user_id', userId)
      .order('created_at', { ascending: false });

    if (acceptedError) throw acceptedError;

    const mapJob = (job: any): Job => ({
      id: job.id,
      title: job.title,
      description: job.description,
      price: {
        amount: Number(job.price_amount),
        currency: job.price_currency,
      },
      status: job.status,
      campus_slug: job.colleges?.slug || '',
      posted_by: job.posted_by,
      assigned_to: job.assigned_to,
      created_at: job.created_at,
      updated_at: job.updated_at,
    });

    return {
      posted: postedJobs.map(mapJob),
      accepted: acceptedJobs.map(mapJob),
    };
  }

  async getPayments() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    console.log('💳 Fetching payments for user:', user.id);

    try {
      // Get payments where user is payer (payments_v2)
      const { data: sentPayments, error: sentError } = await supabase
        .from('payments_v2')
        .select(`
          id,
          job_id,
          user_id,
          payer_user_id,
          payee_user_id,
          amount_total,
          stripe_fee,
          platform_fee,
          stripe_fee_percent,
          platform_fee_percent,
          net_amount_cents,
          total_paid_cents,
          currency,
          status,
          timestamp,
          created_at,
          stripe_payment_intent_id,
          job:jobs(id, title)
        `)
        .eq('payer_user_id', user.id)
        .order('created_at', { ascending: false });

      // Handle RLS errors gracefully - don't treat empty results as errors
      if (sentError && sentError.code !== 'PGRST116') {
        // PGRST116 is "no rows returned" which is fine
        if (sentError.code === 'PGRST301' || sentError.message?.includes('permission')) {
          console.log('⚠️ Permission error on sent payments, returning empty');
        } else {
          console.error('❌ Error fetching sent payments:', sentError);
          throw sentError;
        }
      }

      // Get payments where user is payee (payments_v2)
      const { data: receivedPayments, error: receivedError } = await supabase
        .from('payments_v2')
        .select(`
          id,
          job_id,
          user_id,
          payer_user_id,
          payee_user_id,
          amount_total,
          stripe_fee,
          platform_fee,
          stripe_fee_percent,
          platform_fee_percent,
          net_amount_cents,
          total_paid_cents,
          currency,
          status,
          timestamp,
          created_at,
          stripe_payment_intent_id,
          job:jobs(id, title)
        `)
        .eq('payee_user_id', user.id)
        .order('created_at', { ascending: false });

      // Handle RLS errors gracefully
      if (receivedError && receivedError.code !== 'PGRST116') {
        if (receivedError.code === 'PGRST301' || receivedError.message?.includes('permission')) {
          console.log('⚠️ Permission error on received payments, returning empty');
        } else {
          console.error('❌ Error fetching received payments:', receivedError);
          throw receivedError;
        }
      }

      console.log('✅ Payments fetched (v2):', {
        sent: sentPayments?.length || 0,
        received: receivedPayments?.length || 0,
      });

      // Don't treat empty results as errors - sent || [] is fine
      return {
        sent: sentPayments || [],
        received: receivedPayments || [],
      };
    } catch (err: any) {
      console.error('❌ Error in getPayments:', err);
      
      // Handle RLS errors gracefully
      if (err.code === 'PGRST301' || err.message?.includes('permission')) {
        console.log('⚠️ Permission error, returning empty results');
        return { sent: [], received: [] };
      }
      
      throw err;
    }
  }

  async getPayment(paymentId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    console.log('💳 Fetching payment:', paymentId);

    try {
      const { data: payment, error } = await supabase
        .from('payments_v2')
        .select(`
          id,
          job_id,
          user_id,
          payer_user_id,
          payee_user_id,
          amount_total,
          stripe_fee,
          platform_fee,
          stripe_fee_percent,
          platform_fee_percent,
          net_amount_cents,
          total_paid_cents,
          currency,
          status,
          timestamp,
          created_at,
          stripe_payment_intent_id,
          job:jobs(id, title, description),
          payer:users!payer_user_id(id, username, email),
          payee:users!payee_user_id(id, username, email)
        `)
        .eq('id', paymentId)
        .single();

      if (error) {
        console.error('❌ Error fetching payment:', error);
        
        // Handle RLS/permission errors gracefully
        if (error.code === 'PGRST301' || error.message?.includes('permission')) {
          throw new Error('You do not have permission to view this payment');
        }
        
        if (error.code === 'PGRST116') {
          throw new Error('Payment not found');
        }
        
        throw error;
      }

      // Validate user is payer or payee before showing error
      if (payment.payer_user_id !== user.id && payment.payee_user_id !== user.id) {
        throw new Error('You do not have permission to view this payment');
      }

      console.log('✅ Payment fetched:', payment.id);
      return payment;
    } catch (err: any) {
      console.error('❌ Error in getPayment:', err);
      throw err;
    }
  }
}

export const supabaseApi = new SupabaseApiService();
