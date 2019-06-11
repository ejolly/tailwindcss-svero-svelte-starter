<!-- This is the Navigation bar component. It's fixed at the top of the screen with an empty div with padding and margins below it to act as a spacer. It's build from a seris of NavLink components-->
<script>
import NavLink from './NavLink.svelte';
</script>

<style type="text/postcss"> 
</style>



<nav class="fixed flex flex-row bg-white border-red-100 border-b-2 text-lg font-light w-full">
    <NavLink href="/">home</NavLink>
    <NavLink href="/about">about</NavLink>
</nav>
<div class="pb-8 mb-8">
</div>