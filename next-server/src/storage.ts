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
 await c.query('COMMIT');
 }catch(e){await c.query('ROLLBACK');throw e}finally{c.release()}
}
