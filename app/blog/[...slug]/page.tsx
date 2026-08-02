import { redirect, notFound } from 'next/navigation'
import { allBlogs } from 'contentlayer/generated'

export const generateStaticParams = async () => {
  return allBlogs.map((p) => ({ slug: p.slug.split('/').map((name) => decodeURI(name)) }))
}

export default async function Page({ params }: { params: { slug: string[] } }) {
  const slug = params.slug.join('/')
  const post = allBlogs.find((p) => p.slug === slug)
  if (!post) {
    notFound()
  }
  redirect(`/${slug}`)
}
