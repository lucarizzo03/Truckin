const { supabase } = require('./supabaseClient');
const { OpenAI } = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function syncLoads() {
  try {
    // 1. Fetch from your external loads API
    const loads = await fetch('http://localhost:2300/api/loads')
      .then(r => r.json())
      .then(res => res.loads);

    for (const load of loads) {
      // 2. Create embedding
      let embedding;
      try {
        const { data, error: embedError } = await openai.embeddings.create({
          model: "text-embedding-3-small",
          input: `${load.pickup} to ${load.delivery} $${load.pay} ${load.broker} ${load.loadType}`
        });
        if (embedError) {
          console.error(`Embedding error for load ${load.id}:`, embedError);
          continue;
        }
        embedding = data[0].embedding;
      } catch (err) {
        console.error(`OpenAI embedding failed for load ${load.id}:`, err);
        continue;
      }

      // 3. Upsert into Supabase
      const { error: upsertError } = await supabase.from('loads').upsert({
        id: crypto.randomUUID,
        load_id: load.id,
        content: `${load.pickup} to ${load.delivery} $${load.pay} ${load.broker} ${load.loadType}`,
        embedding,
        doc_type: 'load',
        metadata: load
      });
      if (upsertError) {
        console.error(`Supabase upsert error for load ${load.id}:`, upsertError);
      }
    }
    console.log('Loads synced!');
  } catch (error) {
    console.error('syncLoads failed:', error);
  }
}

syncLoads();