-- Nguyên nhân và cách đã sửa của mỗi sự cố: nguồn để AI giải thích lịch sử máy khi quét QR.
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS root_cause TEXT;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS resolution TEXT;

-- Kỹ thuật viên phải ghi khi báo sửa xong (IN_PROGRESS → WAITING_VERIFY hoặc → RESOLVED)
UPDATE workflow_transitions t
SET required_fields = ARRAY(SELECT DISTINCT unnest(COALESCE(t.required_fields, ARRAY[]::TEXT[]) || ARRAY['root_cause', 'resolution']))
FROM workflow_definitions d, workflow_states f, workflow_states s
WHERE d.workflow_id = t.workflow_id AND d.code = 'INCIDENT_FLOW'
  AND f.state_id = t.from_state_id AND f.code = 'IN_PROGRESS'
  AND s.state_id = t.to_state_id AND s.code IN ('WAITING_VERIFY', 'RESOLVED');
