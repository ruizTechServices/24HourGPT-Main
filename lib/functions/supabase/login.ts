
import { createClient } from "@/lib/clients/supabase/client";

export default async function login(email: string, password: string) {
    const supabase = createClient();
    let { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    })

    return { data, error };
}