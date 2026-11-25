begin;

revoke all on function public.is_administrator() from public;
grant execute on function public.is_administrator() to anon, authenticated;

revoke all on function public.is_organization_member(uuid) from public;
grant execute on function public.is_organization_member(uuid) to anon, authenticated;

commit;
