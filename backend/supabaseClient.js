const { createClient } = require('@supabase/supabase-js');
require('dotenv').config()

const SUPABASE_URL = process.env.SUPABASE_url;
const SUPABASE_ANON_KEY = process.env.SUPABASE_anon;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

module.exports = { supabase };