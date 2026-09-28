-- focusBoard — esquema Neon (Postgres). Idempotente: puedes correrlo cuantas veces quieras.
-- Aplicar con: npm run db:migrate

create table if not exists users (
  id            text primary key,
  passcode_hash text not null,
  created_at    timestamptz not null default now()
);

create table if not exists types (
  id         text primary key,
  user_id    text not null references users(id) on delete cascade,
  nombre     text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists goals (
  id               text primary key,
  user_id          text not null references users(id) on delete cascade,
  nombre           text not null,
  tipo_id          text,
  seguimiento      text not null,
  componentes      text[] not null default '{}',
  valor            integer not null default 0,
  marcas           text[] not null default '{}',
  ultimo_movimiento text,
  imagen_key       text,
  created_at       timestamptz not null,
  en_muro          boolean not null default false,
  updated_at       timestamptz not null,
  deleted_at       timestamptz
);

create table if not exists notes (
  user_id    text primary key references users(id) on delete cascade,
  texto      text,
  updated_at timestamptz not null default now()
);

create table if not exists images (
  key          text primary key,
  user_id      text not null references users(id) on delete cascade,
  content_type text not null,
  bytes        integer not null,
  created_at   timestamptz not null default now()
);

create index if not exists goals_user_updated_idx on goals (user_id, updated_at);
create index if not exists types_user_updated_idx on types (user_id, updated_at);
