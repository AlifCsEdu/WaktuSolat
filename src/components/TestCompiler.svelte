<script>
  import { Switch } from "$lib/components/ui";
  let checked = $state(false);
</script>
<label for="switch-1" class="row">
  <div>Click me</div>
  <Switch bind:checked />
</label>
