// Supabase has been removed. This shim prevents runtime errors while remaining
// imports are migrated to the PHP/MySQL API. Do not use in new code.
const noop = async () => {
  throw new Error("Supabase removed: use the PHP API instead.");
};

export const supabase = {
  from: () => ({
    select: noop,
    insert: noop,
    update: noop,
    delete: noop,
    eq: noop,
    in: noop,
    order: noop,
    maybeSingle: noop,
    single: noop,
    gte: noop,
    lt: noop,
    not: noop,
  }),
  storage: {
    from: () => ({
      upload: noop,
      remove: noop,
      download: noop,
      createSignedUrl: noop,
      getPublicUrl: () => ({ data: { publicUrl: "" } }),
    }),
  },
  functions: {
    invoke: noop,
  },
  auth: {
    signUp: noop,
    getSession: async () => ({ data: { session: null } }),
    admin: {
      deleteUser: noop,
    },
  },
  channel: () => ({
    on: () => ({ subscribe: () => ({}) }),
    subscribe: () => ({}),
  }),
  removeChannel: () => {},
};
