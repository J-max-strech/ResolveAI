const demoDocuments = [
  { name: 'Exemplo demonstrativo — Regulamento Acadêmico', category: 'Acadêmico', updated: 'Exemplo de data: 12/03/2025', status: 'Vigente' },
  { name: 'Exemplo demonstrativo — Guia de Estágio', category: 'Estágio', updated: 'Exemplo de data: 04/02/2025', status: 'Vigente' },
  { name: 'Exemplo demonstrativo — Manual do Estudante', category: 'Institucional', updated: 'Exemplo de data: 18/11/2024', status: 'Em revisão' },
  { name: 'Exemplo demonstrativo — Política de Assistência Estudantil', category: 'Assistência estudantil', updated: 'Exemplo de data: 21/08/2024', status: 'Vigente' },
  { name: 'Exemplo demonstrativo — Normas de Atividades Complementares', category: 'Acadêmico', updated: 'Exemplo de data: 10/06/2024', status: 'Em revisão' }
];

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const state = { conversation: [], busy: false, toastTimer: null, requestId: 0 };
const messageInput = $('[data-message-input]');
const sendButton = $('[data-send]');
const messageList = $('[data-message-list]');
const conversationScroll = $('[data-conversation-scroll]');
const welcome = $('[data-welcome]');

function showToast(message) {
  const toast = $('[data-toast]');
  toast.textContent = message;
  toast.classList.add('is-visible');
  clearTimeout(state.toastTimer);
  state.toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 2300);
}

function switchView(name) {
  $$('[data-page]').forEach(page => { page.hidden = page.dataset.page !== name; });
  $$('[data-view]').forEach(button => button.classList.toggle('is-current', button.dataset.view === name));
  const labels = { chat: 'Conversar', documents: 'Documentos institucionais', about: 'Sobre o ResolveAI' };
  $('[data-section-title]').textContent = labels[name] || labels.chat;
  closeSidebar();
}

function openSidebar() {
  $('#sidebar').classList.add('is-open');
  $('[data-scrim]').hidden = false;
  $('[data-close-sidebar]').focus();
}
function closeSidebar() {
  $('#sidebar').classList.remove('is-open');
  $('[data-scrim]').hidden = true;
}

function resizeInput() {
  messageInput.style.height = 'auto';
  messageInput.style.height = `${Math.min(messageInput.scrollHeight, 150)}px`;
  sendButton.disabled = !messageInput.value.trim() || state.busy;
}

function scrollToLatest() {
  requestAnimationFrame(() => { conversationScroll.scrollTop = conversationScroll.scrollHeight; });
}

function appendUserMessage(text) {
  const wrapper = document.createElement('article');
  wrapper.className = 'message user-message';
  wrapper.setAttribute('aria-label', 'Sua pergunta');
  const bubble = document.createElement('div');
  bubble.className = 'message-bubble';
  bubble.textContent = text;
  wrapper.append(bubble);
  messageList.append(wrapper);
}

function appendProcessing() {
  const row = document.createElement('div');
  row.className = 'processing';
  row.setAttribute('role', 'status');
  row.innerHTML = '<span class="processing-dots" aria-hidden="true"><i></i><i></i><i></i></span><span>Enviando pergunta ao servidor...</span>';
  row.dataset.processing = '';
  messageList.append(row);
}

function makeAssistantMessage(answerText, isError = false) {
  const article = document.createElement('article');
  article.className = 'message assistant-message';
  const label = document.createElement('div');
  label.className = 'assistant-label';
  label.textContent = isError ? 'ResolveAI · erro de comunicação' : 'ResolveAI · resposta do servidor';
  const bubble = document.createElement('div');
  bubble.className = 'message-bubble';
  const answer = document.createElement('div');
  answer.className = 'answer-copy';
  answer.textContent = answerText;
  bubble.append(answer);
  if (!isError) {
    const notice = document.createElement('p');
    notice.className = 'answer-disclaimer';
    notice.textContent = 'Resposta do protótipo. Ainda não há consulta a regulamentos institucionais.';
    notice.style.cssText = 'font-size:10px;color:#8b7762;margin:12px 0 0;padding-top:9px;border-top:1px solid #edf0ed';
    bubble.append(notice);
  }
  const actions = document.createElement('div');
  actions.className = 'response-meta';
  const copyButton = document.createElement('button');
  copyButton.className = 'action-button';
  copyButton.type = 'button';
  copyButton.textContent = 'Copiar resposta';
  copyButton.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(answerText);
      copyButton.textContent = 'Copiado!';
      showToast('Resposta copiada');
      setTimeout(() => { copyButton.textContent = 'Copiar resposta'; }, 1800);
    } catch {
      showToast('Não foi possível copiar. Selecione o texto para copiar.');
    }
  });
  const feedback = document.createElement('div');
  feedback.className = 'feedback-group';
  feedback.setAttribute('aria-label', 'Avalie esta resposta');
  [['Útil', 'positive'], ['Não útil', 'negative']].forEach(([title, type]) => {
    const button = document.createElement('button');
    button.className = `feedback-button ${type}`;
    button.type = 'button';
    button.textContent = title;
    button.setAttribute('aria-pressed', 'false');
    button.addEventListener('click', () => {
      const willSelect = button.getAttribute('aria-pressed') !== 'true';
      $$('.feedback-button', feedback).forEach(other => other.setAttribute('aria-pressed', 'false'));
      button.setAttribute('aria-pressed', String(willSelect));
      showToast(willSelect ? 'Obrigado pelo feedback' : 'Avaliação removida');
    });
    feedback.append(button);
  });
  actions.append(copyButton, feedback);
  article.append(label, bubble, actions);
  return article;
}

async function submitQuestion(question) {
  const text = question.trim();
  if (!text || state.busy) return;
  state.busy = true;
  const requestId = ++state.requestId;
  state.conversation.push({ role: 'user', content: text });
  welcome.hidden = true;
  appendUserMessage(text);
  messageInput.value = '';
  resizeInput();
  appendProcessing();
  scrollToLatest();
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'text/plain' },
      body: JSON.stringify({ pergunta: text })
    });
    const responseText = await response.text();
    if (!response.ok) {
      throw new Error(responseText || `O servidor respondeu com erro (${response.status}).`);
    }
    if (requestId !== state.requestId) return;
    state.conversation.push({ role: 'assistant', content: responseText });
    $('[data-processing]', messageList)?.remove();
    messageList.append(makeAssistantMessage(responseText));
  } catch (error) {
    if (requestId !== state.requestId) return;
    $('[data-processing]', messageList)?.remove();
    const errorMessage = error instanceof TypeError
      ? 'Não foi possível conectar à API. Verifique se o servidor ResolveAI está em execução e tente novamente.'
      : `Não foi possível obter uma resposta: ${error.message}`;
    messageList.append(makeAssistantMessage(errorMessage, true));
  } finally {
    state.busy = false;
    resizeInput();
    scrollToLatest();
    messageInput.focus();
  }
}

function newConversation() {
  state.requestId += 1;
  state.conversation = [];
  state.busy = false;
  messageList.replaceChildren();
  welcome.hidden = false;
  messageInput.value = '';
  resizeInput();
  switchView('chat');
  messageInput.focus();
}

function renderDocuments() {
  const query = $('[data-doc-search]').value.trim().toLocaleLowerCase('pt-BR');
  const category = $('[data-doc-filter]').value;
  const matches = demoDocuments.filter(doc => doc.name.toLocaleLowerCase('pt-BR').includes(query) && (category === 'all' || doc.category === category));
  const list = $('[data-document-list]');
  list.replaceChildren();
  matches.forEach(doc => {
    const card = document.createElement('article');
    card.className = 'document-card';
    const icon = document.createElement('span');
    icon.className = 'document-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = '▤';
    const info = document.createElement('div');
    info.className = 'document-info';
    const title = document.createElement('h2');
    title.textContent = doc.name;
    const meta = document.createElement('div');
    meta.className = 'document-meta';
    const categoryTag = document.createElement('span');
    categoryTag.className = 'category-tag';
    categoryTag.textContent = doc.category;
    const updated = document.createElement('span');
    updated.textContent = doc.updated;
    const status = document.createElement('span');
    status.className = `document-status${doc.status === 'Em revisão' ? ' review' : ''}`;
    status.textContent = doc.status;
    meta.append(categoryTag, updated, status);
    info.append(title, meta);
    const button = document.createElement('button');
    button.className = 'document-button';
    button.type = 'button';
    button.textContent = 'Visualizar documento';
    button.setAttribute('aria-label', `Visualizar ${doc.name}`);
    button.addEventListener('click', () => showToast('Documento fictício: visualização disponível na integração futura.'));
    card.append(icon, info, button);
    list.append(card);
  });
  $('[data-doc-empty]').hidden = matches.length > 0;
}

$('[data-composer]').addEventListener('submit', event => {
  event.preventDefault();
  submitQuestion(messageInput.value);
});
messageInput.addEventListener('input', resizeInput);
messageInput.addEventListener('keydown', event => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    submitQuestion(messageInput.value);
  }
});
$$('[data-prompt]').forEach(button => button.addEventListener('click', () => {
  const prompt = button.dataset.prompt;
  if (button.closest('.recent-section')) {
    switchView('chat');
    messageInput.value = prompt;
    resizeInput();
    messageInput.focus();
  } else {
    submitQuestion(prompt);
  }
}));
$$('[data-view]').forEach(button => button.addEventListener('click', () => switchView(button.dataset.view)));
$$('[data-new-chat]').forEach(button => button.addEventListener('click', newConversation));
$('[data-open-sidebar]').addEventListener('click', openSidebar);
$('[data-close-sidebar]').addEventListener('click', closeSidebar);
$('[data-scrim]').addEventListener('click', closeSidebar);
document.addEventListener('keydown', event => { if (event.key === 'Escape') closeSidebar(); });
$('[data-doc-search]').addEventListener('input', renderDocuments);
$('[data-doc-filter]').addEventListener('change', renderDocuments);
renderDocuments();
resizeInput();
