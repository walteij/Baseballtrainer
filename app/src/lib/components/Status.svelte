<script lang="ts">
  import { AlertTriangle, Inbox } from 'lucide-svelte';
  export let state: 'loading' | 'error' | 'empty';
  export let message = '';
  export let retry: () => void = () => location.reload();
</script>
{#if state === 'loading'}
  <div class="card loading" aria-busy="true" aria-label="Gegevens worden geladen"><div class="placeholder"></div><div class="placeholder short"></div><div class="placeholder"></div></div>
{:else if state === 'error'}
  <aside class="alert error" role="alert"><AlertTriangle size={22}/><div><strong>Gegevens laden mislukt</strong><p>{message || 'Probeer het opnieuw.'}</p><button class="btn secondary" onclick={retry}>Opnieuw proberen</button></div></aside>
{:else}
  <section class="card empty"><Inbox size={64}/><h2>Nog geen gegevens</h2><p>{message || 'Er zijn nog geen gegevens voor dit team.'}</p><a class="btn primary" href="/instellingen">Bekijk instellingen</a></section>
{/if}
