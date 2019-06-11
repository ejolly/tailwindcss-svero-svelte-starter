// This file creates a svelte store for keeping track of the current URL location because svero doesn't expose it by default. It's used by the NavLink component in components/NavLink.svelte
import { writable } from "svelte/store";

export const currentRoute = writable(window.location.pathname);