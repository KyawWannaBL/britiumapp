# RLS Policy Patterns

These are examples of how to bind table access to permission codes + scope.

Use `app.has_permission('<CODE>')` as the primary guard, then add scope checks such as
`branch_id = (select branch_id from profiles where id = auth.uid())`.

Create table-specific policies in `supabase/migrations/*` once your table schemas are finalized.
