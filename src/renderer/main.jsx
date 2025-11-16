document.getElementById('app').innerHTML = `
  <h1>ICSE Paper Builder</h1>
  <button id="ping">Ping</button>
  <div id="out"></div>
`;

document.getElementById('ping').onclick = () => {
  document.getElementById('out').textContent = window.api.ping();
};
