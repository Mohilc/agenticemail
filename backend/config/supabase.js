const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn(`
⚠️  WARNING: Supabase URL or Service Key is missing!
Make sure to add the following to your backend/.env file:
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_service_role_key
  `);
}

const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseKey || 'placeholder-key');

module.exports = { supabase };
