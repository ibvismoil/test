import { CollectionConfig } from "payload";

export const Model: CollectionConfig = {
  slug: 'carmodel',
  admin: {
    useAsTitle: 'name',
  },
  access: {
    create: ({ req }) => req.user?.role === 'admin',
    update: ({ req }) => req.user?.role === 'admin',
    delete: ({ req }) => req.user?.role === 'admin',
    read: () => true,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
  ],
}
