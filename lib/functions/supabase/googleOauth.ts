//C:\Users\giost\CascadeProjects\websites\24HourGPT\24HourGPT-Main\lib\functions\supabase\googleOauth.ts
import { createClient } from "@/lib/clients/supabase/client";

export default async function googleOauth() {
    const supabase = createClient();
    let { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google'
    })

    return { data, error };
}