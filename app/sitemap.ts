import { MetadataRoute } from 'next'
 
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://recruitaitech.in'
  
  const subdomains = ['apply', 'admin', 'candidate', 'interview']
  const items: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    }
  ]

  subdomains.forEach(sub => {
    items.push({
      url: `https://${sub}.recruitaitech.in`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: sub === 'apply' ? 0.9 : 0.7,
    })
  })

  // Basic pages
  const pages = ['features', 'privacy-policy', 'terms-and-conditions']
  pages.forEach(p => {
    items.push({
      url: `${baseUrl}/${p}`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    })
  })

  return items
}
