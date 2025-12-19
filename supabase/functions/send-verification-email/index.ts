
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createHash } from 'https://deno.land/std@0.177.0/node/crypto.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  email: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { email }: RequestBody = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
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

    // Extract domain
    const domain = email.split('@')[1];

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find college by email domain
    const { data: colleges, error: collegeError } = await supabase
      .from('colleges')
      .select('*')
      .contains('email_domains', [domain]);

    if (collegeError || !colleges || colleges.length === 0) {
      console.error('College lookup error:', collegeError);
      return new Response(
        JSON.stringify({ 
          error: `The email domain "${domain}" is not from one of our supported schools. Only students from our included colleges can create accounts. Please use your official college .edu email address.` 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const college = colleges[0];

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Hash OTP
    const otpHash = createHash('sha256').update(otp).digest('hex');

    // Store OTP with 10 minute expiration
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // Delete any existing unverified OTPs for this email
    await supabase
      .from('email_verification_otps')
      .delete()
      .eq('email', email)
      .eq('verified', false);

    // Insert new OTP
    const { error: insertError } = await supabase
      .from('email_verification_otps')
      .insert({
        email,
        otp_hash: otpHash,
        college_id: college.id,
        expires_at: expiresAt,
      });

    if (insertError) {
      console.error('Error inserting OTP:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to generate verification code' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Send email using Resend
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    
    if (!resendApiKey) {
      console.error('RESEND_API_KEY is not configured!');
      console.log(`⚠️ OTP for ${email} (${college.name}): ${otp} (Resend not configured)`);
      return new Response(
        JSON.stringify({
          success: true,
          college: {
            id: college.id,
            name: college.name,
            slug: college.slug,
          },
          warning: 'Email service not configured. Check server logs for OTP.',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    try {
      console.log(`Attempting to send email via Resend to: ${email} (${college.name})`);
      
      const emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Dormate <team@verify.dormate.org>',
          to: email,
          subject: 'Your Dormate Verification Code',
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
              <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
                <div style="background: #ffffff; border-radius: 12px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                  <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #2A5EEA; margin: 0; font-size: 28px;">🎓 Dormate</h1>
                  </div>
                  
                  <h2 style="color: #0F172A; margin: 0 0 16px 0; font-size: 24px;">Welcome to Campus Jobs!</h2>
                  
                  <p style="color: #475569; font-size: 16px; line-height: 1.5; margin: 0 0 24px 0;">
                    Your verification code is:
                  </p>
                  
                  <div style="background: linear-gradient(135deg, #2A5EEA 0%, #1E40AF 100%); color: white; padding: 24px; text-align: center; border-radius: 8px; margin: 0 0 24px 0;">
                    <div style="font-size: 42px; font-weight: bold; letter-spacing: 12px; font-family: 'Courier New', monospace;">${otp}</div>
                  </div>
                  
                  <div style="background: #F1F5F9; border-left: 4px solid #2A5EEA; padding: 16px; border-radius: 4px; margin: 0 0 24px 0;">
                    <p style="color: #475569; font-size: 14px; margin: 0; line-height: 1.5;">
                      <strong style="color: #0F172A;">College:</strong> ${college.name}<br>
                      <strong style="color: #0F172A;">Expires in:</strong> 10 minutes
                    </p>
                  </div>
                  
                  <p style="color: #64748B; font-size: 14px; line-height: 1.5; margin: 0;">
                    If you didn't request this code, please ignore this email. This code will expire in 10 minutes.
                  </p>
                </div>
                
                <div style="text-align: center; margin-top: 24px;">
                  <p style="color: #94A3B8; font-size: 12px; margin: 0;">
                    © 2025 Campus Jobs. All rights reserved.
                  </p>
                </div>
              </div>
            </body>
            </html>
          `,
        }),
      });

      const responseText = await emailResponse.text();
      
      if (!emailResponse.ok) {
        console.error('Resend API error:', emailResponse.status, responseText);
        throw new Error(`Resend API error: ${responseText}`);
      }
      
      console.log(`✅ Email sent successfully via Resend to ${email} (${college.name}):`, responseText);
    } catch (emailError) {
      console.error('Error sending email via Resend:', emailError);
      console.log(`⚠️ Fallback - OTP for ${email} (${college.name}): ${otp}`);
      
      return new Response(
        JSON.stringify({
          success: true,
          college: {
            id: college.id,
            name: college.name,
            slug: college.slug,
          },
          warning: 'Email delivery failed. Check server logs for OTP.',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
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
