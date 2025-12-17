
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createHash } from 'https://deno.land/std@0.177.0/node/crypto.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  email: string;
  otp: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { email, otp }: RequestBody = await req.json();

    if (!email || !otp) {
      return new Response(
        JSON.stringify({ error: 'Email and OTP are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate .edu email
    if (!email.endsWith('.edu')) {
      return new Response(
        JSON.stringify({ error: 'Only .edu email addresses are allowed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate OTP format (6 digits)
    if (!/^\d{6}$/.test(otp)) {
      return new Response(
        JSON.stringify({ error: 'Invalid OTP format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // TESTING MODE: Accept "000000" as a universal verification code
    if (otp === '000000') {
      console.log('Testing mode: Using universal verification code 000000');
      
      // Extract domain from email
      const emailDomain = email.split('@')[1];
      
      // Find college by email domain
      const { data: colleges, error: collegeError } = await supabase
        .from('colleges')
        .select('*')
        .contains('email_domains', [emailDomain]);
      
      if (collegeError || !colleges || colleges.length === 0) {
        console.error('College lookup error:', collegeError);
        return new Response(
          JSON.stringify({ 
            error: `The email domain "${emailDomain}" is not from one of our supported schools. Only students from our included colleges can create accounts. Please use your official college .edu email address.` 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const college = colleges[0];
      
      console.log(`Test mode verification for ${email} at ${college.name} (${college.slug})`);
      
      // Create or update a verified OTP record for this email
      const otpHash = createHash('sha256').update('000000').digest('hex');
      
      // Delete any existing OTP records for this email
      await supabase
        .from('email_verification_otps')
        .delete()
        .eq('email', email);
      
      // Insert new verified OTP record
      const { error: insertError } = await supabase
        .from('email_verification_otps')
        .insert({
          email,
          otp_hash: otpHash,
          college_id: college.id,
          verified: true,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
        });
      
      if (insertError) {
        console.error('Error inserting test OTP:', insertError);
        return new Response(
          JSON.stringify({ error: 'Failed to verify email' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      console.log(`✅ Test mode: Email verified for ${email} at ${college.name} (${college.slug})`);
      
      return new Response(
        JSON.stringify({
          success: true,
          email,
          college: {
            id: college.id,
            name: college.name,
            slug: college.slug,
          },
          testMode: true,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Normal verification flow
    // Hash the provided OTP
    const otpHash = createHash('sha256').update(otp).digest('hex');

    // Find matching OTP
    const { data: otpRecords, error: otpError } = await supabase
      .from('email_verification_otps')
      .select('*, colleges(*)')
      .eq('email', email)
      .eq('otp_hash', otpHash)
      .eq('verified', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1);

    if (otpError || !otpRecords || otpRecords.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired verification code' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const otpRecord = otpRecords[0];
    const college = otpRecord.colleges;

    if (!college) {
      return new Response(
        JSON.stringify({ error: 'College information not found. Please contact support.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Verifying OTP for ${email} at ${college.name} (${college.slug})`);

    // Mark OTP as verified
    await supabase
      .from('email_verification_otps')
      .update({ verified: true })
      .eq('id', otpRecord.id);

    console.log(`✅ OTP verified for ${email} at ${college.name} (${college.slug})`);

    return new Response(
      JSON.stringify({
        success: true,
        email,
        college: {
          id: college.id,
          name: college.name,
          slug: college.slug,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
