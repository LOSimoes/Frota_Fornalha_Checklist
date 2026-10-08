const setupToken = new URLSearchParams(location.hash.slice(1)).get('configurar');
const password = document.getElementById('password');
const confirmPassword = document.getElementById('confirm');
const message = document.getElementById('message');
const submit = document.getElementById('submit');
if (setupToken) {
  history.replaceState(null, '', location.pathname);
  document.getElementById('title').textContent = 'Crie seu acesso';
  document.getElementById('help').textContent = 'Escolha uma senha com pelo menos 12 caracteres. Somente você usará este acesso.';
  document.getElementById('confirmGroup').hidden = false;
  password.autocomplete = 'new-password'; password.minLength = 12;
  confirmPassword.required = true;
  submit.textContent = 'Criar senha e entrar';
}
document.getElementById('login').addEventListener('submit', async event => {
  event.preventDefault(); message.textContent = '';
  if (setupToken && password.value !== confirmPassword.value) { message.textContent = 'As senhas precisam ser iguais.'; confirmPassword.focus(); return; }
  submit.disabled = true;
  try {
    const response = await fetch(setupToken ? '/api/setup' : '/api/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...(setupToken ? { 'X-Setup-Token': setupToken } : {}) }, body: JSON.stringify({ password: password.value })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message);
    password.value = ''; confirmPassword.value = ''; location.replace('/gestor');
  } catch (error) { message.textContent = error instanceof TypeError ? 'Sem conexão com o servidor. Tente novamente.' : error.message; }
  finally { submit.disabled = false; }
});
