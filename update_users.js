import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: './server/.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const run = async () => {
    // 1. Daj każdemu 99999 credits, i zmien subskrypcje (jesli kolumna istnieje) na 'enterprise'
    const { data: cols, error: e1 } = await supabase.from('profiles').select('*').limit(1);
    
    // We update every profile
    const updates = { credits: 999999, usage: 0 };
    if (cols && cols.length > 0 && 'subscription_tier' in cols[0]) {
        updates.subscription_tier = 'enterprise';
    }
    
    console.log("Updating to:", updates);
    const { data, error } = await supabase.from('profiles').update(updates).neq('id', '00000000-0000-0000-0000-000000000000');
    console.log("Result:", error ? error : "Success!");
}
run();
