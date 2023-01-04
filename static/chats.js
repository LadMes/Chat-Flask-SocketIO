const myMessage = "my-message";
const chatPartnerMessage = "chat-partner-message";

const socket = io();

let oldMessageObserver;
let newMessageObserver;

let btns = document.querySelectorAll(".chat > button");
btns.forEach(btn => {
    btn.addEventListener("click", loadChat);
});

function loadChat() {
    let currentChatPartnerId = this.parentNode.querySelector("input").value;
    refreshLeftPanel(currentChatPartnerId);
    refreshRightPanel(currentChatPartnerId);
    socket.emit("join_chat", { chat_partner_id: currentChatPartnerId }, (messages, newMessageCount) => {
        let messageHistory = document.querySelector("#message-history");
        processMessagesFromServer(messageHistory, messages, currentChatPartnerId);
        setNewMessageObserver(messageHistory, newMessageCount);
        setOldMessageObserver(messageHistory);
        if (newMessageCount > 0) {
            separateNewMessagesFromOld(messageHistory, newMessageCount);
        } else {
            placeScrollToTheBottom(messageHistory);
        }
    });
};

function refreshLeftPanel(currentChatPartnerId) {
    changePreviousActiveChatToInactive(currentChatPartnerId);
    setActiveChat(selectChatByChatPartnerId(currentChatPartnerId));
};

function changePreviousActiveChatToInactive(currentChatPartnerId) {
    let previousActiveChat = document.querySelector(".chat-active");
    let previouschatPartnerId = previousActiveChat != null ? previousActiveChat.querySelector("input").value : -1;
    if (previouschatPartnerId != -1 && previouschatPartnerId != currentChatPartnerId) {
        previousActiveChat.classList.remove("chat-active");
        previousActiveChat.querySelector("button").addEventListener("click", loadChat);
    }
};

function setActiveChat(currentChat) {
    currentChat.querySelector("button").removeEventListener("click", loadChat);
    currentChat.classList.add("chat-active");
};

function selectChatByChatPartnerId(chatPartnerId) {
    return document.querySelector(`.chats input[value="${chatPartnerId}"]`).parentNode;
};

function refreshRightPanel(currentChatPartnerId) {
    let rightPanel = document.querySelector("#right-panel");
    deleteChatPartnerRelatedInformation(rightPanel);
    createChatPartnerRelatedInformation(rightPanel, currentChatPartnerId);
};

function deleteChatPartnerRelatedInformation(rightPanel) {
    if (rightPanel.childElementCount > 1) {
        rightPanel.removeChild(rightPanel.querySelector("#message-history"));
        rightPanel.removeChild(rightPanel.querySelector("#right-panel-bottom"));
    }
};

function createChatPartnerRelatedInformation(rightPanel, currentChatPartnerId) {
    addNameToRightPanelTop(rightPanel, currentChatPartnerId);
    addRightPanelElements(rightPanel);
};

function addNameToRightPanelTop(rightPanel, currentChatPartnerId) {
    let name = selectChatByChatPartnerId(currentChatPartnerId).querySelector("button").textContent;
    let rightPanelTop = rightPanel.firstElementChild;
    rightPanelTop.textContent = name;
};

function addRightPanelElements(rightPanel) {
    rightPanel.append(createMessageHistory());
    rightPanel.append(createRightPanelBottom());
}

function createMessageHistory() {
    let messageHistory = document.createElement("div");
    messageHistory.id = "message-history";
    return messageHistory;
};

function createRightPanelBottom() {
    let rightPanelBottom = document.createElement("div");
    rightPanelBottom.id = "right-panel-bottom";
    rightPanelBottom.append(createMessageInput());
    rightPanelBottom.append(createSendButton());
    return rightPanelBottom;
};

function createMessageInput() {
    let textarea = document.createElement("textarea");
    textarea.id = "message";
    return textarea;
};

function createSendButton() {
    let button = document.createElement("button");
    button.id = "btn-send-message";
    let img = document.createElement("img");
    img.src = "static/send_icon.png";
    button.append(img);
    button.addEventListener("click", sendMessage);
    return button;
};

function sendMessage() {
    let messageInput = document.querySelector("#message");
    let chatPartnerId = getCurrentChatPartnerId();
    let messageHistory = document.querySelector("#message-history");
    socket.emit("message_sent", { message: messageInput.value, chat_partner_id: chatPartnerId }, res => {
        if ("failure" in res) {
            this.insertAdjacentHTML("afterend", '<span class="text-danger">Something went wrong :(</span>');
        } else {
            displayNewMessage(messageHistory, myMessage, { message: messageInput.value, timestamp: res["timestamp"] });
            messageInput.value = "";
            placeScrollToTheBottom(messageHistory);
            moveChatUp(selectChatByChatPartnerId(chatPartnerId));
        }
    });
};

function getCurrentChatPartnerId() {
    activeChat = document.querySelector(".chat-active > input");
    if (activeChat) {
        return activeChat.value;
    }

    return -1;
};

function displayNewMessage(messageHistory, sender, messageData) {
    let divWithMessage = createMessageBox(sender, messageData);
    messageHistory.append(divWithMessage);
};

function createMessageBox(sender, messageData) {
    let messageBox = document.createElement("div");
    messageBox.className = sender;
    messageBox.append(createMessageContent(messageData["message"]));
    messageBox.append(createMessageDate(messageData["timestamp"]));
    return messageBox;
};

function createMessageContent(message) {
    let messageContent = document.createElement("div");
    messageContent.textContent = message;
    return messageContent;
};

function createMessageDate(timestamp) {
    let date = document.createElement("div");
    date.className = "message-date";
    let localTime = new Date(formatDatetimeFromServer(timestamp));
    date.textContent = changeRepresentationOfDatetime(localTime);
    return date;
};

function formatDatetimeFromServer(timestamp) {
    let date = timestamp.slice(0, timestamp.indexOf(" "));
    let datetimeSeparator = "T";
    let time = timestamp.slice(timestamp.indexOf(":") - 2);
    let timeEnding = ".000Z";
    return date + datetimeSeparator + time + timeEnding;
};

function changeRepresentationOfDatetime(datetime) {
    let options = {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
    };
    return datetime.toLocaleString("en-US", options);
};

function placeScrollToTheBottom(element) {
    element.scrollTop = element.scrollHeight;
};

function moveChatUp(chat) {
    let chats = document.querySelector(".chats");
    chats.removeChild(chat);
    chats.prepend(chat);
};

function processMessagesFromServer(messageHistory, messages, currentChatPartnerId) {
    messages.forEach(messageData => {
        let sender = messageData["sender_id"] == currentChatPartnerId ? chatPartnerMessage : myMessage;
        let message = createMessageBox(sender, messageData);
        messageHistory.prepend(message);
    });
};

function separateNewMessagesFromOld(messageHistory, newMessageCount) {
    let separator = createNewMessageSeparator();
    let oldMessageCount = messageHistory.children.length - newMessageCount;
    messageHistory.insertBefore(separator, selectNthChild(messageHistory, oldMessageCount));
    messageHistory.scrollTop = selectNthChild(messageHistory, 0).offsetHeight * oldMessageCount;
};

function createNewMessageSeparator() {
    let separator = document.createElement("span");
    separator.className = "new-message-separator";
    separator.textContent = "New Messages";
    return separator;
};

function selectNthChild(element, nthChild) {
    return element.children[nthChild];
};

function setNewMessageObserver(messageHistory, newMessageCount) {
    newMessageObserver = createIntersectionObserver(messageHistory, updateMessageCount);
    if (newMessageCount > 0) {
        setTargetsForNewMessages(newMessageCount);
    }
};

function createIntersectionObserver(root, callback) {
    let options = {
        root: root,
        rootMargin: "0px",
        threshold: 0.75
    }

    return new IntersectionObserver(callback, options);
};

function updateMessageCount(entries) {
    let chatPartnerId = getCurrentChatPartnerId();
    let currentNewMessageCount = getNewMessageCount(chatPartnerId);
    let readNewMessages = countReadNewMessages(entries);
    let updatedNewMessageCount = currentNewMessageCount - readNewMessages;
    refreshNewMessageCount(chatPartnerId, updatedNewMessageCount);
    socket.emit("new_message_count_updated", { chat_partner_id: chatPartnerId, new_message_count: updatedNewMessageCount });
};

function getNewMessageCount(chatPartnerId) {
    return parseInt(getNewMessageCountElement(chatPartnerId).textContent);
};

function getNewMessageCountElement(chatPartnerId) {
    return selectChatByChatPartnerId(chatPartnerId).querySelector("span");
};

function countReadNewMessages(entries) {
    let readNewMessages = 0;
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            readNewMessages++;
            newMessageObserver.unobserve(entry.target);
        }
    });
    return readNewMessages;
};

function refreshNewMessageCount(chatPartnerId, updatedNewMessageCount) {
    if (updatedNewMessageCount == 0) {
        hideNewMessageCounter(selectChatByChatPartnerId(chatPartnerId));
        setTimeout(removeNewMessageSeparator, 2000);
    } else {
        getNewMessageCountElement(chatPartnerId).textContent = updatedNewMessageCount;
    }
};

function hideNewMessageCounter(chat) {
    let counter = chat.querySelector("span");
    counter.textContent = 0;
    counter.className = "dot-none";
};

function removeNewMessageSeparator() {
    let messageHistory = document.querySelector("#message-history");
    let newMessageSeparator = messageHistory.querySelector(".new-message-separator");
    messageHistory.removeChild(newMessageSeparator);
};

function setTargetsForNewMessages(newMessageCount) {
    let root = newMessageObserver.root;
    let newMessageLine = root.querySelector(".new-message-separator");
    let start = root.childElementCount - newMessageCount;
    for (let i = start; i < root.childElementCount; i++) {
        newMessageObserver.observe(root.children.item(i));
    }
};

function setOldMessageObserver(messageHistory) {
    if (messageHistory.childElementCount >= 20) {
        oldMessageObserver = createIntersectionObserver(messageHistory, loadNextOldMessages);
        oldMessageObserver.observe(messageHistory.firstElementChild);
    }
};

function loadNextOldMessages(entries) {
    entries.forEach(entry => {
        let messageHistory = entry.target.parentNode;
        if (entry.isIntersecting) {
            let chatPartnerId = getCurrentChatPartnerId();
            socket.emit("message_history_is_scrolled_to_the_top", {
                chat_partner_id: chatPartnerId,
                message_count: getCurrentChatMessageCount(messageHistory)
            }, messages => {
                if (messages.length != 0) {
                    let previousHeight = messageHistory.scrollHeight;
                    processMessagesFromServer(messageHistory, messages, chatPartnerId);
                    placeScrollToPreviousPosition(messageHistory, previousHeight);
                    reassignOldMessageObserver(messageHistory, entry);
                }
            });
        }
    });
};

function getCurrentChatMessageCount(messageHistory) {
    let newMessageLine = messageHistory.querySelector(".new-message-separator");
    return newMessageLine != null ? messageHistory.childElementCount - 1 : messageHistory.childElementCount;
};

function placeScrollToPreviousPosition(messageHistory, previousHeight) {
    messageHistory.scrollTop = messageHistory.scrollHeight - previousHeight;
};

function reassignOldMessageObserver(messageHistory, previousElement) {
    oldMessageObserver.unobserve(previousElement.target);
    oldMessageObserver.observe(messageHistory.firstElementChild);
};

socket.on("new_user_sent_message", userInfo => {
    let chats = document.querySelector(".chats");
    let chat = createChat(userInfo["username"], userInfo["id"]);
    incrementNewMessageCounter(chat);
    chats.prepend(chat);
});

function createChat(chatUsername, chatPartnerId) {
    let chat = document.createElement("div");
    chat.className = "chat";
    chat.append(createHiddenChatPartnerIdInput(chatPartnerId));
    chat.append(createChatButton(chatUsername));
    chat.append(createHiddenMessageCounter());
    return chat;
};

function createHiddenChatPartnerIdInput(chatPartnerId) {
    let input = document.createElement("input");
    input.setAttribute("hidden", "");
    input.setAttribute("name", "chat_partner_id");
    input.setAttribute("value", chatPartnerId);
    return input;
};

function createChatButton(chatUsername) {
    let button = document.createElement("button");
    button.textContent = chatUsername;
    button.addEventListener("click", loadChat);
    return button;
};

function createHiddenMessageCounter() {
    let messageCounter = document.createElement("span");
    messageCounter.className = "dot-none";
    messageCounter.textContent = 0;
    return messageCounter;
};

function incrementNewMessageCounter(chat) {
    let messageCounter = chat.querySelector("span");
    if (messageCounter.className === "dot-none") {
        messageCounter.className = "dot";
    }
    messageCounter.textContent = parseInt(messageCounter.textContent) + 1;
};

socket.on("message_received_from_current_chat", messageData => {
    let messageHistory = document.querySelector("#message-history");
    if (messageHistory.querySelector(".new-message-separator") == null) {
        messageHistory.append(createNewMessageSeparator());
    }
    displayNewMessage(messageHistory, chatPartnerMessage, messageData);

    let chatPartnerId = getCurrentChatPartnerId();
    incrementNewMessageCounter(selectChatByChatPartnerId(chatPartnerId));
    newMessageObserver.observe(messageHistory.lastElementChild);
});

socket.on("message_received_from_another_chat", res => {
    let chat = selectChatByChatPartnerId(res["chatPartnerId"]);
    incrementNewMessageCounter(chat);
    moveChatUp(chat);
});