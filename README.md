# Svelter starter

A starter (and explainer) for building single-page* Svelte web apps with [tailwindcss](https://tailwindcss.com/) for styling and [svero](https://github.com/kazzkiq/svero)** for client-side routing. Tried to make the UI look similar to the [Sapper template](https://github.com/sveltejs/sapper-template). Also added comments in most files to explain what's going on. 

**For proper routing during development without a backend or official routing system like [Sapper](https://sapper.svelte.dev/), the `--single` flag was added to the `sirv` commands in `scripts` section of the `package.json`. For deployment, it's a good idea to tell your static file hosting provider (e.g. [Netlify](https://www.netlify.com/docs/redirects/#rewrites-and-proxying)) to redirect all traffic to `/index.html` with a `200` response code so that the application doesn't produce a 404 when refreshed or when a specific URL is entered into the address bar.*  

***This isn't the only simple and lightweight client-side routing implementation for Svelte. [svelte-routing](https://github.com/EmilTholin/svelte-routing) is another popular option. However, for this starter it wasn't used because it's build and deploy process were a bit more complicated. Specifically, its `public` folder after Svelte compilation (`npm run build`) did not include an `index.html` and `bundle.js` but a single `App.js`. This requires some extra to configure with static-website deployment hosts like [Netlify](https://www.netlify.com). Also this required extra development dependencies such as a small [express](https://expressjs.com) server. For these reasons, [svero](https://github.com/kazzkiq/svero) was  the simpler/faster option.*

## Description  

The main layout of the app can be configured in `App.svelte`. New routes should be created as components in the `routes` folder and then added to both the `App.svelte` and `components/Nav.svelte` files if you want them to appear as navigation bar links. The `utils` folder just stores non-component files, in this case a single file that uses Svelte store to keep track of the current route because svero does not expose it natively. 

## Getting Started

```bash
git clone https://github.com/ejolly/tailwindcss-svero-svelte-starter
```

Then, install the dependencies:

```bash
npm install
```

Using Tailwindcss (https://tailwindcss.com/)  
Using svero (https://github.com/kazzkiq/svero)

## Building and Developing

### Build

```bash
npm run build
```

### Development

Development mode will:

-  build on file change
-  serve locally at <code>localhost:5000</code>
-  live reload

```bash
npm run dev
```

## Credits

Inspired by [sveltejs/template](https://github.com/sveltejs/template) and [tailwind-css-svelte-starter](https://github.com/marcograhl/tailwindcss-svelte-starter)
