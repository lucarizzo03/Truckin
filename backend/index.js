const express = require('express');
const cors = require('cors');
require('dotenv').config()
const { supabase } = require('./supabaseClient');

const app = express();

app.use(cors())
app.use(express.json());

// REGISTER ENDPOINT VIA supabase
app.post('/api/signup', async (req, res) => {
  const { email, password, firstName, lastName, phone } = req.body;

  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    console.error('Signup error:', error.message);
    return res.status(400).json({ error: error.message });
  }

  const user = data.user;
  if (user) {
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
      return res.status(400).json({ error: insertError.message });
    }

    return res.status(200).json({ message: 'Signup successful', user });
  }
});

// LOGIN ENDPOINT VIA supabase
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    console.error('Login error:', error.message);
    return res.status(401).json({ error: error.message });
  }

  return res.status(200).json({ message: 'Login successful', user: data.user });
});



const PORT = process.env.PORT || 2300;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

