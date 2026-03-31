/**
 * In-memory data store.
 *
 * NOTE: This store is module-level, so it persists for the lifetime of the
 * Express server process.  On a restart the data resets.
 *
 * For production-grade persistence, replace the arrays / object below with
 * database reads/writes (e.g. PostgreSQL via Render's managed databases).
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
