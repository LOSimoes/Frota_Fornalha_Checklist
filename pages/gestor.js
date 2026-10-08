document.getElementById('logout').addEventListener('click', async () => {
  try {
    const response = await fetch('/api/logout', { method: 'POST' });
    if (!response.ok) throw new Error();
    location.replace('/acesso');
  } catch { document.getElementById('message').textContent = 'Não foi possível sair. Verifique a conexão e tente novamente.'; }
});
window.addEventListener('pageshow', async () => {
  try { if (!(await fetch('/api/session')).ok) location.replace('/acesso'); }
  catch { location.replace('/acesso'); }
});
