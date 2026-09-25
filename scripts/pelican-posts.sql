with pelican_tag as (
  select id from blog_tag where tag = 'pelican-riding-a-bicycle'
)
select 'entry' as type, e.slug, e.created, e.title,
  (select json_group_array(tag) from (select g.tag from blog_entry_tags x join blog_tag g on g.id = x.tag_id where x.entry_id = e.id order by g.id)) as tags
from blog_entry e
where e.id in (select entry_id from blog_entry_tags where tag_id = (select id from pelican_tag)) and not coalesce(e.is_draft, 0)
union all
select 'blogmark', b.slug, b.created, coalesce(nullif(b.title, ''), b.link_title),
  (select json_group_array(tag) from (select g.tag from blog_blogmark_tags x join blog_tag g on g.id = x.tag_id where x.blogmark_id = b.id order by g.id))
from blog_blogmark b
where b.id in (select blogmark_id from blog_blogmark_tags where tag_id = (select id from pelican_tag)) and not coalesce(b.is_draft, 0)
union all
select 'beat', b.slug, b.created, b.title,
  (select json_group_array(tag) from (select g.tag from blog_beat_tags x join blog_tag g on g.id = x.tag_id where x.beat_id = b.id order by g.id))
from blog_beat b
where b.id in (select beat_id from blog_beat_tags where tag_id = (select id from pelican_tag)) and not coalesce(b.is_draft, 0)
union all
select 'note', n.slug, n.created, n.title,
  (select json_group_array(tag) from (select g.tag from blog_note_tags x join blog_tag g on g.id = x.tag_id where x.note_id = n.id order by g.id))
from blog_note n
where n.id in (select note_id from blog_note_tags where tag_id = (select id from pelican_tag)) and not coalesce(n.is_draft, 0)
union all
select 'quotation', q.slug, q.created, q.source,
  (select json_group_array(tag) from (select g.tag from blog_quotation_tags x join blog_tag g on g.id = x.tag_id where x.quotation_id = q.id order by g.id))
from blog_quotation q
where q.id in (select quotation_id from blog_quotation_tags where tag_id = (select id from pelican_tag)) and not coalesce(q.is_draft, 0)
order by created desc
