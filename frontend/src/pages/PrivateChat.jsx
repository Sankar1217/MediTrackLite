import React, { useEffect, useRef, useState } from 'react';
import SockJS from 'sockjs-client';
import { over } from 'stompjs';

// Set your backend WebSocket endpoint
const SOCKET_URL =
  window.location.hostname === 'localhost'
    ? 'http://localhost:8080/chat'
    : 'http://localhost:8080/chat';

/**
 * @param {string} username - The logged-in user's username (should match backend Principal name)
 * @param {string} peer - The username of the doctor/patient you want to chat with
 */
const PrivateChat = ({ username, peer }) => {
  const [stompClient, setStompClient] = useState(null);
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
  const sock = new SockJS(SOCKET_URL);
  const client = over(sock);
  let subscription = null;

  client.connect({}, () => {
    setConnected(true);
    subscription = client.subscribe('/user/queue/messages', (msg) => {
      if (msg.body) {
        const incoming = JSON.parse(msg.body);

        setMessages((prev) => {
          // Prevent duplicate if same message already added
          const isDuplicate = prev.some(
            (m) =>
              m.sender === incoming.sender &&
              m.receiver === incoming.receiver &&
              m.content === incoming.content &&
              m.timestamp === incoming.timestamp
          );
          return isDuplicate ? prev : [...prev, incoming];
        });
        //setMessages((prev) => [...prev, JSON.parse(msg.body)]);
      }
    });
  });

  setStompClient(client);
  return () => {
    if (subscription) subscription.unsubscribe();
    if (client && client.connected) client.disconnect();
  };
}, [username]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = (e) => {
    e.preventDefault();
    if (input.trim() === '' || !stompClient || !connected) return;
    const chatMessage = {
      sender: username,
      receiver: peer,
      content: input,
      timestamp: new Date().toLocaleString(),
    };
    stompClient.send('/app/private-message', {}, JSON.stringify(chatMessage));
    setMessages((prev) => [...prev, chatMessage]); // Show sent message instantly
    setInput('');
  };
  const getDisplayName = (email) => {
  const username = email.split('@')[0];
    return `Mr. ${username.charAt(0).toUpperCase() + username.slice(1).toLowerCase()}`;

  };
  return (
    <div
      style={{
        maxWidth: 400,
        margin: '40px auto',
        background: '#fff',
        borderRadius: 10,
        boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
        padding: 0,
        display: 'flex',
        flexDirection: 'column',
        height: 500,
      }}
    >
      <div
        style={{
          background: '#1976d2',
          color: '#fff',
          padding: '16px 20px',
          borderTopLeftRadius: 10,
          borderTopRightRadius: 10,
          fontWeight: 600,
          fontSize: 18,
          letterSpacing: 1,
        }}
      > 
      
        Chat with {getDisplayName(peer)}
        <span
          style={{
            float: 'right',
            fontSize: 12,
            color: connected ? '#b2ff59' : '#ffcdd2',
            fontWeight: 400,
          }}
        >
          {connected ? '● Online' : '● Offline'}
        </span>
      </div>
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: 16,
          background: '#f7fafd',
        }}
      >
        {messages.length === 0 ? (
          <div style={{ color: '#888', textAlign: 'center', marginTop: 40 }}>
            No messages yet.
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div
              key={idx}
              style={{
                marginBottom: 14,
                display: 'flex',
                flexDirection: 'column',
                alignItems: msg.sender === username ? 'flex-end' : 'flex-start',
              }}
            >
              <div
                style={{
                  background: msg.sender === username ? '#1976d2' : '#e3f2fd',
                  color: msg.sender === username ? '#fff' : '#1976d2',
                  padding: '8px 14px',
                  borderRadius: 16,
                  maxWidth: '80%',
                  wordBreak: 'break-word',
                  fontSize: 15,
                }}
              >
                {/* <span style={{ fontWeight: 500 }}>{msg.sender.split("")}</span> */}
                <span style={{ marginLeft: 8, fontWeight: 400 }}>{msg.content}</span>
              </div>
              <span style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
                {msg.timestamp}
              </span>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      <form
        onSubmit={sendMessage}
        style={{
          display: 'flex',
          borderTop: '1px solid #eee',
          padding: 12,
          background: '#fafafa',
        }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            padding: 10,
            borderRadius: 6,
            fontSize: 15,
            background: '#f5f5f5',
          }}
          disabled={!connected}
        />
        <button
          type="submit"
          style={{
            background: '#1976d2',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            padding: '0 18px',
            marginLeft: 8,
            fontWeight: 500,
            fontSize: 15,
            cursor: connected ? 'pointer' : 'not-allowed',
            opacity: connected ? 1 : 0.6,
          }}
          disabled={!connected}
        >
          Send
        </button>
      </form>
    </div>
  );
};

export default PrivateChat;