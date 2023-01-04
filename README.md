# Chat
#### Video Demo:  https://youtu.be/CESxZXxwc24
#### Description: Real time chat
The project is a real time chat. Real time is achieved using websockets, which open a two-way connection between the client and the server. Message history is saved and you can create personal chat.

The flask is used as webframework. Websockets libraries: client-side - **SocketIO**, server-side - **flask_socketio**.
SocketIO is choosen because if a browser doesn't support websockets, the long-polling method is used.

By default, when a user opens a chat with someone, the last 20 messages are loaded. If the user has more than 20 new messages, then all new messages are loaded. If the user has scrolled all messages to top of the chat, the next 10 old messages are loaded. To achive this, the offset method is used.

## Files

### app.py
The module in which the server is configured and there are routes and events for the SocketIO. All database queries and db connection are in a separate module.

### db_commands.py
The module in which database queries are written to be used as functions. Putting everything in a separate module helps achive abstraction. If we need to change the database, we can create same module to replace the old one with the same functions names and the same behaviour. And doing that we don't need to modify the app.py.

### helpers.py
The module that contains convenient functions. Among them:
1. **login_required** to check if the user is logged in;
2. **get_id** to parse json for user id;
3. **get_chat** to get the correct room name for **flaks_socketio**;
4. **get_formated_datetime** to return datetime formatted in the desired format;
5. **leave_all_chat_rooms** to leave the chat rooms before entering in a new one.

### messenger.db
The sqlite3 database. Consist of 3 tables: users, chats, messages.

### apology.html
This html page is rendered if the server catches an error.

### chats.html
This html page contains everything related to the chat.

### find.html
This html page to find chat partners.

### index.html
This is the home page.

### layout.html
The site layout. Contains links to 3rd party libraries.

### login.html
The login page.

### register.html
The registration page.

### chat.js
All client-side logic in this file. This is where a 2-way connection is established. Only the SocketIO events are used to communicate with the server.

1. **join_chat** to load messages and set intersection observers. Two intersection observers are used:
    - **newMessageObserver** to check if a new message has been read. Fires the **new_message_count_updated** event to update the **new_message_count** for the chat.
    - **oldMessageObserver** to check if the first message in the chat has been read. Fires the **message_history_is_scrolled_to_the_top** event to load the next 10 previous messages.

2. **message_sent** to send a message to the chat partner.

3. **new_user_sent_message** to create a chat for the user if they are online on the chat page.

4. **message_received_from_current_chat** to display a message from the current chat.

5. **message_received_from_another_chat** to display that another chat partner has sent a new message and put it at the top of the chat list, if the user is on the chat page.

### style.css
The chat consist of two panels. One panel (**left panel**) to display the chat list, the other (**right panel**) to display chat partner information such as message history, message input and send button. Each panel has its own css file.

### leftPanel.css:
CSS for the left panel.

### rightPanel.css
CSS for the right panel.

### send_icon.png
The send message button image.

### query.sql
All queries that were used to create the database schema.