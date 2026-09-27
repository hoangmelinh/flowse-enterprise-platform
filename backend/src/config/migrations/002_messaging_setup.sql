CREATE TABLE IF NOT EXISTS conversations (
    conversation_id   SERIAL       PRIMARY KEY,
    workspace_id      INT          NOT NULL REFERENCES workspaces(workspace_id) ON DELETE CASCADE,
    type              VARCHAR(20)  NOT NULL DEFAULT 'DIRECT'
                                   CHECK (type IN ('DIRECT','CHANNEL','SPACE')),
    name              VARCHAR(100),
    space_id          INT          REFERENCES spaces(space_id) ON DELETE CASCADE,
    created_by        INT          REFERENCES users(user_id) ON DELETE SET NULL,
    created_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS conversation_members (
    conversation_id   INT NOT NULL REFERENCES conversations(conversation_id) ON DELETE CASCADE,
    user_id           INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    joined_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (conversation_id, user_id)
);

CREATE TABLE IF NOT EXISTS messages (
    message_id        SERIAL      PRIMARY KEY,
    conversation_id   INT         NOT NULL REFERENCES conversations(conversation_id) ON DELETE CASCADE,
    sender_id         INT         NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    content           TEXT        NOT NULL DEFAULT '',
    file_url          TEXT,
    file_name         TEXT,
    file_type         VARCHAR(100),
    created_at        TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE messages ADD COLUMN IF NOT EXISTS file_url TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS file_name TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS file_type VARCHAR(100);
ALTER TABLE messages ALTER COLUMN content SET DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conv_members_user ON conversation_members(user_id);
