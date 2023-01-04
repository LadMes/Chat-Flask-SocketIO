from cs50 import SQL
from flask import session
from flask_socketio import emit, rooms
from helpers import *


db = SQL("sqlite:///messenger.db")


def find_matching_users(username):

    return db.execute("SELECT id, username FROM users WHERE username LIKE ? COLLATE NOCASE", username + "%")


def is_user_exist(chat_partner_id):

    user_id = db.execute("SELECT id FROM users WHERE id = ?", chat_partner_id)
    if len(user_id) == 0:
        return False

    return True


def is_chat_exist(user_id, chat_partner_id):

    chat = db.execute("SELECT chat_partner_id FROM chats WHERE user_id = ? AND chat_partner_id = ?", user_id, chat_partner_id)
    if len(chat) == 0:
        return False

    return True


def add_chat(first_user, second_user, timestamp, new_message_count=0):

    return db.execute("INSERT INTO chats VALUES(?, ?, ?, ?)", first_user, second_user, timestamp, new_message_count)


def get_chats():

    return db.execute(
        "SELECT id, username, new_message_count FROM users JOIN chats ON id = chat_partner_id WHERE user_id = ? ORDER BY last_message_date DESC", session["user_id"])


def get_new_message_count(chat_partner_id):

    return db.execute("SELECT new_message_count FROM chats WHERE user_id = ? AND chat_partner_id = ?",
                      session["user_id"], chat_partner_id)[0]["new_message_count"]


def get_messages(chat_partner_id, messages_to_load, offset=0):

    return db.execute("SELECT * FROM messages WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?) ORDER BY timestamp DESC LIMIT ? OFFSET ?",
                      session["user_id"], chat_partner_id, chat_partner_id, session["user_id"], messages_to_load, offset)


def add_message(chat_partner_id, message, timestamp):

    return db.execute("INSERT INTO messages VALUES(?, ?, ?, ?)", session["user_id"], chat_partner_id, message, timestamp)


def update_chats(chat_partner_id, timestamp):

    db.execute("UPDATE chats SET last_message_date = ? WHERE (user_id = ? AND chat_partner_id = ?) OR (user_id = ? AND chat_partner_id = ?)",
               timestamp, chat_partner_id, session["user_id"], session["user_id"], chat_partner_id)

    if chat_partner_id != session["user_id"]:
        db.execute("UPDATE chats SET new_message_count = new_message_count + 1 WHERE user_id = ? AND chat_partner_id = ?",
                   chat_partner_id, session["user_id"])


def send_message_to_chat_partner(sids, chat_partner_id, message, timestamp):

    chat = get_chat(session["user_id"], chat_partner_id)
    if not is_chat_exist(chat_partner_id, session["user_id"]):
        if chat_partner_id != session["user_id"]:
            add_chat(chat_partner_id, session["user_id"], timestamp, 1)
            emit("new_user_sent_message", {"username": session["username"],
                                           "id": session["user_id"]}, to=sids[chat_partner_id], include_self=False)
        else:
            add_chat(chat_partner_id, session["user_id"], timestamp)

    elif chat in rooms(sids[chat_partner_id]):
        emit("message_received_from_current_chat", {"message": message, "timestamp": timestamp}, room=chat, include_self=False)

    else:
        emit("message_received_from_another_chat", {
             "chatPartnerId": session["user_id"]}, to=sids[chat_partner_id], include_self=False)


def update_new_message_count(new_message_count, chat_partner_id):

    return db.execute("UPDATE chats SET new_message_count = ? WHERE user_id = ? AND chat_partner_id = ?",
                      new_message_count, session["user_id"], chat_partner_id)


def get_username_by_username(username):

    return db.execute("SELECT username FROM users WHERE username = ?", username)


def add_user(username, password_hash):

    return db.execute("INSERT INTO users (username, hash) VALUES(?, ?)", username, password_hash)


def get_user_by_username(username):

    return db.execute("SELECT * FROM users WHERE username = ?", username)