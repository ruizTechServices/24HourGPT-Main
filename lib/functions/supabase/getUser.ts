import { createClient } from "@/lib/clients/supabase/client";
                
export default async function getUser() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser()

    return { data: user }
}
