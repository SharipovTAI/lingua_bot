// Пример для фронтендера. Токен хранится в памяти, а не в репозитории.
export function createApiClient(baseUrl = 'http://127.0.0.1:8000/api/v1') {
  let token = '';
  async function request(path, method = 'GET', data) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Token ${token}`;
    const response = await fetch(`${baseUrl}${path}`, {
      method, headers,
      ...(data === undefined ? {} : { body: JSON.stringify(data) }),
    });
    const body = response.status === 204 ? null : await response.json();
    if (!response.ok) {
      const error = new Error(`HTTP ${response.status}`);
      error.status = response.status;
      error.details = body;
      throw error;
    }
    return body;
  }
  return {
    register: (email, password) => request('/auth/register/', 'POST', { email, password }),
    async login(email, password) {
      const result = await request('/auth/login/', 'POST', { email, password });
      token = result.token;
      return result.user;
    },
    async logout() {
      await request('/auth/logout/', 'POST');
      token = '';
    },
    profile: () => request('/profile/'),
    updateProfile: (data) => request('/profile/', 'PATCH', data),
    scenarios: () => request('/scenarios/'),
    conversations: () => request('/conversations/'),
    createConversation: (scenarioId) => request('/conversations/', 'POST', { scenario_id: scenarioId }),
    history: (conversationId) => request(`/conversations/${conversationId}/messages/`),
    send: (conversationId, content) => request(`/conversations/${conversationId}/messages/`, 'POST', { content }),
  };
}

// const api = createApiClient();
// await api.register(email, password);
// const user = await api.login(email, password);
// await api.updateProfile({ level: 'A2', goal: 'Travel' });
// const scenarios = await api.scenarios();
// const chat = await api.createConversation(scenarios[0].id);
// await api.send(chat.id, 'Hello!');
// const messages = await api.history(chat.id);
