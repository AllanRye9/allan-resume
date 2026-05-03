/**
 * In-memory data store.
 *
 * NOTE: This store is module-level, so it persists for the lifetime of a
 * serverless function instance.  On a cold start the data resets.
 *
 * For production-grade persistence, integrate Vercel KV:
 *   https://vercel.com/docs/storage/vercel-kv
 * and replace the arrays / object below with KV reads/writes.
 */

const store = {
  /** @type {Array<{id:string, ip:string, country:string, city:string, timestamp:number, page:string, referrer:string, userAgent:string, duration:number|null}>} */
  visits: [],

  /** Editable resume content (overrides the defaults baked into index.html). */
  content: {
    profilePic: 'https://avatars.githubusercontent.com/u/34004636?s=400&u=b058c22b6582fa1930dbb3dafb6975cd9262b3cc&v=4',
    name: '',
    title: '',
    tagline: '',
    email: '',
    phone: '',
    githubUrl: '',
    linkedinUrl: '',
    location: '',
    featuredVideo: '',
    heroImages: [],
    aboutText: '',
    skills: [],
    experience: [],
    projects: [],
    education: [],
  },
};

module.exports = store;
