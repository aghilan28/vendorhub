-- Ensure role helper functions exist before any policies referencing them
create or replace function public.current_user_has_role(required_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = auth.uid()
      and role::text = any(required_roles)
      and deleted_at is null
  );
$$;

create or replace function public.current_user_is_vendor_member(target_vendor_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.vendor_members
    where vendor_id = target_vendor_id
      and user_id = auth.uid()
      and deleted_at is null
  );
$$;
