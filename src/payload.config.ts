import { mongooseAdapter } from '@payloadcms/db-mongodb'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig, FileData, } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'
import { cloudStoragePlugin } from '@payloadcms/plugin-cloud-storage'
import { v2 as cloudinary } from 'cloudinary'

import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { Products } from './collections/Products'
import { Categories } from './collections/Categories'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

const cloudinaryAdapter = () => ({
  name: 'cloudinary-adapter',
  async handleUpload({
    file,
    collection,
    data,
  }: {
    file: FileData
    collection: string
    data: Record<string, unknown>
  }) {
    const filenameWithoutExt = file.filename.replace(/\.[^/.]+$/, '')

    const uploadResult = await new Promise<any>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          public_id: `media/${filenameWithoutExt}`,
          resource_type: 'image',
        },
        (error, result) => {
          if (error) {
            reject(error)
          } else {
            resolve(result)
          }
        }
      )

    const fileWithBuffer = file as FileData & { buffer: Buffer }

    if (!fileWithBuffer.buffer) {
      return reject(new Error('File buffer is missing'))
    }

    stream.end(fileWithBuffer.buffer)
  })

    return {
      ...data,
      url: (uploadResult as any).secure_url,
    }
  },

  async handleDelete({ filename }: { filename: string }) {
    const filenameWithoutExt = filename.replace(/\.[^/.]+$/, '')
    await cloudinary.uploader.destroy(`media/${filenameWithoutExt}`)
  },
})

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [Users, Media, Products, Categories],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: mongooseAdapter({
    url: process.env.DATABASE_URI || '',
  }),
  cors: ['http://localhost:5173'],
  sharp,
  plugins: [
    cloudStoragePlugin({
      collections: {
        [Media.slug]: {
          adapter: cloudinaryAdapter,
          disableLocalStorage: true,
          generateFileURL: ({ filename }: { filename: string | number  }) => {
            const name = filename.toString()
            const filenameWithoutExt = name.replace(/\.[^/.]+$/, '')
            return cloudinary.url(`media/${filenameWithoutExt}`, {
              secure: true,
              resource_type: 'image',
            })
          },
        },
      },
    }),
  ],
})