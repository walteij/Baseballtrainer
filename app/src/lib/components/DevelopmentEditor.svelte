<script lang="ts">
  import { onMount } from 'svelte';
  import { DevelopmentModelSchema } from '../../../../shared/schemas/development.js';
  import { api } from '$lib/api';
  import type { DevelopmentModel } from '$lib/api/types';

  let version = 0;
  let model: DevelopmentModel | null = null;
  let busy = false;
  let loaded = false;
  let advanced = false;
  let json = '';
  let notice = '';
  let ageFilter = '';
  $: ageGroups = model ? [...model.ageGroups].sort((a, b) => a.sortOrder - b.sortOrder || a.minAge - b.minAge) : [];
  $: visibleAges = ageGroups.filter(age => !ageFilter || age.id === ageFilter);
  $: skillGoals = visibleAges.flatMap(age => (model?.skillGoals ?? [])
    .filter(goal => goal.ageGroupId === age.id).map(goal => ({ goal, age })));
  $: clubGoals = visibleAges.flatMap(age => (model?.clubGoals ?? [])
    .filter(goal => goal.ageGroupId === age.id).map(goal => ({ goal, age })));

  async function load() {
    busy = true; notice = '';
    try {
      const current = await api.getDevelopment();
      version = current?.version ?? 0;
      model = current?.model ?? null;
      ageFilter = '';
      advanced = false;
      loaded = true;
    } catch (error) {
      notice = error instanceof Error ? error.message : 'Leerlijn laden mislukt.';
    } finally { busy = false; }
  }
  function parseJson(text: string): DevelopmentModel {
    const value: unknown = JSON.parse(text);
    const parsed = DevelopmentModelSchema.safeParse(value);
    if (!parsed.success) {
      throw new Error(parsed.error.issues.slice(0, 5).map(issue => `${issue.path.join('.')}: ${issue.message}`).join('; '));
    }
    return parsed.data;
  }
  async function importFile(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    try {
      if (model && !window.confirm('De huidige bewerking wordt vervangen. De bestaande opgeslagen versie blijft behouden. Doorgaan?')) return;
      model = parseJson(await file.text());
      ageFilter = '';
      advanced = false;
      notice = 'Bestand geladen als concept. Er is nog niets opgeslagen.';
    } catch (error) {
      notice = `Bestand niet geladen: ${error instanceof Error ? error.message : 'onbekende fout'}`;
    } finally { input.value = ''; }
  }
  function toggleAdvanced() {
    if (!advanced && model) json = JSON.stringify(model, null, 2);
    if (advanced) {
      try { model = parseJson(json); ageFilter = ''; }
      catch (error) {
        notice = `JSON niet toegepast: ${error instanceof Error ? error.message : 'ongeldig bestand'}`;
        return;
      }
    }
    advanced = !advanced;
    notice = '';
  }
  async function save() {
    busy = true; notice = '';
    try {
      const candidate = advanced ? parseJson(json) : DevelopmentModelSchema.parse(model);
      const saved = await api.saveDevelopment(version, candidate);
      version = saved.version;
      model = saved.model;
      if (advanced) json = JSON.stringify(saved.model, null, 2);
      notice = `Leerlijn opgeslagen als versie ${version}. Statussen zijn niet automatisch gewijzigd.`;
    } catch (error) { notice = error instanceof Error ? error.message : 'Opslaan mislukt.'; }
    finally { busy = false; }
  }
  onMount(() => { void load(); });
</script>

<section class="card">
  <h2>Ontwikkelleerlijn voor de club</h2>
  <p>Beheer de aangeleverde leeftijdsbanden, vaardigheden en doelen. Concepten zijn nog geen vastgestelde sportnormen. Deze leerlijn stuurt oefeningen nog niet automatisch aan.</p>
  {#if busy}<p>Bezig...</p>{/if}
  {#if loaded}
    <p>{version ? `Opgeslagen versie ${version}` : 'Nog geen ontwikkelleerlijn opgeslagen.'}</p>
    <label>JSON-bestand laden <input type="file" accept=".json,application/json" disabled={busy} onchange={importFile} /></label>
    {#if model}
      <div class="action-bar">
        <button class="btn secondary" disabled={busy} onclick={toggleAdvanced}>{advanced ? 'Pas JSON toe en toon formulier' : 'Bewerk volledig model als JSON'}</button>
        <button class="btn primary" disabled={busy} onclick={save}>Bewaar nieuwe versie</button>
      </div>
      {#if advanced}
        <p>Hier zijn ook leeftijdsbanden, vaardigheden, beoordelingscriteria en koppelingen volledig aanpasbaar. Wijzigingen gelden pas na opslaan.</p>
        <label>Volledige ontwikkelleerlijn <textarea rows="24" bind:value={json} disabled={busy}></textarea></label>
      {:else}
        <label>Filter op leeftijdsband<select bind:value={ageFilter} disabled={busy}>
          <option value="">Alle leeftijdsbanden</option>
          {#each ageGroups as age (age.id)}<option value={age.id}>{age.name}</option>{/each}
        </select></label>
        <h3>Vaardigheidsdoelen</h3>
        {#each skillGoals as { goal, age } (goal.id)}
          <details>
            <summary>{age.name} · {goal.name.nl} · {goal.status}</summary>
            <div class="form-grid">
              <label>Naam<input bind:value={goal.name.nl} disabled={busy} /></label>
              <label>Omschrijving<textarea bind:value={goal.description.nl} disabled={busy}></textarea></label>
              <label>Status<select bind:value={goal.status} disabled={busy}><option value="draft">Concept</option><option value="approved">Goedgekeurd</option><option value="archived">Gearchiveerd</option></select></label>
              <label>TC-notitie<textarea bind:value={goal.tcNotes} disabled={busy}></textarea></label>
            </div>
            <h4>Beheerscriteria</h4>
            {#each goal.masteryCriteria as criterion (criterion.id)}
              <label>Criterium<textarea bind:value={criterion.description.nl} disabled={busy}></textarea></label>
            {/each}
          </details>
        {/each}
        {#if !skillGoals.length}<p>Geen vaardigheidsdoelen voor deze leeftijdsband.</p>{/if}
        <h3>Clubdoelen</h3>
        {#each clubGoals as { goal, age } (goal.id)}
          <details>
            <summary>{age.name} · {goal.name.nl} · {goal.status}</summary>
            <div class="form-grid">
              <label>Naam<input bind:value={goal.name.nl} disabled={busy} /></label>
              <label>Omschrijving<textarea bind:value={goal.description.nl} disabled={busy}></textarea></label>
              <label>Status<select bind:value={goal.status} disabled={busy}><option value="draft">Concept</option><option value="approved">Goedgekeurd</option><option value="archived">Gearchiveerd</option></select></label>
              <label>Prioriteit<input type="number" min="1" max="5" bind:value={goal.priority} disabled={busy} /></label>
              <label>TC-notitie<textarea bind:value={goal.tcNotes} disabled={busy}></textarea></label>
            </div>
          </details>
        {/each}
        {#if !clubGoals.length}<p>Geen clubdoelen voor deze leeftijdsband.</p>{/if}
      {/if}
    {/if}
  {:else if !busy}<button class="btn secondary" onclick={load}>Opnieuw laden</button>{/if}
  {#if notice}<p role="status">{notice}</p>{/if}
</section>
