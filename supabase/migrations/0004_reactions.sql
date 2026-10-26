-- Like / dislike per title. One vote per user and title; voting the other way switches it,
-- voting the same way again removes it. Rows are never read directly: counts come from
-- reaction_counts() and votes go through set_reaction(), so nobody can see who voted what.
create table reactions (
  user_id uuid not null references auth.users on delete cascade,
  media text not null check (media in ('movie', 'tv')),
  card_id text not null,
  vote text not null check (vote in ('like', 'dislike')),
  updated_at timestamptz not null default now(),
  primary key (user_id, media, card_id)
);

alter table reactions enable row level security;

-- No policies on purpose: with RLS on and no policy, direct table access is denied.

create function reaction_counts(p_media text, p_card_id text) returns jsonb
  language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'likes', count(*) filter (where vote = 'like'),
    'dislikes', count(*) filter (where vote = 'dislike'),
    'mine', (select vote from reactions where user_id = auth.uid() and media = p_media and card_id = p_card_id)
  )
  from reactions
  where media = p_media and card_id = p_card_id;
$$;

create function set_reaction(p_media text, p_card_id text, p_vote text) returns jsonb
  language plpgsql security definer set search_path = public as $$
declare
  current_vote text;
begin
  if auth.uid() is null then
    raise exception 'not_signed_in' using errcode = '42501';
  end if;

  select vote into current_vote
    from reactions
   where user_id = auth.uid() and media = p_media and card_id = p_card_id;

  -- the same vote again removes it; the other vote switches it
  if current_vote = p_vote then
    delete from reactions
     where user_id = auth.uid() and media = p_media and card_id = p_card_id;
  else
    insert into reactions (user_id, media, card_id, vote)
    values (auth.uid(), p_media, p_card_id, p_vote)
    on conflict (user_id, media, card_id)
    do update set vote = excluded.vote, updated_at = now();
  end if;

  return reaction_counts(p_media, p_card_id);
end $$;

grant execute on function reaction_counts(text, text) to anon, authenticated;
grant execute on function set_reaction(text, text, text) to authenticated;
