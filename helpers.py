import datetime
from flask import redirect, session
from functools import wraps
from flask_socketio import leave_room, rooms


def login_required(f):

    @wraps(f)
    def decorated_function(*args, **kwargs):
        if session.get("user_id") is None:
            return redirect("/login")
        return f(*args, **kwargs)
    return decorated_function


def get_id(id):

    if not id:
        return -1

    id = int(id) if id.isdigit() else -1
    if id < 0:
        return id

    return id


def get_chat(user_id, chat_partner_id):

    return str(chat_partner_id) + str(user_id) if user_id > chat_partner_id else str(user_id) + str(chat_partner_id)


def get_formated_datetime():

    return datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def leave_all_chat_rooms(sids):

    if len(rooms(sids[session["user_id"]])) > 1:
        for room in rooms(sids[session["user_id"]]):
            if room != sids[session["user_id"]]:
                leave_room(room)