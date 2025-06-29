const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

import { supabase } from '/Users/lucar/Desktop/AutoPilot/frontend/supabaseClient'

const app = express();
dotenv.config();
app.use(cors())
app.use(express.json());

// REGISTER ENDPOINT VIA supabase
async function signUp({ email, password, firstName, lastName, phone }) {
  // 1. Sign up with email and password
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    console.error('Signup error:', error.message);
    return;
  }

  const user = data.user;
  if (user) {
    // 2. Insert additional user info into your `users` table
    const { error: insertError } = await supabase
      .from('users')
      .insert({
        id: user.id,
        first_name: firstName,
        last_name: lastName,
        phone,
      });

    if (insertError) {
      console.error('Error inserting user info:', insertError.message);
    } else {
      console.log('User info saved successfully');
    }
  }
}

// LOGIN ENDPOINT VIA supabase
async function login({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error('Login error:', error.message);
  } else {
    console.log('Logged in user:', data.user);
  }
}



const PORT = process.env.PORT || 2300;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

