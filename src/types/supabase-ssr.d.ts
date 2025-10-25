declare module '@supabase/ssr' {
  import type { SupabaseClientOptions } from '@supabase/supabase-js'
  import type { SupabaseClient } from '@supabase/supabase-js'

  export function createServerClient<
    Database = any,
    SchemaName extends string & keyof Database = 'public'
  >(
    supabaseUrl: string,
    supabaseKey: string,
    options: {
      cookies: {
        get: (name: string) => string | undefined
        set: (name: string, value: string, options?: any) => void
        remove: (name: string, options?: any) => void
      }
    } & SupabaseClientOptions<SchemaName>
  ): SupabaseClient<Database, SchemaName>
}


