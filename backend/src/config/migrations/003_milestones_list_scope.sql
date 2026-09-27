ALTER TABLE milestones ADD COLUMN IF NOT EXISTS list_id INT REFERENCES lists(list_id) ON DELETE RESTRICT;

UPDATE milestones m
SET list_id = l.list_id
FROM (
    SELECT DISTINCT ON (space_id) list_id, space_id
    FROM lists
    WHERE deleted_at IS NULL
    ORDER BY space_id, position ASC, list_id ASC
) l
WHERE m.list_id IS NULL
  AND m.space_id = l.space_id;

CREATE INDEX IF NOT EXISTS idx_milestones_list_id ON milestones(list_id) WHERE deleted_at IS NULL;
