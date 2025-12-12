import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://drdeqfffaeotfitnbqti.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyZGVxZmZmYWVvdGZpdG5icXRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0NjYxNzksImV4cCI6MjA4MTA0MjE3OX0.TSzWAaf_xcg2-cccNNfLa5HIL5CvZ-yjQtUvR7jmSWc";

export const supabase = createClient(supabaseUrl, supabaseKey);
