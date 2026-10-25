export default {
    url: ()=> window.lampa_settings.supabase_url || '',
    anonKey: ()=> window.lampa_settings.supabase_anon_key || ''
}
