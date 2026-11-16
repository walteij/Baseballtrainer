<script lang="ts">
  import { onMount } from 'svelte';
  import { api } from '$lib/api';
  import type { AgeGroup, CurriculumGoal, CurriculumSkill } from '$lib/api/types';
  import voorstel from '../../../../data/nl/curriculum-voorstel.json';

  let age: AgeGroup = 'U12';
  let version = 0;
  let goals: CurriculumGoal[] = [];
  let skills: CurriculumSkill[] = [];
  let busy = false;
  let loaded = false;
  let notice = '';
  async function load() {
    busy = true; loaded = false; notice = '';
    try {
      const current = await api.getCurriculum(age);
      version = current?.version ?? 0;
      goals = current?.goals ?? [];
      skills = current?.skills ?? [];
      loaded = true;
    } catch (error) { notice = error instanceof Error ? error.message : 'Leerlijn laden mislukt.'; }
    finally { busy = false; }
  }
  async function save() {
    busy = true; notice = '';
    try {
      const saved = await api.saveCurriculum(age, { expectedVersion: version, goals, skills });
      version = saved.version; goals = saved.goals; skills = saved.skills;
      notice = `Versie ${version} vastgesteld. Bestaande seizoensdoelen blijven ongewijzigd.`;
    } catch (error) { notice = error instanceof Error ? error.message : 'Vaststellen mislukt.'; }
    finally { busy = false; }
  }
  function addSkill() { skills = [...skills, { id: '', name: '', description: '', level: 1, progression: '' }]; }
  function addGoal() { goals = [...goals, { text: '', skill_ids: [] }]; }
  function loadProposal() {
    const groep = voorstel.leeftijdsgroepen.find(item => item.age_group_id === age);
    if (!groep) { notice = 'Er is geen clubvoorstel voor deze leeftijdscategorie.'; return; }
    skills = groep.skills.map(skill => ({ ...skill }));
    goals = groep.goals.map(goal => ({ text: goal.text, skill_ids: [...goal.skill_ids] }));
    notice = 'Clubvoorstel geladen als concept; er is nog niets opgeslagen. Controleer de inhoud en kies "Stel leerlijn vast".';
  }
  onMount(() => { void load(); });
</script>

<section class="card">
  <h2>Clubdoelen en vaardighedenleerlijn</h2>
  <p>Stel per leeftijdscategorie clubdoelen en vaardigheden vast. Gebruik voor vaardigheids-ID's de tags uit de oefencatalogus; gelijke ID's verbinden leeftijdscategorieën. Elke wijziging maakt een nieuwe versie. <strong>Laad clubvoorstel</strong> vult de editor met het clubvoorstel voor de gekozen categorie; er wordt pas iets opgeslagen bij <strong>Stel leerlijn vast</strong>.</p>
  <label>Leeftijdscategorie<select bind:value={age} disabled={busy} onchange={load}>{#each ['Beeball', 'U12', 'U15', 'U21', 'Senioren'] as category}<option value={category}>{category}</option>{/each}</select></label>
  {#if busy}<p>Bezig...</p>{/if}
  {#if loaded}
    <p>{version ? `Huidige versie ${version}` : 'Nog geen leerlijn vastgesteld.'}</p>
    <button class="btn secondary" disabled={busy} onclick={loadProposal}>Laad clubvoorstel</button>
    <h3>Vaardigheden</h3>
    {#each skills as skill, i}
      <div class="form-grid">
        <label>Vaardigheids-ID<input bind:value={skill.id} disabled={busy} placeholder="bijv. throwing" /></label>
        <label>Naam<input bind:value={skill.name} disabled={busy} /></label>
        <label>Omschrijving<input bind:value={skill.description} disabled={busy} /></label>
        <label>Niveau (1–10)<input type="number" min="1" max="10" bind:value={skill.level} disabled={busy} /></label>
        <label>Doel voor deze leeftijd<input bind:value={skill.progression} disabled={busy} /></label>
        <button class="btn secondary" disabled={busy} onclick={() => skills = skills.filter((_, index) => index !== i)}>Verwijder vaardigheid</button>
      </div>
    {/each}
    <button class="btn secondary" disabled={busy} onclick={addSkill}>Vaardigheid toevoegen</button>
    <h3>Leeftijdsdoelen</h3>
    {#each goals as goal, i}
      <div class="form-grid">
        <label>Doel<input bind:value={goal.text} disabled={busy} /></label>
        <label>Vaardigheids-ID's (komma-gescheiden)<input value={goal.skill_ids.join(', ')} disabled={busy} onchange={(event) => goal.skill_ids = event.currentTarget.value.split(',').map(s => s.trim()).filter(Boolean)} /></label>
        <button class="btn secondary" disabled={busy} onclick={() => goals = goals.filter((_, index) => index !== i)}>Verwijder doel</button>
      </div>
    {/each}
    <div class="action-bar"><button class="btn secondary" disabled={busy} onclick={addGoal}>Doel toevoegen</button><button class="btn primary" disabled={busy || !goals.length || !skills.length} onclick={save}>Stel leerlijn vast</button></div>
  {:else if !busy}<button class="btn secondary" onclick={load}>Opnieuw laden</button>{/if}
  {#if notice}<p role="status">{notice}</p>{/if}
</section>
