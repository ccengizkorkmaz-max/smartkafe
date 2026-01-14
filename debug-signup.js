
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ebiphrvopclroliglqsw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImViaXBocnZvcGNscm9saWdscXN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyMTA3MDAsImV4cCI6MjA4Mzc4NjcwMH0.REQwxXTiAhK0JKLFj2Gwoa95N1E41_gC_JaDAIIM9S8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSignup() {
    const email = `smartkafe.test.${Date.now()}.redirect@gmail.com`;
    const password = 'password123';

    console.log(`Attempting signup with: ${email}`);

    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            emailRedirectTo: 'http://localhost:5000/admin/login'
        }
    });

    if (error) {
        console.error('Signup Error:', JSON.stringify(error, null, 2));
    } else {
        console.log('Signup Success:', data);
    }
}

testSignup();
