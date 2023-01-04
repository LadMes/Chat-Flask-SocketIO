from flask import Flask, redirect, render_template, request, session, jsonify
from flask_session import Session
from flask_cors import CORS
from werkzeug.security import check_password_hash, generate_password_hash
from flask_socketio import SocketIO, join_room

from helpers import *
from db_commands import *


app = Flask(__name__)

app.config["TEMPLATES_AUTO_RELOAD"] = True
app.config["SESSION_COOKIE_NAME"] = "cookie"
app.config["SESSION_PERMAMENT"] = False
app.config["SESSION_TYPE"] = "filesystem"
app.config['DEBUG'] = False
Session(app)
CORS(app)
socketio = SocketIO(app, async_handlers=True)


sids = {}


@app.after_request
def after_request(response):
    """Ensure responses aren't cached"""
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Expires"] = 0
    response.headers["Pragma"] = "no-cache"
    return response


@socketio.on("connect")
@login_required
def connection():

    sids[session["user_id"]] = request.sid


@app.route("/")
@login_required
def index():

    return render_template("index.html")


@app.route("/find", methods=["GET", "POST"])
@login_required
def find():

    if request.method == "POST":
        username = request.get_json()["username"]
        return jsonify(find_matching_users(username))

    return render_template("find.html")


@app.route("/add", methods=["POST"])
@login_required
def add():

    chat_partner_id = get_id(request.form.get("id"))
    if not is_user_exist(chat_partner_id):
        return render_template("apology.html", message="Something went wrong :(")

    if not is_chat_exist(session["user_id"], chat_partner_id):
        add_chat(session["user_id"], chat_partner_id, get_formated_datetime())

    return redirect("/chats")


@app.route("/chats")
@login_required
def chats():

    return render_template("chats.html", chats=get_chats())


@socketio.on("join_chat")
@login_required
def load_chat(chatData):
    # By default, 20 messages are loaded from db

    chat_partner_id = get_id(chatData["chat_partner_id"])
    if not is_chat_exist(session["user_id"], chat_partner_id):
        return render_template("apology.html", message="Something went wrong :(")

    leave_all_chat_rooms(sids)
    join_room(get_chat(session["user_id"], chat_partner_id))

    new_message_count = get_new_message_count(chat_partner_id)
    messages_to_load = new_message_count if new_message_count > 20 else 20
    offset = 0
    return get_messages(chat_partner_id, messages_to_load, offset), new_message_count


@socketio.on("message_history_is_scrolled_to_the_top")
@login_required
def load_next_chunk_of_messages(chatData):
    # Load only the next 10 messages

    chat_partner_id = get_id(chatData["chat_partner_id"])
    if not is_chat_exist(session["user_id"], chat_partner_id):
        return render_template("apology.html", message="Something went wrong :(")

    messages_to_load = 10
    offset = int(chatData["message_count"])
    return get_messages(chat_partner_id, messages_to_load, offset)


@socketio.on("message_sent")
@login_required
def send_message(messageData):

    chat_partner_id = get_id(messageData["chat_partner_id"])
    if not is_chat_exist(session["user_id"], chat_partner_id):
        return render_template("apology.html", message="Something went wrong :(")

    message = messageData["message"]
    timestamp = get_formated_datetime()
    primaryKey = add_message(chat_partner_id, message, timestamp)
    if primaryKey is None:
        return {"failure": "failure"}

    update_chats(chat_partner_id, timestamp)

    if chat_partner_id in sids:
        send_message_to_chat_partner(sids, chat_partner_id, message, timestamp)

    return {"timestamp": timestamp}


@socketio.on("new_message_count_updated")
@login_required
def set_new_message_count(chatData):

    chat_partner_id = get_id(chatData["chat_partner_id"])
    if not is_chat_exist(session["user_id"], chat_partner_id):
        return render_template("apology.html", message="Something went wrong :(")

    new_message_count = int(chatData["new_message_count"])
    update_new_message_count(new_message_count, chat_partner_id)


@app.route("/register", methods=["GET", "POST"])
def register():

    if request.method == "POST":
        username = request.form.get("username")
        password = request.form.get("password")
        confirmation = request.form.get("confirmation")

        if not username:
            return render_template("apology.html", message="Please provide a username")

        if not password or not confirmation:
            return render_template("apology.html", message="Please provide a password and password confirmation")

        if password != confirmation:
            return render_template("apology.html", message="Password and password confirmation must match!")

        user = get_username_by_username(username)
        if len(user) > 0:
            return render_template("apology.html", message="Please choose a different username")

        add_user(username, generate_password_hash(password))

        return redirect("/")

    return render_template("register.html")


@app.route("/login", methods=["GET", "POST"])
def login():
    session.clear()

    if request.method == "POST":
        username = request.form.get("username")
        password = request.form.get("password")

        if not username:
            return render_template("apology.html", message="must provide username")

        if not password:
            return render_template("apology.html", message="must provide password")

        user = get_user_by_username(username)
        if len(user) != 1 or not check_password_hash(user[0]["hash"], password):
            render_template("apology.html", message="invalid username and/or password")

        session["user_id"] = user[0]["id"]
        session["username"] = username

        return redirect("/")

    return render_template("login.html")


@app.route("/logout")
def logout():

    session.clear()

    return redirect("/login")


if __name__ == "__main__":

    socketio.run(app)