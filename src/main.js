// Load tailwind and setup the App
import './main.pcss';
import App from './App.svelte';

const app = new App({
    target: document.body
});

export default app;