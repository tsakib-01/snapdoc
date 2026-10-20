import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/'],
    },
    sitemap: 'https://jpgeasy.com/sitemap.xml',
    host: 'https://jpgeasy.com',
  };
}
