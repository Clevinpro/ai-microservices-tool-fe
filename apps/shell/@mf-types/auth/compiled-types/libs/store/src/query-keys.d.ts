export declare const queryKeys: {
  auth: {
    user: string[];
  };
  documents: {
    all: string[];
    one: (id: string) => string[];
  };
  chat: {
    history: (id: string) => string[];
  };
};
