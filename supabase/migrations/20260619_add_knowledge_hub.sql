-- Knowledge Hub: add prompts (text[]) and links (jsonb) columns to videos
alter table videos
  add column if not exists prompts text[],
  add column if not exists links   jsonb;
