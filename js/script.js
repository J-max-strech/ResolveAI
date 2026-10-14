/* Demonstração local: substituir simulateAssistantQuery pela chamada REST quando houver API. */
const demoResponses = [
  {
    match: ['frequência', 'aprovação'],
    answer: 'Esta é uma resposta de demonstração fictícia. Na integração real, o ResolveAI consultará os documentos institucionais disponíveis e apresentará uma orientação acompanhada das referências correspondentes. Para uma decisão válida, consulte o regulamento oficial e a coordenação do seu curso.',
    sources: [{ name: 'Exemplo demonstrativo — Regulamento Acadêmico', section: 'Seção fictícia: frequência e avaliação', page: 'página ilustrativa' }]
  },
  {
    match: ['estágio'],
    answer: 'Esta resposta é apenas ilustrativa e não descreve as regras de estágio do IFTO. Na versão integrada, a consulta poderá localizar os documentos pertinentes, resumir os trechos relevantes e indicar onde conferi-los. Procure a coordenação responsável para obter orientação oficial.',
    sources: [{ name: 'Exemplo demonstrativo — Guia de Estágio', section: 'Seção fictícia: orientações gerais', page: 'página ilustrativa' }]
  },
  {
    match: ['aproveitamento', 'disciplinas'],
    answer: 'Demonstração fictícia: esta interface poderá ajudar a localizar informações sobre aproveitamento de estudos. Nenhum prazo, critério ou procedimento está sendo informado aqui. Consulte os documentos oficiais e a unidade acadêmica responsável.',
    sources: [{ name: 'Exemplo demonstrativo — Regulamento Acadêmico', section: 'Seção fictícia: aproveitamento de estudos', page: 'página ilustrativa' }]
  },
  {
    match: ['direitos', 'deveres'],
    answer: 'Demonstração fictícia: em uma consulta real, as orientações seriam fundamentadas nos documentos institucionais vigentes e acompanhadas por referências verificáveis. Esta resposta não apresenta nem interpreta regras do IFTO.',
    sources: [{ name: 'Exemplo demonstrativo — Manual do Estudante', section: 'Seção fictícia: direitos e deveres', page: 'página ilustrativa' }]
  }
];

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
  row.innerHTML = '<span class="processing-dots" aria-hidden="true"><i></i><i></i><i></i></span><span>Consultando os documentos institucionais...</span>';
  row.dataset.processing = '';
  messageList.append(row);
}

function makeAssistantMessage(result) {
  const article = document.createElement('article');
  article.className = 'message assistant-message';
  const label = document.createElement('div');
  label.className = 'assistant-label';
  label.textContent = 'ResolveAI · resposta simulada';
  const bubble = document.createElement('div');
  bubble.className = 'message-bubble';
  const answer = document.createElement('div');
  answer.className = 'answer-copy';
  answer.textContent = result.answer;
  const notice = document.createElement('p');
  notice.className = 'answer-disclaimer';
  notice.textContent = 'Conteúdo fictício para demonstração. Não é orientação oficial.';
  notice.style.cssText = 'font-size:10px;color:#8b7762;margin:12px 0 0;padding-top:9px;border-top:1px solid #edf0ed';
  bubble.append(answer, notice);
  const actions = document.createElement('div');
  actions.className = 'response-meta';
  const sourceButton = document.createElement('button');
  sourceButton.className = 'sources-toggle';
  sourceButton.type = 'button';
  sourceButton.textContent = '▤  Fontes de demonstração';
  sourceButton.setAttribute('aria-expanded', 'false');
  const sourcePanel = document.createElement('div');
  sourcePanel.className = 'sources-panel';
  sourcePanel.hidden = true;
  const sourceTitle = document.createElement('h3');
  sourceTitle.textContent = 'Referências fictícias';
  sourcePanel.append(sourceTitle);
  result.sources.forEach(source => {
    const item = document.createElement('div');
    item.className = 'source-item';
    const strong = document.createElement('strong');
    strong.textContent = source.name;
    const detail = document.createElement('span');
    detail.textContent = ` — ${source.section}, ${source.page}.`;
    item.append(strong, detail);
    sourcePanel.append(item);
  });
  sourceButton.addEventListener('click', () => {
    sourcePanel.hidden = !sourcePanel.hidden;
    sourceButton.setAttribute('aria-expanded', String(!sourcePanel.hidden));
    sourceButton.textContent = sourcePanel.hidden ? '▤  Fontes de demonstração' : '▤  Ocultar fontes';
  });
  const copyButton = document.createElement('button');
  copyButton.className = 'action-button';
  copyButton.type = 'button';
  copyButton.textContent = 'Copiar resposta';
  copyButton.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(result.answer);
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
  actions.append(sourceButton, copyButton, feedback);
  article.append(label, bubble, actions, sourcePanel);
  return article;
}

// Ponto único da simulação; substituir por fetch('/api/consultas', ...) na integração.
async function simulateAssistantQuery(question) {
  await new Promise(resolve => setTimeout(resolve, 950));
  const normalized = question.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const response = demoResponses.find(item => item.match.every(term => normalized.includes(term.normalize('NFD').replace(/[\u0300-\u036f]/g, ''))));
  if (response) return response;
  return {
    answer: 'A consulta real estará disponível após a integração com o sistema de IA. Esta demonstração não possui informação suficiente para responder com segurança. Consulte os canais oficiais do IFTO para obter uma orientação válida.',
    sources: [{ name: 'Nenhuma fonte consultada', section: 'Demonstração sem correspondência', page: 'não aplicável' }]
  };
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
    const result = await simulateAssistantQuery(text);
    if (requestId !== state.requestId) return;
    state.conversation.push({ role: 'assistant', content: result.answer });
    $('[data-processing]', messageList)?.remove();
    messageList.append(makeAssistantMessage(result));
  } catch {
    if (requestId !== state.requestId) return;
    $('[data-processing]', messageList)?.remove();
    const fallback = await simulateAssistantQuery('consulta sem correspondência');
    messageList.append(makeAssistantMessage(fallback));
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
