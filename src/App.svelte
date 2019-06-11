<!-- This is the main app component that lays out the entire page. -->
<script>
  import { Router, Route } from 'svero';
  import Nav from './components/Nav.svelte';
  import About from './routes/About.svelte';
  import Home from './routes/Home.svelte';
</script>

<style lang="text/postcss">

</style>

<Nav />
<Router>
    <Route path="*" component="{Home}"/>
    <Route path="/about" component="{About}"/>
</Router>  
