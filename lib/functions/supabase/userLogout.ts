
import { createClient } from "@/lib/clients/supabase/client";

export default async function userLogout() {
    const supabase = createClient();
    let { error } = await supabase.auth.signOut()

    return { error }
}       