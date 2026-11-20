create schema if not exists storage;
create table if not exists storage.buckets(id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
create table if not exists storage.objects(id uuid default gen_random_uuid(), bucket_id text, name text, owner uuid);
create or replace function storage.foldername(n text) returns text[] language sql as $$ select string_to_array(n,'/') $$;
create publication supabase_realtime;
