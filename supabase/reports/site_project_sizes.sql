-- Read-only: size of each site project's saved data (largest first) and
-- whether it carries inline (base64) images. Sizes only — no ids, names
-- or content (the deploy log is public).
select round(octet_length(data::text) / 1024.0) as data_kb,
       (data::text like '%data:image%') as inline_images,
       template,
       status,
       to_char(created_at, 'YYYY-MM-DD') as created
from public.site_projects
order by octet_length(data::text) desc
limit 15;
