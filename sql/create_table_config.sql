CREATE SCHEMA IF NOT EXISTS pgpage;

CREATE TABLE pgpage.table_config (
  schema_name TEXT NOT NULL,
  table_name TEXT NOT NULL,
  date_column TEXT DEFAULT 'created_at',
  PRIMARY KEY (schema_name, table_name)
);

-- Seed the transcripts config
INSERT INTO pgpage.table_config (schema_name, table_name, date_column)
VALUES ('memdb', 'yasin_leanscale_transcripts', 'meeting_date');
