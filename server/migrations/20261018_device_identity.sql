-- Additive migration: run on STAGING first; does not drop existing rows.
ALTER TABLE user_devices ADD COLUMN IF NOT EXISTS device_key_hash VARCHAR(64);
CREATE UNIQUE INDEX IF NOT EXISTS user_devices_user_key_unique
  ON user_devices (user_id, device_key_hash)
  WHERE device_key_hash IS NOT NULL;
-- Existing devices have NULL device_key_hash and require one-time admin approval
-- after the new client-generated key is registered. Back up the database first.
