import { createClient } from "@/lib/clients/supabase/client";

export default async function signup(email: string, password: string) {
    const supabase = createClient();
    let { data, error } = await supabase.auth.signUp({
        email,
        password
    })
    
    return { data, error };
}
