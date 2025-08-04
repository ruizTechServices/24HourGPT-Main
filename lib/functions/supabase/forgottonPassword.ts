
import { createClient } from "@/lib/clients/supabase/client";

export default async function forgottonPassword(email: string) {
    const supabase = createClient();
    let { data, error } = await supabase.auth.resetPasswordForEmail(email)

    return { data, error };
}
