<script lang="ts">
  import { onMount, onDestroy } from "svelte";

  let connected = false;
  let messages = [];
  let newMessage = "";
  let username = "";
  let roomId = "default";
  let participants = 0;
  let ws;

  onMount(() => {
    // Check URL for room ID
    const params = new URLSearchParams(window.location.search);
    if (params.get("room")) {
      roomId = params.get("room");
    }

    connectWebSocket();
  });

  onDestroy(() => {
    if (ws) ws.close();
  });

  function connectWebSocket() {
    ws = new WebSocket(
      `wss://color-namer-worker.tmhinkle.workers.dev?roomId=${roomId}`
    );

    ws.onopen = () => {
      connected = true;
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log("Received:", data);

      if (data.type === "system") {
        if (data.message.includes("participants")) {
          participants = parseInt(data.message.match(/\d+/)[0]) || 0;
        }
        addMessage("System", data.message);
      } else if (data.type === "chat") {
        addMessage(data.sender, data.message);
      }
    };

    ws.onclose = () => {
      connected = false;
      addMessage("System", "Disconnected from server");
      setTimeout(connectWebSocket, 3000);
    };

    ws.onerror = (error) => {
      addMessage("System", "WebSocket error occurred");
      console.error("WebSocket error:", error);
    };
  }

  function addMessage(sender, text) {
    // Avoid duplicate messages by checking if this text is already in the last 5 messages
    const isDuplicate = messages
      .slice(-5)
      .some((m) => m.sender === sender && m.text === text);

    if (!isDuplicate) {
      messages = [...messages, { sender, text, time: new Date() }];
    }
  }

  function sendMessage() {
    if (
      !ws ||
      ws.readyState !== WebSocket.OPEN ||
      !newMessage.trim() ||
      !username.trim()
    )
      return;

    ws.send(
      JSON.stringify({
        type: "chat",
        message: newMessage,
        sender: username,
      })
    );

    newMessage = "";
  }
</script>

<div class="chat-container">
  <div class="chat-header">
    <h2>Simple WebSocket Chat</h2>
    <div class="room-info">
      <span>Room: {roomId}</span>
      <button
        on:click={() => {
          const newRoom = window.prompt("Enter room ID", roomId);
          if (newRoom) {
            const url = new URL(window.location.href);
            url.searchParams.set("room", newRoom);
            window.location.href = url.toString();
          }
        }}>Change Room</button
      >
    </div>
  </div>

  {#if !username}
    <div class="username-form">
      <input
        type="text"
        placeholder="Enter your username"
        bind:value={username}
        on:keydown={(e) => e.key === "Enter" && username}
      />
      <button disabled={!username.trim()}>Join Chat</button>
    </div>
  {:else}
    <div class="chat-messages">
      {#each messages as message}
        <div class="message" class:system={message.sender === "System"}>
          <span class="time">{message.time.toLocaleTimeString()}</span>
          <span class="sender">{message.sender}:</span>
          <span class="text">{message.text}</span>
        </div>
      {/each}
    </div>

    <div class="chat-input">
      <input
        type="text"
        placeholder="Type a message..."
        bind:value={newMessage}
        on:keydown={(e) => e.key === "Enter" && sendMessage()}
      />
      <button on:click={sendMessage} disabled={!newMessage.trim()}>Send</button>
    </div>
  {/if}
</div>

<style>
  .chat-container {
    width: 100%;
    max-width: 800px;
    margin: 0 auto;
    padding: 1rem;
    background: #f5f5f5;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .chat-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid #ddd;
  }

  .username-form {
    display: flex;
    margin-bottom: 1rem;
  }

  .chat-messages {
    height: 400px;
    overflow-y: auto;
    margin-bottom: 1rem;
    padding: 1rem;
    background: white;
    border-radius: 4px;
  }

  .message {
    margin-bottom: 0.5rem;
    padding: 0.5rem;
    border-radius: 4px;
    background: #e5f7ff;
  }

  .message.system {
    background: #f0f0f0;
    font-style: italic;
  }

  .time {
    font-size: 0.8rem;
    color: #666;
    margin-right: 0.5rem;
  }

  .sender {
    font-weight: bold;
    margin-right: 0.5rem;
  }

  .chat-input {
    display: flex;
  }

  input {
    flex: 1;
    padding: 0.5rem;
    font-size: 1rem;
    border: 1px solid #ccc;
    border-radius: 4px;
    margin-right: 0.5rem;
  }

  button {
    padding: 0.5rem 1rem;
    background: #4caf50;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }

  button:disabled {
    background: #cccccc;
  }
</style>
