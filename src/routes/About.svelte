<!-- This is the about page which displays the Button component -->
<script>
    import Button from "../components/Button.svelte";
    export let router = {};
  </script>
  
  <style>
  </style>
  
  <div class="relative mx-32 px-32 py-4">
          <h1 class="text-xl md:text-3xl text-justify text-gray-900">
              About this site
          </h1>
          <p class='text-justify py-6'>This is the 'about' page. There's not much here. Why don't you click the button?</p>

          <div class="flex justify-center py-8">
              <Button />
          </div>
  </div>
  
  