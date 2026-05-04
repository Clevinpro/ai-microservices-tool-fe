export const queryKeys = {
  auth: {
    user: ['auth', 'user'],
  },
  documents: {
    all: ['documents'],
    one: (id: string) => ['documents', id],
  },
  chat: {
    history: (id: string) => ['chat', id],
  },
};
