CREATE TABLE login_accounts (
  username text PRIMARY KEY CHECK (username = lower(username)),
  display_name text NOT NULL,
  player_id uuid NOT NULL REFERENCES players(id),
  supervisor boolean NOT NULL DEFAULT false,
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
