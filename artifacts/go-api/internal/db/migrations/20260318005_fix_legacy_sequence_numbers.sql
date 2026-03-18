-- +goose Up
-- +goose StatementBegin

-- ---------------------------------------------------------------------------
-- Fix legacy experiment_records with sequence_number = 0.
--
-- Background:
--   Before the inheritance-chain feature stabilised (2026-03-15 to 2026-03-18),
--   the server wrote the DEFAULT value of 0 into sequence_number for newly
--   created records.  These records are historical dev/test artefacts and are
--   completely isolated from the inheritance chain.
--
-- Selection conditions (intentionally strict to avoid touching any live data):
--   1. sequence_number = 0        — only the old DEFAULT
--   2. is_deleted = false         — soft-deleted rows need no repair
--   3. confirmation_state = 'draft'   — never confirmed
--   4. confirmed_at IS NULL           — no confirm timestamp
--   5. confirmed_modules IS NULL      — no confirmed snapshot
--   6. derived_from_record_id IS NULL — not a child in any inheritance chain
--
-- Renumbering strategy:
--   A. Pure-legacy SciNotes (all records are seq=0):
--      Assign 1, 2, 3 … ordered by created_at ASC within the SciNote.
--
--   B. Mixed SciNotes (coexist with seq>0 records):
--      Only one such SciNote exists in this dataset (64d3be67 "inse热电性能研究")
--      with a single legacy record alongside seq=2, seq=3.
--      Assign seq=1 (safe because seq=1 is unoccupied in that SciNote).
--      The existing seq=2 and seq=3 records are untouched.
--
-- Safety: no downstream record has derived_from_record_id pointing to any of
-- these legacy records (verified by query before authoring this migration).
-- Therefore no derived_from_record_seq values need adjustment.
-- ---------------------------------------------------------------------------

WITH legacy AS (
    SELECT
        id,
        sci_note_id,
        created_at
    FROM experiment_records
    WHERE sequence_number           = 0
      AND is_deleted                = false
      AND confirmation_state        = 'draft'
      AND confirmed_at              IS NULL
      AND confirmed_modules         IS NULL
      AND derived_from_record_id    IS NULL
),
has_new_records AS (
    -- SciNotes that already have at least one properly-numbered record (seq > 0)
    SELECT DISTINCT sci_note_id
    FROM experiment_records
    WHERE sequence_number > 0
),
numbered AS (
    SELECT
        l.id,
        CASE
            -- Pure-legacy SciNote: assign ordinal by creation time
            WHEN l.sci_note_id NOT IN (SELECT sci_note_id FROM has_new_records)
                THEN ROW_NUMBER() OVER (
                         PARTITION BY l.sci_note_id
                         ORDER BY l.created_at ASC
                     )
            -- Mixed SciNote: assign 1 (seq=1 is always unoccupied in this case
            -- because NextSequenceNumber at the time of the first new record
            -- counted the legacy record, making the first new record seq=2).
            ELSE 1
        END AS new_seq
    FROM legacy l
)
UPDATE experiment_records er
SET    sequence_number = n.new_seq
FROM   numbered n
WHERE  er.id = n.id;

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

-- Revert: restore sequence_number = 0 for the exact records this migration touched.
-- IDs are hardcoded for a deterministic, safe rollback.
UPDATE experiment_records
SET    sequence_number = 0
WHERE  id IN (
    '7b74c845-147a-43ef-b815-a130f01c749a',  -- 石墨烯
    '83f93130-3775-4087-8b93-ef141a4e1781',  -- inse
    '66c908df-ca4b-4f2c-9ae8-748f810d1ba1',  -- 实验笔记1
    'a7491131-11fd-46db-b614-a575bdfa9fdf',  -- inse热电性能研究 (mixed scinote)
    '35a7d05a-480c-4d2c-afcb-77c2168efc05',  -- 基于纳米粒子的催化性能研究
    '5c980d72-b15e-4f01-9bd6-b5aa959a6143',  -- 基于纳米粒子的催化性能研究
    'ae26fecc-cb80-48de-beea-2bfe1ce33e3a',  -- 晶体
    '73fde2a1-3075-4257-a73d-956ace9fde0c',  -- 晶体
    'c8de0fac-6785-46c1-a5d7-09c1680fa47e',  -- 晶体
    '5fa215c4-596b-48cf-b331-9547b4b59573',  -- 已更新标题
    '9cb50dec-3255-4dc2-b082-812aab93dc75',  -- test0001
    'a80cfef7-f312-4d82-a8c1-6ab35789ab39',  -- test0001
    '882cc55f-9fbc-4e3a-97b8-9176912a1aec',  -- test0001
    '56c76b5c-4784-4fed-af1f-6e3e266c9153',  -- 基因测序
    '7b930e3b-f3b1-4036-adc9-f3b23aaa77c1',  -- 基因测序
    '303e0a9c-408e-4d66-b174-6ac9005bb474'   -- 基因测序
);

-- +goose StatementEnd
