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
    profilePic: '',
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
