import { MetadataRoute } from 'next'
 
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/candidate/', '/api/'],
    },
    sitemap: 'https://recruitaitech.in/sitemap.xml',
  }
}
