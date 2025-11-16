import { useState } from 'react';

function App() {
  const [message, setMessage] = useState('');

  const handlePing = () => {
    const reply = window.api.ping();
    setMessage(reply);
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1>ICSE Paper Builder</h1>
      <button onClick={handlePing}>Ping</button>
      <p>{message}</p>
    </div>
  );
}

export default App;
