import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Use service role key to bypass RLS for server-side file management
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export const BUCKET_NAME = 'workspaces';

/**
 * Ensures that the required Supabase Storage bucket exists.
 */
export async function ensureBucket() {
  try {
    const { data: buckets, error } = await supabaseAdmin.storage.listBuckets();
    if (error) {
      console.error('Error listing buckets:', error);
      return;
    }
    
    if (!buckets.some(b => b.name === BUCKET_NAME)) {
      console.log(`Creating bucket: ${BUCKET_NAME}`);
      const { error: createError } = await supabaseAdmin.storage.createBucket(BUCKET_NAME, {
        public: false, // Private by default, accessible via signed URLs
      });
      if (createError) {
        console.error('Failed to create bucket:', createError);
      }
    }
  } catch (err) {
    console.error('Bucket check failed:', err);
  }
}
