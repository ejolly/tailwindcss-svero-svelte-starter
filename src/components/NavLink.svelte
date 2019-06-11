<!-- This is the Navigation Link component that get created and placed within Nav.svelte. It keeps track of the current route via Svelte store and adds a red underline if the corresponding route is active. Using multiple such components makes it easier to create several different nav bar links that behave identically.-->
<script>
import { currentRoute } from "../utils/stores.js";
import { Link } from "svero";
export let href;
function updateRoute(event) {
    currentRoute.set(href);
}
</script>

<style type="text/postcss">
    .active {
        @apply border-red-600 border-b-2 pb-4;
    }
</style>

<span class="px-1 py-1 m-2">
    <Link href="{href}">
        <span on:click={updateRoute} class="{$currentRoute === href ? 'active' : 'pb-4' }">
            <slot></slot>
        </span>
    </Link>
</span>