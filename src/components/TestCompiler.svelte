<script>
  let checked = false;
</script>
<label for="switch-1" class="row">
  <div>Click me</div>
  <md-switch id="switch-1" selected={checked} onchange={(e) => checked = e.target.selected}></md-switch>
</label>
