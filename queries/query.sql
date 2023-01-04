CREATE TABLE users (
  	id INTEGER PRIMARY KEY,
  	username TEXT NOT NULL COLLATE NOCASE,
  	hash TEXT NOT NULL,
    UNIQUE(username)
);

CREATE TABLE chats (
	user_id INTEGER NOT NULL,
  	chat_partner_id INTEGER NOT NULL,
	last_message_date NUMERIC NOT NULL,
	new_message_count INTEGER NOT NULL DEFAULT 0,
  	FOREIGN KEY(user_id) REFERENCES users(id),
  	FOREIGN KEY(chat_partner_id) REFERENCES users(id),
  	UNIQUE(user_id, chat_partner_id)
);

CREATE TABLE messages (
  	sender_id INTEGER NOT NULL,
	receiver_id INTEGER NOT NULL,
  	message TEXT NOT NULL,
  	timestamp NUMERIC NOT NULL,
  	FOREIGN KEY(sender_id) REFERENCES users(id),
  	FOREIGN KEY(receiver_id) REFERENCES users(id)
);