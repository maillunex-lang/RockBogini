import {Pool} from 'pg';
import {createClient} from 'redis';
export async function openStorage(){
 const pg=new Pool({host:process.env.PGHOST,user:'rockbogini_next',database:'rockbogini_next',password:process.env.NEXT_DB_PASSWORD,connectionTimeoutMillis:3000,max:5});
 const redis=createClient({url:process.env.REDIS_URL,socket:{connectTimeout:3000,reconnectStrategy:false}});
 redis.on('error',()=>{});
 try{await pg.query('SELECT 1');await redis.connect();await redis.ping()}catch(e){await pg.end();if(redis.isOpen)await redis.destroy();throw e}
 return {pg,redis,async close(){await pg.end();if(redis.isOpen)await redis.quit()}};
}
export type Storage=Awaited<ReturnType<typeof openStorage>>;
export async function migrate(s:Storage){
 const c=await s.pg.connect();try{await c.query('BEGIN');await c.query('SELECT pg_advisory_xact_lock(780051)');
 await c.query('CREATE TABLE IF NOT EXISTS schema_migrations(version integer PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
 await c.query('INSERT INTO schema_migrations(version) VALUES(1) ON CONFLICT DO NOTHING');await c.query(`CREATE TABLE IF NOT EXISTS accounts(id uuid PRIMARY KEY, email text UNIQUE, password_hash text, created_at timestamptz NOT NULL DEFAULT now(), CHECK ((email IS NULL) = (password_hash IS NULL)))`);
 await c.query(`CREATE TABLE IF NOT EXISTS sessions(token_hash text PRIMARY KEY, account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE, expires_at timestamptz NOT NULL)`);
 await c.query('INSERT INTO schema_migrations(version) VALUES(2) ON CONFLICT DO NOTHING');
 await c.query(`CREATE TABLE IF NOT EXISTS recovery_codes(account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE, code_hash text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(account_id,code_hash))`);
 await c.query('INSERT INTO schema_migrations(version) VALUES(3) ON CONFLICT DO NOTHING');
 await c.query(`CREATE TABLE IF NOT EXISTS player_profiles(account_id uuid PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE, nickname text NOT NULL, level integer NOT NULL DEFAULT 1, avatar integer NOT NULL DEFAULT 11303, frame integer NOT NULL DEFAULT 3101, power integer NOT NULL DEFAULT 1372, stage integer NOT NULL DEFAULT 100101, rename_count integer NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now())`);
 await c.query(`CREATE TABLE IF NOT EXISTS player_items(account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE, item_id integer NOT NULL, amount bigint NOT NULL CHECK(amount>=0), PRIMARY KEY(account_id,item_id))`);
 await c.query('INSERT INTO schema_migrations(version) VALUES(4) ON CONFLICT DO NOTHING');
 await c.query(`CREATE TABLE IF NOT EXISTS hero_collections(account_id uuid PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE)`);
 await c.query(`CREATE TABLE IF NOT EXISTS player_heroes(account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE, sid integer NOT NULL, hero_id integer NOT NULL, level integer NOT NULL CHECK(level>0), star integer NOT NULL CHECK(star>0), power integer NOT NULL CHECK(power>=0), locked boolean NOT NULL, state jsonb NOT NULL, PRIMARY KEY(account_id,sid))`);
 await c.query('INSERT INTO schema_migrations(version) VALUES(5) ON CONFLICT DO NOTHING');
 await c.query(`CREATE TABLE IF NOT EXISTS player_formations(account_id uuid PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE, formation_type integer NOT NULL DEFAULT 101, hero_ids integer[] NOT NULL DEFAULT ARRAY[1001,1002,0,0,0,0], CHECK(cardinality(hero_ids)=6))`);
 await c.query('INSERT INTO schema_migrations(version) VALUES(6) ON CONFLICT DO NOTHING');
 await c.query(`CREATE TABLE IF NOT EXISTS studio_draft_versions(model text NOT NULL,kind text NOT NULL CHECK(kind IN ('hero','skill')),slot integer NOT NULL CHECK(slot BETWEEN 0 AND 1000),revision integer NOT NULL CHECK(revision>0),payload jsonb NOT NULL CHECK(jsonb_typeof(payload)='object'),actor text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),restored_from integer,PRIMARY KEY(model,kind,slot,revision))`);
 await c.query('INSERT INTO schema_migrations(version) VALUES(7) ON CONFLICT DO NOTHING');
 await c.query(`CREATE TABLE IF NOT EXISTS studio_admins(account_id uuid PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,created_at timestamptz NOT NULL DEFAULT now())`);
 await c.query('INSERT INTO schema_migrations(version) VALUES(8) ON CONFLICT DO NOTHING');
 await c.query(`CREATE TABLE IF NOT EXISTS campaign_battles(id uuid PRIMARY KEY,account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,map_id integer NOT NULL,report jsonb NOT NULL,settlement jsonb,created_at timestamptz NOT NULL DEFAULT now())`);
 await c.query(`CREATE TABLE IF NOT EXISTS campaign_pending(account_id uuid PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,battle_id uuid NOT NULL REFERENCES campaign_battles(id) ON DELETE CASCADE)`);
 await c.query(`CREATE TABLE IF NOT EXISTS campaign_clears(account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,map_id integer NOT NULL,PRIMARY KEY(account_id,map_id))`);
 await c.query('INSERT INTO schema_migrations(version) VALUES(9) ON CONFLICT DO NOTHING');
 await c.query(`CREATE TABLE IF NOT EXISTS campaign_idle(account_id uuid PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,received_at timestamptz NOT NULL,settled_at timestamptz NOT NULL,points jsonb NOT NULL DEFAULT '{}',rewards jsonb NOT NULL DEFAULT '{}')`);
 await c.query(`CREATE TABLE IF NOT EXISTS player_modules(account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,module_id integer NOT NULL,PRIMARY KEY(account_id,module_id))`);
 await c.query('INSERT INTO schema_migrations(version) VALUES(10) ON CONFLICT DO NOTHING');
 await c.query(`CREATE TABLE IF NOT EXISTS player_guide_groups(account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,group_id integer NOT NULL,completed_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(account_id,group_id))`);
 await c.query('INSERT INTO schema_migrations(version) VALUES(11) ON CONFLICT DO NOTHING');
 await c.query(`CREATE TABLE IF NOT EXISTS player_equipment(
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  sid integer NOT NULL,
  item_id integer NOT NULL,
  owner_sid integer NOT NULL DEFAULT 0,
  xp integer NOT NULL DEFAULT 0 CHECK(xp>=0),
  PRIMARY KEY(account_id,sid)
 )`);
 await c.query('CREATE INDEX IF NOT EXISTS player_equipment_owner ON player_equipment(account_id,owner_sid)');
 await c.query('INSERT INTO schema_migrations(version) VALUES(12) ON CONFLICT DO NOTHING');
 await c.query(`CREATE TABLE IF NOT EXISTS player_holy_equipment(
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  sid integer NOT NULL,
  item_id integer NOT NULL,
  star integer NOT NULL DEFAULT 0 CHECK(star>=0),
  level integer NOT NULL DEFAULT 0 CHECK(level>=0),
  xp integer NOT NULL DEFAULT 0 CHECK(xp>=0),
  stage integer NOT NULL DEFAULT 0 CHECK(stage>=0),
  step integer NOT NULL DEFAULT 0 CHECK(step>=0),
  owner_sid integer NOT NULL DEFAULT 0,
  PRIMARY KEY(account_id,sid)
 )`);
 await c.query('CREATE INDEX IF NOT EXISTS player_holy_equipment_owner ON player_holy_equipment(account_id,owner_sid)');
 await c.query('INSERT INTO schema_migrations(version) VALUES(13) ON CONFLICT DO NOTHING');
 await c.query('ALTER TABLE player_holy_equipment ADD COLUMN IF NOT EXISTS blessing1 jsonb');
 await c.query('ALTER TABLE player_holy_equipment ADD COLUMN IF NOT EXISTS blessing2 jsonb');
 await c.query('INSERT INTO schema_migrations(version) VALUES(14) ON CONFLICT DO NOTHING');
 await c.query('ALTER TABLE player_holy_equipment ADD COLUMN IF NOT EXISTS gallery_slot integer NOT NULL DEFAULT 0');
 await c.query(`CREATE TABLE IF NOT EXISTS player_holy_gallery(
  account_id uuid PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
  levels integer[4] NOT NULL DEFAULT ARRAY[0,0,0,0]::integer[],
  CHECK(cardinality(levels)=4)
 )`);
 await c.query('INSERT INTO schema_migrations(version) VALUES(15) ON CONFLICT DO NOTHING');
 await c.query(`CREATE TABLE IF NOT EXISTS player_summon(
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  summon_type integer NOT NULL,
  lib_count jsonb NOT NULL DEFAULT '{}',
  lib_status jsonb NOT NULL DEFAULT '{}',
  free_count integer NOT NULL DEFAULT 0,
  today_count integer NOT NULL DEFAULT 0,
  total_count integer NOT NULL DEFAULT 0,
  PRIMARY KEY(account_id,summon_type)
 )`);
 await c.query('INSERT INTO schema_migrations(version) VALUES(16) ON CONFLICT DO NOTHING');
 await c.query(`CREATE TABLE IF NOT EXISTS player_displace(
  account_id uuid PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
  sid integer NOT NULL,
  old_hero_id integer NOT NULL,
  new_hero_id integer NOT NULL,
  prophet_type integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
 )`);
 await c.query('INSERT INTO schema_migrations(version) VALUES(17) ON CONFLICT DO NOTHING');
 await c.query(`CREATE TABLE IF NOT EXISTS player_personality_displace(
  account_id uuid PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
  old_item_id integer NOT NULL,
  new_item_id integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
 )`);
 await c.query('INSERT INTO schema_migrations(version) VALUES(18) ON CONFLICT DO NOTHING');
 await c.query(`ALTER TABLE campaign_idle
  ADD COLUMN IF NOT EXISTS quick_points jsonb NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS daily_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS daily_quick_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS daily_day date NOT NULL DEFAULT CURRENT_DATE`);
 await c.query('INSERT INTO schema_migrations(version) VALUES(19) ON CONFLICT DO NOTHING');
 await c.query(`ALTER TABLE player_profiles
  ADD COLUMN IF NOT EXISTS adventure_reward_index integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS online_reward_index integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_login_at timestamptz NOT NULL DEFAULT now()`);
 await c.query('INSERT INTO schema_migrations(version) VALUES(20) ON CONFLICT DO NOTHING');
 await c.query('ALTER TABLE player_profiles ADD COLUMN IF NOT EXISTS vip_level integer NOT NULL DEFAULT 0');
 await c.query('ALTER TABLE player_profiles ADD COLUMN IF NOT EXISTS vip_gift_mask integer NOT NULL DEFAULT 0');
 await c.query(`CREATE TABLE IF NOT EXISTS player_shop(
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  shop_id integer NOT NULL,
  goods jsonb NOT NULL DEFAULT '{}',
  free_refresh_count integer NOT NULL DEFAULT 0,
  today_refresh_count integer NOT NULL DEFAULT 0,
  last_refresh_at timestamptz NOT NULL DEFAULT now(),
  daily_day date NOT NULL DEFAULT CURRENT_DATE,
  PRIMARY KEY(account_id,shop_id)
 )`);
 await c.query('INSERT INTO schema_migrations(version) VALUES(21) ON CONFLICT DO NOTHING');
 await c.query(`CREATE TABLE IF NOT EXISTS player_tasks(
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  task_id integer NOT NULL,
  progress integer NOT NULL DEFAULT 0,
  completed boolean NOT NULL DEFAULT false,
  PRIMARY KEY(account_id,task_id)
 )`);
 await c.query(`CREATE TABLE IF NOT EXISTS player_task_meta(
  account_id uuid PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
  daily_day date NOT NULL DEFAULT CURRENT_DATE,
  weekly_day date NOT NULL,
  points jsonb NOT NULL DEFAULT '{}'
 )`);
 await c.query('INSERT INTO schema_migrations(version) VALUES(22) ON CONFLICT DO NOTHING');
 await c.query(`CREATE TABLE IF NOT EXISTS pioneering_winners(
  achievement_id integer PRIMARY KEY,
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  won_at timestamptz NOT NULL DEFAULT now()
 )`);
 await c.query(`CREATE TABLE IF NOT EXISTS pioneering_claims(
  achievement_id integer NOT NULL REFERENCES pioneering_winners(achievement_id),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  claimed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(achievement_id,account_id)
 )`);
 await c.query('ALTER TABLE player_profiles ALTER COLUMN power TYPE bigint');
 await c.query('INSERT INTO schema_migrations(version) VALUES(23) ON CONFLICT DO NOTHING');
 await c.query(`CREATE TABLE IF NOT EXISTS tower_progress(
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  tower_type integer NOT NULL,
  map_index integer NOT NULL DEFAULT 0 CHECK(map_index>=0),
  extra_reward_index integer NOT NULL DEFAULT 0 CHECK(extra_reward_index>=0),
  daily_reward_index integer NOT NULL DEFAULT 0 CHECK(daily_reward_index>=0),
  daily_claimed boolean NOT NULL DEFAULT false,
  day date NOT NULL DEFAULT CURRENT_DATE,
  battle_count integer NOT NULL DEFAULT 0 CHECK(battle_count>=0),
  extra_count integer NOT NULL DEFAULT 0 CHECK(extra_count>=0),
  PRIMARY KEY(account_id,tower_type)
 )`);
 await c.query(`CREATE TABLE IF NOT EXISTS tower_battles(
  id uuid PRIMARY KEY,
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  tower_type integer NOT NULL,
  map_index integer NOT NULL,
  map_id integer NOT NULL,
  report jsonb NOT NULL,
  settlement jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
 )`);
 await c.query(`CREATE TABLE IF NOT EXISTS tower_pending(
  account_id uuid PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
  battle_id uuid NOT NULL REFERENCES tower_battles(id) ON DELETE CASCADE
 )`);
 await c.query('INSERT INTO schema_migrations(version) VALUES(24) ON CONFLICT DO NOTHING');
 await c.query(`CREATE TABLE IF NOT EXISTS daily_instance_progress(
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  instance_type integer NOT NULL CHECK(instance_type BETWEEN 1 AND 5),
  cleared_map_id integer NOT NULL DEFAULT 0,
  day date NOT NULL DEFAULT CURRENT_DATE,
  free_battle_count integer NOT NULL DEFAULT 0 CHECK(free_battle_count>=0),
  paid_battle_count integer NOT NULL DEFAULT 0 CHECK(paid_battle_count>=0),
  PRIMARY KEY(account_id,instance_type)
 )`);
 await c.query(`CREATE TABLE IF NOT EXISTS daily_instance_battles(
  id uuid PRIMARY KEY,
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  instance_type integer NOT NULL CHECK(instance_type BETWEEN 1 AND 5),
  map_id integer NOT NULL,
  report jsonb NOT NULL,
  settlement jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
 )`);
 await c.query(`CREATE TABLE IF NOT EXISTS daily_instance_pending(
  account_id uuid PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
  battle_id uuid NOT NULL REFERENCES daily_instance_battles(id) ON DELETE CASCADE
 )`);
 await c.query('INSERT INTO schema_migrations(version) VALUES(25) ON CONFLICT DO NOTHING');
 await c.query(`CREATE TABLE IF NOT EXISTS abyss_progress(
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  abyss_type integer NOT NULL CHECK(abyss_type IN (1,2)),
  map_index integer NOT NULL DEFAULT 0 CHECK(map_index>=0),
  reward_index integer NOT NULL DEFAULT 0 CHECK(reward_index BETWEEN 0 AND 12),
  completed_index integer NOT NULL DEFAULT 0 CHECK(completed_index>=0),
  in_battle boolean NOT NULL DEFAULT false,
  hp jsonb NOT NULL DEFAULT '{}',
  buff_ids jsonb NOT NULL DEFAULT '[]',
  options jsonb NOT NULL DEFAULT '[]',
  point_rewards jsonb NOT NULL DEFAULT '[]',
  PRIMARY KEY(account_id,abyss_type)
 )`);
 await c.query(`CREATE TABLE IF NOT EXISTS abyss_battles(
  id uuid PRIMARY KEY,
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  abyss_type integer NOT NULL,
  map_index integer NOT NULL,
  wave_index integer NOT NULL,
  map_id integer NOT NULL,
  report jsonb NOT NULL,
  settlement jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
 )`);
 await c.query(`CREATE TABLE IF NOT EXISTS abyss_pending(
  account_id uuid PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
  battle_id uuid NOT NULL REFERENCES abyss_battles(id) ON DELETE CASCADE
 )`);
 await c.query('INSERT INTO schema_migrations(version) VALUES(26) ON CONFLICT DO NOTHING');
 await c.query(`CREATE TABLE IF NOT EXISTS secret_exploration(
  account_id uuid PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
  floor integer NOT NULL DEFAULT 1 CHECK(floor BETWEEN 1 AND 5),
  view_index integer NOT NULL DEFAULT 0,
  power_level_id integer NOT NULL DEFAULT 10001,
  reset_at timestamptz NOT NULL DEFAULT now(),
  cells jsonb NOT NULL DEFAULT '[]',
  props jsonb NOT NULL DEFAULT '[[0,0],[0,0],[0,0]]',
  hp jsonb NOT NULL DEFAULT '{}',
  reward_state jsonb NOT NULL DEFAULT '[0,0,0,0]',
  resurrection_count integer NOT NULL DEFAULT 0
 )`);
 await c.query(`CREATE TABLE IF NOT EXISTS secret_battles(
  id uuid PRIMARY KEY,
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  cell_index integer NOT NULL,
  map_id integer NOT NULL,
  monster_type integer NOT NULL,
  report jsonb NOT NULL,
  settlement jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
 )`);
 await c.query(`CREATE TABLE IF NOT EXISTS secret_pending(
  account_id uuid PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
  battle_id uuid NOT NULL REFERENCES secret_battles(id) ON DELETE CASCADE
 )`);
 await c.query('INSERT INTO schema_migrations(version) VALUES(27) ON CONFLICT DO NOTHING');
 await c.query(`CREATE TABLE IF NOT EXISTS world_boss_progress(
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  event_id integer NOT NULL,
  day date NOT NULL DEFAULT CURRENT_DATE,
  attempts integer NOT NULL DEFAULT 0 CHECK(attempts>=0),
  best_damage bigint NOT NULL DEFAULT 0 CHECK(best_damage>=0),
  total_damage bigint NOT NULL DEFAULT 0 CHECK(total_damage>=0),
  PRIMARY KEY(account_id,event_id)
 )`);
 await c.query('CREATE INDEX IF NOT EXISTS world_boss_rank ON world_boss_progress(event_id,best_damage DESC)');
 await c.query(`CREATE TABLE IF NOT EXISTS world_boss_battles(
  id uuid PRIMARY KEY,
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  event_id integer NOT NULL,
  map_id integer NOT NULL,
  report jsonb NOT NULL,
  settlement jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
 )`);
 await c.query(`CREATE TABLE IF NOT EXISTS world_boss_pending(
  account_id uuid PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
  battle_id uuid NOT NULL REFERENCES world_boss_battles(id) ON DELETE CASCADE
 )`);
 await c.query('INSERT INTO schema_migrations(version) VALUES(28) ON CONFLICT DO NOTHING');
 await c.query(`ALTER TABLE player_formations
  ADD COLUMN IF NOT EXISTS single_hero_ids integer[] NOT NULL DEFAULT ARRAY[0,0,0]::integer[]`);
 await c.query(`ALTER TABLE player_formations DROP CONSTRAINT IF EXISTS player_formations_single_check`);
 await c.query(`ALTER TABLE player_formations ADD CONSTRAINT player_formations_single_check
  CHECK(cardinality(single_hero_ids)=3 AND
   single_hero_ids[1]>=0 AND single_hero_ids[2]>=0 AND single_hero_ids[3]>=0 AND
   (single_hero_ids[1]=0 OR single_hero_ids[1]<>single_hero_ids[2]) AND
   (single_hero_ids[1]=0 OR single_hero_ids[1]<>single_hero_ids[3]) AND
   (single_hero_ids[2]=0 OR single_hero_ids[2]<>single_hero_ids[3]))`);
 await c.query('INSERT INTO schema_migrations(version) VALUES(29) ON CONFLICT DO NOTHING');
 await c.query(`ALTER TABLE player_formations
  ADD COLUMN IF NOT EXISTS abyss_team_hero_ids integer[] NOT NULL DEFAULT ARRAY[0,0,0,0,0,0]::integer[],
  ADD COLUMN IF NOT EXISTS abyss_team_formation_type integer NOT NULL DEFAULT 101`);
 await c.query(`ALTER TABLE player_formations DROP CONSTRAINT IF EXISTS player_formations_abyss_team_check`);
 await c.query(`ALTER TABLE player_formations ADD CONSTRAINT player_formations_abyss_team_check
  CHECK(cardinality(abyss_team_hero_ids)=6 AND
    abyss_team_formation_type IN (101,102,103,104,105,106) AND
    array_position(abyss_team_hero_ids,NULL) IS NULL AND
    abyss_team_hero_ids[1]>=0 AND abyss_team_hero_ids[2]>=0 AND abyss_team_hero_ids[3]>=0 AND
    abyss_team_hero_ids[4]>=0 AND abyss_team_hero_ids[5]>=0 AND abyss_team_hero_ids[6]>=0 AND
    (abyss_team_hero_ids[1]=0 OR abyss_team_hero_ids[2]=0 OR abyss_team_hero_ids[1]<>abyss_team_hero_ids[2]) AND
    (abyss_team_hero_ids[1]=0 OR abyss_team_hero_ids[3]=0 OR abyss_team_hero_ids[1]<>abyss_team_hero_ids[3]) AND
    (abyss_team_hero_ids[1]=0 OR abyss_team_hero_ids[4]=0 OR abyss_team_hero_ids[1]<>abyss_team_hero_ids[4]) AND
    (abyss_team_hero_ids[1]=0 OR abyss_team_hero_ids[5]=0 OR abyss_team_hero_ids[1]<>abyss_team_hero_ids[5]) AND
    (abyss_team_hero_ids[1]=0 OR abyss_team_hero_ids[6]=0 OR abyss_team_hero_ids[1]<>abyss_team_hero_ids[6]) AND
    (abyss_team_hero_ids[2]=0 OR abyss_team_hero_ids[3]=0 OR abyss_team_hero_ids[2]<>abyss_team_hero_ids[3]) AND
    (abyss_team_hero_ids[2]=0 OR abyss_team_hero_ids[4]=0 OR abyss_team_hero_ids[2]<>abyss_team_hero_ids[4]) AND
    (abyss_team_hero_ids[2]=0 OR abyss_team_hero_ids[5]=0 OR abyss_team_hero_ids[2]<>abyss_team_hero_ids[5]) AND
    (abyss_team_hero_ids[2]=0 OR abyss_team_hero_ids[6]=0 OR abyss_team_hero_ids[2]<>abyss_team_hero_ids[6]) AND
    (abyss_team_hero_ids[3]=0 OR abyss_team_hero_ids[4]=0 OR abyss_team_hero_ids[3]<>abyss_team_hero_ids[4]) AND
    (abyss_team_hero_ids[3]=0 OR abyss_team_hero_ids[5]=0 OR abyss_team_hero_ids[3]<>abyss_team_hero_ids[5]) AND
    (abyss_team_hero_ids[3]=0 OR abyss_team_hero_ids[6]=0 OR abyss_team_hero_ids[3]<>abyss_team_hero_ids[6]) AND
    (abyss_team_hero_ids[4]=0 OR abyss_team_hero_ids[5]=0 OR abyss_team_hero_ids[4]<>abyss_team_hero_ids[5]) AND
    (abyss_team_hero_ids[4]=0 OR abyss_team_hero_ids[6]=0 OR abyss_team_hero_ids[4]<>abyss_team_hero_ids[6]) AND
    (abyss_team_hero_ids[5]=0 OR abyss_team_hero_ids[6]=0 OR abyss_team_hero_ids[5]<>abyss_team_hero_ids[6]))`);
 await c.query('INSERT INTO schema_migrations(version) VALUES(30) ON CONFLICT DO NOTHING');
 await c.query('COMMIT');
 }catch(e){await c.query('ROLLBACK');throw e}finally{c.release()}
}
