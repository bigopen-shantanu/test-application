import { useEffect, useRef, useState } from 'react';
import { WS_URL, fetchMessages, fetchUsers } from '../api.js';

export default function Chat({ user, token, onLogout }) {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [wsConnected, setWsConnected] = useState(false);

  const wsRef = useRef(null);
  const selectedUserRef = useRef(null);
  const messagesEndRef = useRef(null);

  selectedUserRef.current = selectedUser;

  async function loadUsers() {
    try {
      const data = await fetchUsers(token);
      setUsers(data.users);
    } catch (err) {
      console.error('Failed to load users:', err);
    }
  }

  useEffect(() => {
    loadUsers();
    const interval = setInterval(loadUsers, 10000);
    return () => clearInterval(interval);
  }, [token]);

  useEffect(() => {
    const ws = new WebSocket(`${WS_URL}?token=${encodeURIComponent(token)}`);
    wsRef.current = ws;

    ws.onopen = () => setWsConnected(true);
    ws.onclose = () => setWsConnected(false);

    ws.onmessage = (event) => {
      let data;
      try {
        data = JSON.parse(event.data);
      } catch {
        return;
      }

      if (data.type === 'presence') {
        setUsers((prev) =>
          prev.map((u) => (u.id === data.userId ? { ...u, online: data.online } : u))
        );
      } else if (data.type === 'message') {
        const msg = data.message;
        const activePeer = selectedUserRef.current;
        if (
          activePeer &&
          ((msg.senderId === user.id && msg.receiverId === activePeer.id) ||
            (msg.senderId === activePeer.id && msg.receiverId === user.id))
        ) {
          setMessages((prev) =>
            prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]
          );
        }
      }
    };

    return () => {
      ws.close();
    };
  }, [token, user.id]);

  useEffect(() => {
    if (!selectedUser) {
      setMessages([]);
      return;
    }

    fetchMessages(token, selectedUser.id)
      .then((data) => setMessages(data.messages))
      .catch((err) => console.error('Failed to load messages:', err));
  }, [token, selectedUser]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function handleSend(e) {
    e.preventDefault();
    const content = draft.trim();
    if (!content || !selectedUser || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return;
    }

    wsRef.current.send(
      JSON.stringify({
        type: 'message',
        receiverId: selectedUser.id,
        content,
      })
    );
    setDraft('');
  }

  return (
    <div className="chat-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div>
            <div className="current-user">{user.email}</div>
            <div className={`ws-status ${wsConnected ? 'online' : 'offline'}`}>
              {wsConnected ? 'Connected' : 'Disconnected'}
            </div>
          </div>
          <button type="button" className="logout-btn" onClick={onLogout}>
            Logout
          </button>
        </div>

        <div className="sidebar-section-header">
          <span>Users</span>
          <button type="button" className="refresh-btn" onClick={loadUsers} title="Refresh user list">
            ↻
          </button>
        </div>

        <ul className="user-list">
          {users.length === 0 ? (
            <li className="empty-users">No other users yet</li>
          ) : (
            users.map((u) => (
              <li key={u.id}>
                <button
                  type="button"
                  className={`user-item ${selectedUser?.id === u.id ? 'active' : ''}`}
                  onClick={() => setSelectedUser(u)}
                >
                  <span className={`status-dot ${u.online ? 'online' : 'offline'}`} />
                  <span className="user-email">{u.email}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      </aside>

      <main className="chat-main">
        {!selectedUser ? (
          <div className="empty-chat">Select a user from the list to start chatting.</div>
        ) : (
          <>
            <header className="chat-header">
              <span className={`status-dot ${selectedUser.online ? 'online' : 'offline'}`} />
              <span>{selectedUser.email}</span>
            </header>

            <div className="messages-list">
              {messages.map((msg) => {
                const mine = msg.senderId === user.id;
                return (
                  <div key={msg.id} className={`message-row ${mine ? 'mine' : 'theirs'}`}>
                    <div className="message-bubble">
                      <div className="message-text">{msg.content}</div>
                      <div className="message-time">
                        {new Date(msg.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <form className="message-form" onSubmit={handleSend}>
              <input
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={`Message ${selectedUser.email}...`}
                disabled={!wsConnected}
              />
              <button type="submit" disabled={!wsConnected || !draft.trim()}>
                Send
              </button>
            </form>
          </>
        )}
      </main>
    </div>
  );
}
